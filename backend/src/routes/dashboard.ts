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


/**
 * Everyone who can receive an alert, with the phone number WhatsApp would use.
 * Readable by any signed-in user: the team needs to see who is covered without
 * needing an admin.
 */
router.get('/recipients', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const [users, clients] = await Promise.all([
      prisma.user.findMany({
        where: { firmId, isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, altPhone: true, altEmail: true, role: true },
        orderBy: { firstName: 'asc' },
      }),
      prisma.client.findMany({
        where: { firmId },
        select: { id: true, name: true, contactPerson: true, contactEmail: true, contactPhone: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    res.json({ success: true, data: { users, clients } });
  } catch (e) {
    next(e);
  }
});

/** Digits, optionally a leading +, 8-15 long. Empty clears the number. */
function normalisePhoneInput(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || String(raw).trim() === '') return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15) return undefined;
  return '+' + digits;
}

/**
 * Updates a team member's alert phone number.
 *
 * Only the phone is writable, and only within the caller's firm: a body is
 * never handed to Prisma directly, so no other column can be reached.
 */
router.patch('/users/:id', authenticate, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const caller = req.user!;
    const isPrivileged = caller.role === 'ADMIN' || caller.role === 'PARTNER';
    if (!isPrivileged && caller.id !== id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only change your own number', status: 403 } });
    }

    const phone = normalisePhoneInput(req.body?.phone);
    if (req.body?.phone !== undefined && phone === undefined) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter 8 to 15 digits, or leave blank to clear', status: 422 } });
    }

    const existing = await prisma.user.findFirst({ where: { id, firmId: caller.firmId } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found', status: 404 } });

    const altPhone = normalisePhoneInput(req.body?.altPhone);
    if (req.body?.altPhone !== undefined && altPhone === undefined) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Backup number must be 8 to 15 digits, or blank to clear', status: 422 } });
    }

    let altEmail: string | null | undefined;
    if (req.body?.altEmail !== undefined) {
      const trimmed = String(req.body.altEmail).trim();
      if (!trimmed) {
        altEmail = null;
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
        return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Backup email is not a valid address', status: 422 } });
      } else {
        altEmail = trimmed;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(req.body?.phone !== undefined ? { phone } : {}),
        ...(req.body?.altPhone !== undefined ? { altPhone } : {}),
        ...(altEmail !== undefined ? { altEmail } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, altPhone: true, altEmail: true, role: true },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

/** Same rules for a client's alert contact number. */
router.patch('/clients/:id', authenticate, authorize('ADMIN', 'PARTNER', 'ATTORNEY'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const phone = normalisePhoneInput(req.body?.contactPhone);
    if (phone === undefined) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter 8 to 15 digits, or leave blank to clear', status: 422 } });
    }

    const existing = await prisma.client.findFirst({ where: { id, firmId: req.user!.firmId } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found', status: 404 } });

    const updated = await prisma.client.update({
      where: { id },
      data: { contactPhone: phone },
      select: { id: true, name: true, contactEmail: true, contactPhone: true },
    });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

/** Firm identity, so the UI never hardcodes the workspace name. */
router.get('/firm', authenticate, async (req, res, next) => {
  try {
    const firm = await prisma.firm.findUnique({
      where: { id: req.user!.firmId },
      select: { id: true, name: true, slug: true, timezone: true },
    });
    if (!firm) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Firm not found', status: 404 } });
    }
    res.json({ success: true, data: firm });
  } catch (e) {
    next(e);
  }
});

export default router;
