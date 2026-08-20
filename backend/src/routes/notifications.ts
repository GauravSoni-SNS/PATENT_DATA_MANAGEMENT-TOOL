import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { evaluateMatterNotifications, getRadarCounts } from '../services/notificationService';
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
            status: 'SENT' as NotificationStatus,
            sentAt: new Date(),
          },
        });
        generated.push(record);
      }
    }

    res.json({
      success: true,
      data: {
        scannedAt: new Date().toISOString(),
        notificationsGenerated: generated.length,
        notifications: generated,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
