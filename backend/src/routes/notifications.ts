import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { evaluateMatterNotifications, getRadarCounts, NotificationRecipient } from '../services/notificationService';
import { dispatchNotification, channelStatus } from '../services/dispatchService';
import { scheduleDays, SCHEDULES } from '../services/alertSchedule';
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
    const firmId = req.user!.firmId;

    const matters = await prisma.matter.findMany({
      where: { firmId, deletedAt: null, status: 'ACTIVE' },
      include: {
        client: true,
        leadAttorney: true,
        supervisingPartner: true,
        deadlines: true,
      },
    });

    const generated = [];
    let skipped = 0;
    for (const matter of matters) {
      const notifs = evaluateMatterNotifications(matter);
      for (const n of notifs) {
        // Same deadline, same tier, same days remaining is the same calendar
        // day: re-running the scan must not alert anyone twice.
        const alreadySent = await prisma.notification.findFirst({
          where: {
            firmId,
            deadlineId: n.deadlineId,
            tier: n.tier,
            daysRemaining: n.daysRemaining,
          },
        });
        if (alreadySent) {
          skipped += 1;
          continue;
        }

        const record = await prisma.notification.create({
          data: {
            firmId,
            matterId: matter.id,
            deadlineId: n.deadlineId,
            tier: n.tier,
            tierLabel: n.tierLabel,
            subject: n.subject,
            bodyHtml: n.bodyHtml,
            recipients: n.recipients as object,
            daysRemaining: n.daysRemaining,
            isEmergency: n.isEmergency,
            status: 'PENDING' as NotificationStatus,
          },
        });
        const outcome = await dispatchNotification({
          notificationId: record.id,
          subject: n.subject,
          bodyHtml: n.bodyHtml,
          targets: n.recipients.map((r) => ({ name: r.name, email: r.email, phone: r.phone, role: r.role })),
        });
        generated.push({ ...record, status: outcome.status, deliveries: outcome.deliveries });
      }
    }

    res.json({
      success: true,
      data: {
        scannedAt: new Date().toISOString(),
        notificationsGenerated: generated.length,
        alreadyAlerted: skipped,
        schedule: { id: env.alertSchedule, leadDays: env.alertLeadDays, firesOnDays: scheduleDays(env.alertSchedule, env.alertLeadDays) },
        channels: channelStatus(),
        delivered: generated.filter((g) => g.status === 'DELIVERED' || g.status === 'SENT').length,
        undelivered: generated.filter((g) => g.status === 'PENDING').length,
        notifications: generated,
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

export default router;
