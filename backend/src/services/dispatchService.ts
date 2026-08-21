import { NotificationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendEmail, isEmailConfigured, DeliveryResult } from './channels/email';
import { sendWhatsApp, isWhatsAppConfigured, toPlainText } from './channels/whatsapp';

export interface DispatchTarget {
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
}

/**
 * Sends one notification over every configured channel and records what
 * actually happened.
 *
 * The status is derived from the results, never assumed: a docketing tool that
 * marks an alert SENT when nothing left the building is worse than one that
 * admits it could not deliver.
 */
export async function dispatchNotification(params: {
  notificationId: string;
  subject: string;
  bodyHtml: string;
  targets: DispatchTarget[];
}): Promise<{ status: NotificationStatus; deliveries: DeliveryResult[] }> {
  const deliveries: DeliveryResult[] = [];
  const plain = toPlainText(params.bodyHtml);

  for (const target of params.targets) {
    if (target.email) {
      deliveries.push(await sendEmail({ to: target.email, subject: params.subject, html: params.bodyHtml }));
    }
    if (target.phone) {
      deliveries.push(await sendWhatsApp({ to: target.phone, message: `*${params.subject}*\n\n${plain}` }));
    }
  }

  const sent = deliveries.filter((d) => d.status === 'SENT').length;
  const failed = deliveries.filter((d) => d.status === 'FAILED').length;

  // PENDING doubles as "nothing was delivered yet" - correct when no channel
  // is configured, so the alert stays visibly undelivered rather than silently
  // disappearing.
  let status: NotificationStatus = 'PENDING';
  if (sent > 0) status = failed > 0 ? 'SENT' : 'DELIVERED';
  else if (failed > 0) status = 'FAILED';

  await prisma.notification.update({
    where: { id: params.notificationId },
    data: {
      status,
      sentAt: sent > 0 ? new Date() : null,
      deliveries: deliveries as unknown as object,
    },
  });

  return { status, deliveries };
}

export function channelStatus() {
  return {
    email: { configured: isEmailConfigured() },
    whatsapp: { configured: isWhatsAppConfigured() },
  };
}
