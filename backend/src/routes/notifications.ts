import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { evaluateMatterNotifications, getRadarCounts, NotificationRecipient } from '../services/notificationService';
import { dispatchNotification, channelStatus } from '../services/dispatchService';
import { verifyEmailTransport, sendEmail } from '../services/channels/email';
import { sendWhatsApp, isWhatsAppConfigured } from '../services/channels/whatsapp';
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
    for (const matter of matters) {
      const notifs = evaluateMatterNotifications(matter);
      for (const n of notifs) {
        const nearestDeadline = matter.deadlines.find((d) => d.status === 'PENDING' || d.status === 'WAITING_VERIFICATION');
        const record = await prisma.notification.create({
          data: {
            firmId,
            matterId: matter.id,
            deadlineId: nearestDeadline?.id,
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
        channels: channelStatus(),
        delivered: generated.filter((g) => g.status === 'DELIVERED' || g.status === 'SENT').length,
        skipped: generated.filter((g) => g.status === 'PENDING').length,
        notifications: generated,
      },
    });
  } catch (e) {
    next(e);
  }
});


/** Which delivery channels are actually configured on this deployment. */
router.get('/channels', authenticate, async (_req, res) => {
  const status = channelStatus();
  const email = await verifyEmailTransport();
  res.json({
    success: true,
    data: {
      email: { ...status.email, reachable: email.ok, detail: email.detail },
      whatsapp: { ...status.whatsapp, detail: isWhatsAppConfigured() ? 'Gateway configured' : 'WHATSAPP_API_URL and WHATSAPP_API_KEY not set' },
    },
  });
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
