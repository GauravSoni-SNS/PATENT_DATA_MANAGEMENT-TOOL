import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog, advanceStageAfterClearance } from '../services/auditService';
import { computeDeadlineFields } from '../services/deadlineService';

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.get('/pending', authenticate, authorize('ADMIN', 'PARTNER'), async (req, res, next) => {
  try {
    const verifications = await prisma.verification.findMany({
      where: {
        status: 'PENDING',
        deadline: { matter: { firmId: req.user!.firmId } },
      },
      include: {
        receipt: true,
        deadline: { include: { matter: { select: { matterNumber: true, title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: verifications });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/approve', authenticate, authorize('ADMIN', 'PARTNER'), async (req, res, next) => {
  try {
    const verification = await prisma.verification.findFirst({
      where: { id: paramId(req.params.id) },
      include: { deadline: { include: { matter: true } }, receipt: true },
    });
    if (!verification || verification.deadline.matter.firmId !== req.user!.firmId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Verification not found', status: 404 } });
    }

    await prisma.verification.update({
      where: { id: verification.id },
      data: { status: 'APPROVED', verifiedById: req.user!.id, verifiedAt: new Date(), notes: req.body.notes },
    });

    await createAuditLog({
      firmId: req.user!.firmId,
      userId: req.user!.id,
      entityType: 'verification',
      entityId: verification.id,
      action: 'APPROVE',
      afterState: { status: 'APPROVED' },
    });

    res.json({ success: true, data: { message: 'Verification approved. Deadline can now be cleared.' } });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/reject', authenticate, authorize('ADMIN', 'PARTNER'), async (req, res, next) => {
  try {
    const verification = await prisma.verification.findFirst({
      where: { id: paramId(req.params.id) },
      include: { deadline: { include: { matter: true } } },
    });
    if (!verification || verification.deadline.matter.firmId !== req.user!.firmId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Verification not found', status: 404 } });
    }

    await prisma.verification.update({
      where: { id: verification.id },
      data: {
        status: 'REJECTED',
        verifiedById: req.user!.id,
        verifiedAt: new Date(),
        rejectionReason: req.body.rejectionReason,
      },
    });

    await prisma.deadline.update({
      where: { id: verification.deadlineId },
      data: { status: 'PENDING' },
    });

    res.json({ success: true, data: { message: 'Verification rejected' } });
  } catch (e) {
    next(e);
  }
});

export default router;

// Deadline clearance router
export const deadlinesRouter = Router();

deadlinesRouter.post('/:matterId/deadlines/:deadlineId/clear', authenticate, authorize('ADMIN', 'PARTNER', 'ATTORNEY'), async (req, res, next) => {
  try {
    const matterId = paramId(req.params.matterId);
    const deadlineId = paramId(req.params.deadlineId);
    const { receiptId } = req.body;

    const deadline = await prisma.deadline.findFirst({
      where: { id: deadlineId, matterId, matter: { firmId: req.user!.firmId } },
      include: { matter: true },
    });
    if (!deadline) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deadline not found', status: 404 } });
    }

    const verification = await prisma.verification.findFirst({
      where: { deadlineId, receiptId, status: 'APPROVED' },
    });
    if (!verification) {
      return res.status(422).json({
        success: false,
        error: { code: 'VERIFICATION_PENDING', message: 'Dual verification must be approved before clearing', status: 422 },
      });
    }

    const before = { ...deadline };
    await prisma.deadline.update({
      where: { id: deadlineId },
      data: { status: 'CLEARED', clearedAt: new Date(), clearedById: req.user!.id },
    });

    const newStage = await advanceStageAfterClearance(matterId, deadline.ruleId);

    await createAuditLog({
      firmId: req.user!.firmId,
      userId: req.user!.id,
      entityType: 'deadline',
      entityId: deadlineId,
      action: 'CLEAR',
      beforeState: before,
      afterState: { status: 'CLEARED', newStage },
    });

    const updatedMatter = await prisma.matter.findUnique({
      where: { id: matterId },
      include: { deadlines: true },
    });

    res.json({
      success: true,
      data: {
        deadline: { id: deadlineId, status: 'CLEARED' },
        newStage,
        matter: updatedMatter,
      },
    });
  } catch (e) {
    next(e);
  }
});

deadlinesRouter.post('/:matterId/deadlines/:deadlineId/extend', authenticate, async (req, res, next) => {
  try {
    const matterId = paramId(req.params.matterId);
    const deadlineId = paramId(req.params.deadlineId);
    const { extensionMonths, notes } = req.body;

    const deadline = await prisma.deadline.findFirst({
      where: { id: deadlineId, matterId, matter: { firmId: req.user!.firmId } },
    });
    if (!deadline) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deadline not found', status: 404 } });
    if (!deadline.isExtendable) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Deadline not extendable', status: 422 } });
    }

    const months = extensionMonths || 3;
    const newDue = new Date(deadline.statutoryDueDate);
    newDue.setMonth(newDue.getMonth() + months);

    const updated = await prisma.deadline.update({
      where: { id: deadlineId },
      data: {
        status: 'EXTENDED',
        extendedDueDate: newDue,
        statutoryDueDate: newDue,
        notes: (deadline.notes || '') + `\nExtension applied: +${months} months`,
        ...computeDeadlineFields(newDue),
      },
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});
