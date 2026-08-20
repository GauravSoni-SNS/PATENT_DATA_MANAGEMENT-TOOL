import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { getRadarCounts } from '../services/notificationService';

const router = Router();

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;

    const [matters, deadlines, pendingVerifications] = await Promise.all([
      prisma.matter.groupBy({
        by: ['currentStage'],
        where: { firmId, deletedAt: null, status: 'ACTIVE' },
        _count: true,
      }),
      prisma.deadline.findMany({
        where: { matter: { firmId, deletedAt: null } },
        select: { status: true, statutoryDueDate: true },
      }),
      prisma.verification.count({
        where: { status: 'PENDING', deadline: { matter: { firmId } } },
      }),
    ]);

    const activeMatters = await prisma.matter.count({ where: { firmId, deletedAt: null, status: 'ACTIVE' } });
    const pending = deadlines.filter((d) => d.status === 'PENDING' || d.status === 'WAITING_VERIFICATION');
    const overdue = deadlines.filter((d) => d.status === 'OVERDUE' || (d.status === 'PENDING' && new Date(d.statutoryDueDate) < new Date()));

    res.json({
      success: true,
      data: {
        totalActiveMatters: activeMatters,
        pendingDeadlines: pending.length,
        overdueDeadlines: overdue.length,
        pendingVerifications,
        urgencyBreakdown: getRadarCounts(deadlines),
        mattersByStage: Object.fromEntries(matters.map((m) => [m.currentStage, m._count])),
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/users', authenticate, authorize('ADMIN', 'PARTNER'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { firmId: req.user!.firmId, isActive: true },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, specialization: true, avatarUrl: true,
      },
    });
    res.json({ success: true, data: users });
  } catch (e) {
    next(e);
  }
});

router.get('/audit', authenticate, authorize('ADMIN', 'PARTNER'), async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { firmId: req.user!.firmId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: logs });
  } catch (e) {
    next(e);
  }
});

export default router;
