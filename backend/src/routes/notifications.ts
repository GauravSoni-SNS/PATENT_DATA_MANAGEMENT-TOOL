import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { evaluateMatterNotifications, getRadarCounts, NotificationRecipient } from '../services/notificationService';
import { dispatchNotification, channelStatus } from '../services/dispatchService';
import { scheduleDays, SCHEDULES, AlertScheduleId } from '../services/alertSchedule';
import { getAlertSettings, scheduleFirm, runScanForFirm, scheduleDescription } from '../services/alertScheduler';
import { env } from '../config/env';
import { verifyEmailTransport, sendEmail } from '../services/channels/email';
import { sendWhatsApp, isWhatsAppConfigured, fetchContacts, isReachable } from '../services/channels/whatsapp';
import { NotificationStatus } from '@prisma/client';

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const { tier, matterId } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        firmId,
        ...(tier ? { tier: tier as never } : {}),
        ...(matterId ? { matterId: matterId as string } : {}),
      },
      include: {
        matter: { select: { matterNumber: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: notifications });
  } catch (e) {
    next(e);
  }
});

router.get('/radar', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const deadlines = await prisma.deadline.findMany({
      where: {
        matter: { firmId, deletedAt: null, status: 'ACTIVE' },
      },
      select: { status: true, statutoryDueDate: true },
    });
    res.json({ success: true, data: getRadarCounts(deadlines) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/preview', authenticate, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: paramId(req.params.id), firmId: req.user!.firmId },
    });
    if (!notification) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found', status: 404 } });
    res.json({ success: true, data: { html: notification.bodyHtml, subject: notification.subject } });
  } catch (e) {
    next(e);
  }
});

router.post('/scan', authenticate, async (req, res, next) => {
  try {
    const summary = await runScanForFirm(req.user!.firmId);
    const settings = await getAlertSettings(req.user!.firmId);
    res.json({
      success: true,
      data: {
        scannedAt: summary.ranAt,
        notificationsGenerated: summary.generated,
        delivered: summary.delivered,
        alreadyAlerted: summary.alreadyAlerted,
        channels: channelStatus(),
        schedule: {
          id: settings.schedule,
          leadDays: settings.leadDays,
          firesOnDays: scheduleDays(settings.schedule as AlertScheduleId, settings.leadDays),
        },
      },
    });
  } catch (e) {
    next(e);
  }
});

/** Which delivery channels are actually configured on this deployment. */
/**
 * Which delivery channels are configured, and who they can actually reach.
 *
 * WhatsApp reachability is not a yes/no per deployment: the gateway will only
 * message a contact that has written in first, so a configured channel can
 * still be unable to reach a given attorney. That is reported per recipient
 * rather than discovered when an alert silently fails.
 */
router.get('/channels', authenticate, async (req, res, next) => {
  try {
    const status = channelStatus();
    const email = await verifyEmailTransport();
    const wa = await fetchContacts();

    const [users, clients] = await Promise.all([
      prisma.user.findMany({
        where: { firmId: req.user!.firmId, isActive: true },
        select: { firstName: true, lastName: true, phone: true, role: true },
      }),
      prisma.client.findMany({
        where: { firmId: req.user!.firmId },
        select: { name: true, contactPhone: true },
      }),
    ]);

    const recipients = [
      ...users.map((u) => ({
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        phone: u.phone,
      })),
      ...clients.map((c) => ({ name: c.name, role: 'CLIENT', phone: c.contactPhone })),
    ].map((r) => ({
      ...r,
      whatsappReachable: wa.ok ? isReachable(r.phone, wa.contacts) : null,
    }));

    res.json({
      success: true,
      data: {
        schedule: {
          id: env.alertSchedule,
          leadDays: env.alertLeadDays,
          firesOnDays: scheduleDays(env.alertSchedule, env.alertLeadDays),
          label: SCHEDULES[env.alertSchedule]?.label ?? env.alertSchedule,
        },
        email: { ...status.email, reachable: email.ok, detail: email.detail },
        whatsapp: {
          ...status.whatsapp,
          reachable: wa.ok,
          optedInContacts: wa.contacts.length,
          detail: isWhatsAppConfigured() ? wa.detail : 'WHATSAPP_API_URL and WHATSAPP_API_KEY not set',
        },
        recipients,
        unreachableOnWhatsApp: recipients.filter((r) => r.whatsappReachable === false).length,
      },
    });
  } catch (e) {
    next(e);
  }
});

/** Sends a real test message so channel setup can be proven end to end. */
router.post('/test', authenticate, async (req, res, next) => {
  try {
    const { email, phone } = req.body as { email?: string; phone?: string };
    if (!email && !phone) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide email, phone, or both', status: 422 } });
    }

    const subject = 'LexPatent Docket Radar - channel test';
    const html = '<p>This is a test alert from LexPatent Docket Radar.</p><p>If you are reading it, the channel works.</p>';
    const results = [];
    if (email) results.push(await sendEmail({ to: email, subject, html }));
    if (phone) results.push(await sendWhatsApp({ to: phone, message: subject + '\n\nIf you are reading this, the channel works.' }));

    res.json({ success: true, data: { results } });
  } catch (e) {
    next(e);
  }
});

/** Retry delivery of an alert that failed or was never sent. */
router.post('/:id/resend', authenticate, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: paramId(req.params.id), firmId: req.user!.firmId },
    });
    if (!notification) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found', status: 404 } });
    }
    const targets = (notification.recipients as unknown as NotificationRecipient[]) || [];
    const outcome = await dispatchNotification({
      notificationId: notification.id,
      subject: notification.subject,
      bodyHtml: notification.bodyHtml,
      targets: targets.map((r) => ({ name: r.name, email: r.email, phone: r.phone, role: r.role })),
    });
    res.json({ success: true, data: outcome });
  } catch (e) {
    next(e);
  }
});

/** Current alert configuration for the caller's firm. */
router.get('/settings', authenticate, async (req, res, next) => {
  try {
    const settings = await getAlertSettings(req.user!.firmId);
    res.json({
      success: true,
      data: {
        ...settings,
        firesOnDays: scheduleDays(settings.schedule as AlertScheduleId, settings.leadDays),
        scheduleLabel: SCHEDULES[settings.schedule as AlertScheduleId]?.label ?? settings.schedule,
        description: scheduleDescription(settings),
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Updates the schedule. Re-arms the cron job immediately so a change takes
 * effect without a restart.
 */
router.patch('/settings', authenticate, authorize('ADMIN', 'PARTNER', 'ATTORNEY'), async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    await getAlertSettings(firmId);

    const body = req.body ?? {};
    const data: Record<string, unknown> = {};

    if (body.schedule !== undefined) {
      if (!['EVE_OF', 'HALVING', 'DAILY'].includes(body.schedule)) {
        return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'schedule must be EVE_OF, HALVING or DAILY', status: 422 } });
      }
      data.schedule = body.schedule;
    }
    if (body.leadDays !== undefined) {
      const n = Number(body.leadDays);
      if (!Number.isInteger(n) || n < 1 || n > 365) {
        return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'leadDays must be between 1 and 365', status: 422 } });
      }
      data.leadDays = n;
    }
    if (body.runAtHour !== undefined) {
      const n = Number(body.runAtHour);
      if (!Number.isInteger(n) || n < 0 || n > 23) {
        return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'runAtHour must be 0 to 23', status: 422 } });
      }
      data.runAtHour = n;
    }
    if (body.runAtMinute !== undefined) {
      const n = Number(body.runAtMinute);
      if (!Number.isInteger(n) || n < 0 || n > 59) {
        return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'runAtMinute must be 0 to 59', status: 422 } });
      }
      data.runAtMinute = n;
    }
    if (body.timezone !== undefined) data.timezone = String(body.timezone);
    if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
    if (body.emailEnabled !== undefined) data.emailEnabled = Boolean(body.emailEnabled);
    if (body.whatsappEnabled !== undefined) data.whatsappEnabled = Boolean(body.whatsappEnabled);

    const updated = await prisma.alertSetting.update({ where: { firmId }, data });
    await scheduleFirm(firmId);

    res.json({
      success: true,
      data: {
        ...updated,
        firesOnDays: scheduleDays(updated.schedule as AlertScheduleId, updated.leadDays),
        description: scheduleDescription(updated),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
