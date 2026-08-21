import { NotificationTier, UserRole } from '@prisma/client';
import { getSimulatedDate, calculateDaysRemaining, getUrgencyTier } from './deadlineService';
import { decideAlert } from './alertSchedule';
import { env } from '../config/env';

export interface NotificationRecipient {
  name: string;
  email: string;
  /** Used for the WhatsApp channel; absent means email only. */
  phone?: string | null;
  role: string;
}

export interface GeneratedNotification {
  /** The deadline this alert is about, not merely the matter it belongs to. */
  deadlineId: string;
  tier: NotificationTier;
  tierLabel: string;
  subject: string;
  bodyHtml: string;
  recipients: NotificationRecipient[];
  daysRemaining: number;
  isEmergency: boolean;
}

function getTierForDays(days: number): { tier: NotificationTier; tierLabel: string; isEmergency: boolean } | null {
  return decideAlert(days, env.alertSchedule, env.alertLeadDays);
}

export function generateEmailSubject(tier: NotificationTier, days: number, matterNumber: string, deadlineTitle: string): string {
  switch (tier) {
    case 'DAILY_COUNTDOWN':
      return days < 0
        ? `[OVERDUE] EMERGENCY: ${matterNumber} - ${deadlineTitle}`
        : `[T-${days} DAYS REMAINING] EMERGENCY DOCKET ALERT: ${matterNumber} - ${deadlineTitle}`;
    case 'T_5_CRITICAL':
      return `[5-DAY CRITICAL ALERT] Approaching Statutory Bar: ${matterNumber} (${deadlineTitle})`;
    case 'T_15_URGENT':
      return `[15-Day URGENT] Action Required: ${matterNumber} - ${deadlineTitle}`;
    case 'T_30_ADVISORY':
      return `[30-Day Reminder] Patent Deadline: ${matterNumber} - ${deadlineTitle}`;
    default:
      return `Patent Deadline Alert: ${matterNumber}`;
  }
}

export function generateEmailHtml(params: {
  tierLabel: string;
  matterNumber: string;
  matterTitle: string;
  deadlineTitle: string;
  statutoryDueDate: string;
  daysRemaining: number;
  recipients: NotificationRecipient[];
  isEmergency: boolean;
}): string {
  const recipientList = params.recipients
    .map((r) => `<li><strong>${r.role}:</strong> ${r.name} &lt;${r.email}&gt;</li>`)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${params.isEmergency ? '#dc2626' : '#f97316'}; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${params.tierLabel}</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
        <p><strong>Matter:</strong> ${params.matterNumber}</p>
        <p><strong>Title:</strong> ${params.matterTitle}</p>
        <p><strong>Deadline:</strong> ${params.deadlineTitle}</p>
        <p><strong>Due Date:</strong> ${params.statutoryDueDate}</p>
        <p><strong>Days Remaining:</strong> ${params.daysRemaining}</p>
        <hr/>
        <p><strong>Recipients:</strong></p>
        <ul>${recipientList}</ul>
        <p style="color: #6b7280; font-size: 12px;">LexPatent Docket Radar — Zero-Fail Escalation Engine</p>
      </div>
    </div>
  `;
}

interface MatterForNotification {
  id: string;
  matterNumber: string;
  title: string;
  client?: { contactPerson?: string | null; contactEmail?: string | null; contactPhone?: string | null } | null;
  leadAttorney?: { firstName: string; lastName: string; email: string; phone?: string | null } | null;
  supervisingPartner?: { firstName: string; lastName: string; email: string; phone?: string | null } | null;
  deadlines: Array<{
    id: string;
    title: string;
    statutoryDueDate: Date;
    status: string;
  }>;
}

export function evaluateMatterNotifications(matter: MatterForNotification): GeneratedNotification[] {
  const results: GeneratedNotification[] = [];
  const pending = matter.deadlines.filter((d) => d.status === 'PENDING' || d.status === 'WAITING_VERIFICATION');

  for (const deadline of pending) {
    const days = calculateDaysRemaining(deadline.statutoryDueDate);
    const tierInfo = getTierForDays(days);
    if (!tierInfo) continue;

    const attorney = matter.leadAttorney;
    const partner = matter.supervisingPartner;
    const recipients: NotificationRecipient[] = [];

    if (attorney) {
      recipients.push({ name: `${attorney.firstName} ${attorney.lastName}`, email: attorney.email, phone: attorney.phone, role: 'Lead Attorney' });
    }
    if (partner && tierInfo.tier !== 'T_30_ADVISORY') {
      recipients.push({ name: `${partner.firstName} ${partner.lastName}`, email: partner.email, phone: partner.phone, role: 'Supervising Partner' });
    }
    if (tierInfo.tier === 'T_5_CRITICAL' || tierInfo.tier === 'DAILY_COUNTDOWN') {
      if (matter.client?.contactEmail) {
        recipients.push({
          name: matter.client.contactPerson || 'Client Legal Contact',
          email: matter.client.contactEmail,
          phone: matter.client.contactPhone,
          role: 'Client Legal Contact',
        });
      }
      recipients.push({ name: 'Docket Risk Committee', email: 'ip-risk@lexpatent-ip.com', role: 'Safety Oversight' });
    }

    const subject = generateEmailSubject(tierInfo.tier, days, matter.matterNumber, deadline.title);
    const bodyHtml = generateEmailHtml({
      tierLabel: tierInfo.tierLabel,
      matterNumber: matter.matterNumber,
      matterTitle: matter.title,
      deadlineTitle: deadline.title,
      statutoryDueDate: new Date(deadline.statutoryDueDate).toISOString().split('T')[0],
      daysRemaining: days,
      recipients,
      isEmergency: tierInfo.isEmergency,
    });

    results.push({
      deadlineId: deadline.id,
      tier: tierInfo.tier,
      tierLabel: tierInfo.tierLabel,
      subject,
      bodyHtml,
      recipients,
      daysRemaining: days,
      isEmergency: tierInfo.isEmergency,
    });
  }

  return results;
}

export function getRadarCounts(deadlines: Array<{ status: string; statutoryDueDate: Date }>) {
  let dailyCritical = 0;
  let critical5d = 0;
  let urgent15d = 0;
  let advisory30d = 0;
  let overdue = 0;

  for (const d of deadlines) {
    if (d.status !== 'PENDING' && d.status !== 'WAITING_VERIFICATION') continue;
    const days = calculateDaysRemaining(d.statutoryDueDate);
    const tier = getUrgencyTier(days);
    switch (tier.key) {
      case 'DAILY_CRITICAL': dailyCritical++; break;
      case 'T_5_CRITICAL': critical5d++; break;
      case 'T_15_URGENT': urgent15d++; break;
      case 'T_30_ADVISORY': advisory30d++; break;
      case 'OVERDUE': overdue++; break;
    }
  }

  return { dailyCritical, critical5d, urgent15d, advisory30d, overdue };
}

export { getSimulatedDate };
