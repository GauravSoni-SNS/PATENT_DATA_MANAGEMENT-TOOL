import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma';
import { evaluateMatterNotifications } from './notificationService';
import { dispatchNotification } from './dispatchService';
import { AlertScheduleId } from './alertSchedule';
import { NotificationStatus } from '@prisma/client';

/**
 * Runs each firm's deadline scan on its own schedule.
 *
 * The team's failure mode is a hearing date passing unnoticed, so the scan
 * cannot depend on somebody remembering to press a button. Settings live in the
 * database rather than in environment variables, so the schedule can be changed
 * from the app without a redeploy.
 */

const tasks = new Map<string, ScheduledTask>();

export interface ScanSummary {
  firmId: string;
  generated: number;
  delivered: number;
  alreadyAlerted: number;
  ranAt: string;
}

/** Creates the row on first use so a firm always has a schedule. */
export async function getAlertSettings(firmId: string) {
  const existing = await prisma.alertSetting.findUnique({ where: { firmId } });
  if (existing) return existing;
  return prisma.alertSetting.create({ data: { firmId } });
}

/**
 * Generates and delivers alerts for one firm.
 *
 * Shared by the cron job and the manual "run now" button so both behave
 * identically, including de-duplication.
 */
export async function runScanForFirm(firmId: string): Promise<ScanSummary> {
  const settings = await getAlertSettings(firmId);

  const matters = await prisma.matter.findMany({
    where: { firmId, deletedAt: null, status: 'ACTIVE' },
    include: {
      createdBy: true,
      leadAttorney: true,
      deadlines: true,
    },
  });

  let generated = 0;
  let delivered = 0;
  let alreadyAlerted = 0;

  for (const matter of matters) {
    const alerts = evaluateMatterNotifications(matter, {
      schedule: settings.schedule as AlertScheduleId,
      leadDays: settings.leadDays,
    });
    for (const alert of alerts) {
      const duplicate = await prisma.notification.findFirst({
        where: {
          firmId,
          deadlineId: alert.deadlineId,
          tier: alert.tier,
          daysRemaining: alert.daysRemaining,
        },
      });
      if (duplicate) {
        alreadyAlerted += 1;
        continue;
      }

      const record = await prisma.notification.create({
        data: {
          firmId,
          matterId: matter.id,
          deadlineId: alert.deadlineId,
          tier: alert.tier,
          tierLabel: alert.tierLabel,
          subject: alert.subject,
          bodyHtml: alert.bodyHtml,
          recipients: alert.recipients as object,
          daysRemaining: alert.daysRemaining,
          isEmergency: alert.isEmergency,
          status: 'PENDING' as NotificationStatus,
        },
      });
      generated += 1;

      const outcome = await dispatchNotification({
        notificationId: record.id,
        subject: alert.subject,
        bodyHtml: alert.bodyHtml,
        targets: alert.recipients.map((r) => ({
          name: r.name,
          role: r.role,
          // A channel switched off in settings is not attempted at all.
          email: settings.emailEnabled ? r.email : null,
          phone: settings.whatsappEnabled ? r.phone : null,
        })),
      });
      if (outcome.status === 'DELIVERED' || outcome.status === 'SENT') delivered += 1;
    }
  }

  await prisma.alertSetting.update({ where: { firmId }, data: { lastRunAt: new Date() } });

  return { firmId, generated, delivered, alreadyAlerted, ranAt: new Date().toISOString() };
}

function cronExpression(hour: number, minute: number): string {
  return `${minute} ${hour} * * *`;
}

/** Applies one firm's schedule, replacing any job already running for it. */
export async function scheduleFirm(firmId: string): Promise<void> {
  const settings = await getAlertSettings(firmId);

  const existing = tasks.get(firmId);
  if (existing) {
    existing.stop();
    tasks.delete(firmId);
  }

  if (!settings.enabled) {
    console.log(`[alerts] scanning disabled for firm ${firmId}`);
    return;
  }

  const expression = cronExpression(settings.runAtHour, settings.runAtMinute);
  if (!cron.validate(expression)) {
    console.error(`[alerts] invalid schedule for firm ${firmId}: ${expression}`);
    return;
  }

  const task = cron.schedule(
    expression,
    () => {
      runScanForFirm(firmId)
        .then((s) => console.log(`[alerts] firm ${firmId}: ${s.generated} raised, ${s.delivered} delivered`))
        .catch((e) => console.error(`[alerts] scan failed for firm ${firmId}:`, e));
    },
    { timezone: settings.timezone }
  );

  tasks.set(firmId, task);
  console.log(
    `[alerts] firm ${firmId} scanning at ${String(settings.runAtHour).padStart(2, '0')}:${String(settings.runAtMinute).padStart(2, '0')} ${settings.timezone} (${settings.schedule})`
  );
}

/** Schedules every firm at boot. */
export async function startAlertScheduler(): Promise<void> {
  const firms = await prisma.firm.findMany({ select: { id: true } });
  for (const firm of firms) await scheduleFirm(firm.id);
}

export function stopAlertScheduler(): void {
  for (const task of tasks.values()) task.stop();
  tasks.clear();
}

export function scheduleDescription(settings: { runAtHour: number; runAtMinute: number; timezone: string; enabled: boolean }) {
  if (!settings.enabled) return 'Automatic scanning is off';
  const time = `${String(settings.runAtHour).padStart(2, '0')}:${String(settings.runAtMinute).padStart(2, '0')}`;
  return `Runs daily at ${time} ${settings.timezone}`;
}

export type { AlertScheduleId };
