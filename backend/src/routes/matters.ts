import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { enrichDeadlines, computeDeadlineFields, setSimulatedDate, getSimulatedDate } from '../services/deadlineService';
import { generateDeadlinesForStage, getTriggerEventForStage } from '../services/rulesEngine';
import { createAuditLog } from '../services/auditService';
import { JurisdictionCode, ProsecutionStage, ReceiptType, MatterStatus } from '@prisma/client';

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function formatMatter(matter: NonNullable<Awaited<ReturnType<typeof fetchMatter>>>) {
  const enrichment = enrichDeadlines(matter.deadlines);
  return {
    ...matter,
    priorityDate: matter.priorityDate?.toISOString().split('T')[0],
    filingDate: matter.filingDate?.toISOString().split('T')[0],
    leadAttorney: matter.leadAttorney
      ? { id: matter.leadAttorney.id, name: `${matter.leadAttorney.firstName} ${matter.leadAttorney.lastName}`, email: matter.leadAttorney.email }
      : null,
    supervisingPartner: matter.supervisingPartner
      ? { id: matter.supervisingPartner.id, name: `${matter.supervisingPartner.firstName} ${matter.supervisingPartner.lastName}` }
      : null,
    client: matter.client,
    nearestDeadline: enrichment.nearestDeadline
      ? {
          ...enrichment.nearestDeadline,
          statutoryDueDate: new Date(enrichment.nearestDeadline.statutoryDueDate).toISOString().split('T')[0],
          daysRemaining: enrichment.daysRemaining,
          urgencyTier: enrichment.urgency.key,
        }
      : null,
    daysRemaining: enrichment.daysRemaining,
    urgency: enrichment.urgency,
    deadlines: matter.deadlines.map((d) => ({
      ...d,
      statutoryDueDate: d.statutoryDueDate.toISOString().split('T')[0],
      extendedDueDate: d.extendedDueDate?.toISOString().split('T')[0],
    })),
  };
}

async function fetchMatter(id: string, firmId: string) {
  return prisma.matter.findFirst({
    where: { id, firmId, deletedAt: null },
    include: {
      client: true,
      leadAttorney: { select: { id: true, firstName: true, lastName: true, email: true } },
      supervisingPartner: { select: { id: true, firstName: true, lastName: true, email: true } },
      deadlines: { orderBy: { statutoryDueDate: 'asc' } },
      receipts: { include: { verifications: true, uploadedBy: { select: { firstName: true, lastName: true } } } },
    },
  });
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const { search, urgency, jurisdiction, attorney, stage } = req.query;

    const matters = await prisma.matter.findMany({
      where: {
        firmId,
        deletedAt: null,
        ...(jurisdiction && jurisdiction !== 'ALL' ? { jurisdiction: jurisdiction as JurisdictionCode } : {}),
        ...(attorney && attorney !== 'ALL' ? { leadAttorneyId: attorney as string } : {}),
        ...(stage ? { currentStage: stage as ProsecutionStage } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search as string, mode: 'insensitive' } },
                { matterNumber: { contains: search as string, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        client: true,
        leadAttorney: { select: { id: true, firstName: true, lastName: true, email: true } },
        supervisingPartner: { select: { id: true, firstName: true, lastName: true } },
        deadlines: { where: { status: { in: ['PENDING', 'WAITING_VERIFICATION', 'OVERDUE'] } } },
      },
      orderBy: { matterNumber: 'asc' },
    });

    let formatted = matters.map((m) => formatMatter({ ...m, receipts: [] } as NonNullable<Awaited<ReturnType<typeof fetchMatter>>>));

    if (urgency && urgency !== 'ALL') {
      formatted = formatted.filter((m) => m?.urgency?.key === urgency);
    }

    res.json({ success: true, data: formatted, meta: { total: formatted.length } });
  } catch (e) {
    next(e);
  }
});

router.get('/export', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const matters = await prisma.matter.findMany({
      where: { firmId, deletedAt: null },
      include: { client: true, deadlines: true, leadAttorney: true },
    });

    const header = 'Matter Number,Title,Jurisdiction,Stage,Client,Priority Date,Nearest Deadline,Days Remaining,Urgency\n';
    const rows = matters.map((m) => {
      const enrichment = enrichDeadlines(m.deadlines);
      return [
        m.matterNumber,
        `"${m.title.replace(/"/g, '""')}"`,
        m.jurisdiction,
        m.currentStage,
        m.client?.name || '',
        m.priorityDate?.toISOString().split('T')[0] || '',
        enrichment.nearestDeadline?.title || '',
        enrichment.daysRemaining ?? '',
        enrichment.urgency.key,
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=lexpatent-docket-export.csv');
    res.send(header + rows);
  } catch (e) {
    next(e);
  }
});

router.get('/simulated-date', authenticate, (_req, res) => {
  res.json({ success: true, data: { simulatedDate: getSimulatedDate() } });
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const id = paramId(req.params.id);
    const matter = await fetchMatter(id, req.user!.firmId);
    if (!matter) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Matter not found', status: 404 } });
    res.json({ success: true, data: formatMatter(matter) });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const {
      matterNumber, title, jurisdiction, currentStage, priorityDate, filingDate,
      officialAppNumber, clientId, leadAttorneyId, supervisingPartnerId, abstract, applicationType,
    } = req.body;

    const existing = await prisma.matter.findUnique({ where: { firmId_matterNumber: { firmId, matterNumber } } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_MATTER', message: 'Matter number exists', status: 409 } });
    }

    const triggerDate = filingDate || priorityDate || new Date().toISOString().split('T')[0];
    const generated = generateDeadlinesForStage(currentStage, triggerDate, priorityDate, jurisdiction);

    const matter = await prisma.matter.create({
      data: {
        firmId,
        matterNumber,
        title,
        jurisdiction: jurisdiction as JurisdictionCode,
        currentStage: currentStage as ProsecutionStage,
        priorityDate: priorityDate ? new Date(priorityDate) : null,
        filingDate: filingDate ? new Date(filingDate) : null,
        officialAppNumber,
        clientId,
        leadAttorneyId,
        supervisingPartnerId,
        abstract,
        applicationType,
        deadlines: {
          create: generated.map((d) => ({
            ruleId: d.ruleId,
            title: d.title,
            description: d.description,
            statutoryDueDate: new Date(d.statutoryDueDate),
            extendedDueDate: d.extendedDueDate ? new Date(d.extendedDueDate) : null,
            isStatutoryBar: d.isStatutoryBar,
            isExtendable: d.isExtendable,
            maxExtensionMonths: d.maxExtensionMonths,
            extensionProcedure: d.extensionProcedure,
            statutorySection: d.statutorySection,
            requiredReceiptType: d.requiredReceiptType as ReceiptType | undefined,
            ...computeDeadlineFields(d.statutoryDueDate),
          })),
        },
      },
      include: { deadlines: true, client: true },
    });

    await createAuditLog({
      firmId,
      userId: req.user!.id,
      entityType: 'matter',
      entityId: matter.id,
      action: 'CREATE',
      afterState: matter,
    });

    const full = await fetchMatter(matter.id, firmId);
    res.status(201).json({ success: true, data: full ? formatMatter(full) : null });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const id = paramId(req.params.id);
    const matter = await prisma.matter.findFirst({ where: { id, firmId, deletedAt: null } });
    if (!matter) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Matter not found', status: 404 } });

    const updated = await prisma.matter.update({
      where: { id },
      data: req.body,
    });

    await createAuditLog({
      firmId,
      userId: req.user!.id,
      entityType: 'matter',
      entityId: matter.id,
      action: 'UPDATE',
      beforeState: matter,
      afterState: updated,
    });

    const full = await fetchMatter(updated.id, firmId);
    res.json({ success: true, data: full ? formatMatter(full) : null });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const id = paramId(req.params.id);
    await prisma.matter.updateMany({
      where: { id, firmId },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true, data: { message: 'Matter archived' } });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/advance-stage', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const id = paramId(req.params.id);
    const { newStage, triggerDate } = req.body;
    const matter = await prisma.matter.findFirst({ where: { id, firmId } });
    if (!matter) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Matter not found', status: 404 } });

    const date = triggerDate || new Date().toISOString().split('T')[0];
    const priority = matter.priorityDate?.toISOString().split('T')[0] || date;
    const generated = generateDeadlinesForStage(newStage, date, priority, matter.jurisdiction);

    await prisma.matter.update({ where: { id: matter.id }, data: { currentStage: newStage as ProsecutionStage } });
    if (generated.length) {
      await prisma.deadline.createMany({
        data: generated.map((d) => ({
          matterId: matter.id,
          ruleId: d.ruleId,
          title: d.title,
          description: d.description,
          statutoryDueDate: new Date(d.statutoryDueDate),
          isStatutoryBar: d.isStatutoryBar,
          isExtendable: d.isExtendable,
          maxExtensionMonths: d.maxExtensionMonths,
          statutorySection: d.statutorySection,
          requiredReceiptType: d.requiredReceiptType as ReceiptType | undefined,
          ...computeDeadlineFields(d.statutoryDueDate),
        })),
      });
    }

    const full = await fetchMatter(matter.id, firmId);
    res.json({ success: true, data: full ? formatMatter(full) : null });
  } catch (e) {
    next(e);
  }
});

router.post('/simulated-date', authenticate, (req, res) => {
  const { date } = req.body;
  if (date) setSimulatedDate(date);
  res.json({ success: true, data: { simulatedDate: date } });
});

export default router;
