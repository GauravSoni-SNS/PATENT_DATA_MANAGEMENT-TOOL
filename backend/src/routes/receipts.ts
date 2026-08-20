import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { env } from '../config/env';
import { createAuditLog, advanceStageAfterClearance } from '../services/auditService';
import { parseReceiptText, listSamples, getSampleById } from '../services/receiptParserService';
import { generateDeadlinesForStage } from '../services/rulesEngine';
import { computeDeadlineFields } from '../services/deadlineService';
import { ReceiptType, JurisdictionCode, ProsecutionStage } from '@prisma/client';

const router = Router();

if (!fs.existsSync(env.uploadDir)) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const { matterId } = req.query;
    const receipts = await prisma.receipt.findMany({
      where: {
        matter: { firmId, deletedAt: null },
        ...(matterId ? { matterId: matterId as string } : {}),
      },
      include: {
        matter: { select: { matterNumber: true, title: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
        verifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: receipts });
  } catch (e) {
    next(e);
  }
});

router.get('/samples', authenticate, (_req, res) => {
  res.json({ success: true, data: listSamples() });
});

router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const { matterId, deadlineId, receiptType, cbrNumber, officialFees, currency } = req.body;
    if (!matterId) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'matterId required', status: 422 } });
    }

    const matter = await prisma.matter.findFirst({ where: { id: matterId, firmId: req.user!.firmId } });
    if (!matter) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Matter not found', status: 404 } });

    let parsedData = {};
    if (req.file) {
      const text = fs.readFileSync(req.file.path, 'utf-8');
      parsedData = parseReceiptText(text);
    }

    const receipt = await prisma.receipt.create({
      data: {
        matterId,
        deadlineId: deadlineId || null,
        receiptType: (receiptType || 'OTHER') as ReceiptType,
        fileName: req.file?.originalname || 'manual-entry.txt',
        filePath: req.file?.path || '',
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype,
        cbrNumber: cbrNumber || (parsedData as { cbrNumber?: string }).cbrNumber,
        officialFees: officialFees ? parseFloat(officialFees) : (parsedData as { officialFees?: number }).officialFees,
        currency: currency || (parsedData as { currency?: string }).currency,
        parsedData,
        uploadedById: req.user!.id,
      },
    });

    if (deadlineId) {
      await prisma.deadline.update({
        where: { id: deadlineId },
        data: { status: 'WAITING_VERIFICATION' },
      });
      await prisma.verification.create({
        data: { receiptId: receipt.id, deadlineId, status: 'PENDING' },
      });
    }

    await createAuditLog({
      firmId: req.user!.firmId,
      userId: req.user!.id,
      entityType: 'receipt',
      entityId: receipt.id,
      action: 'UPLOAD',
      afterState: receipt,
    });

    res.status(201).json({ success: true, data: receipt });
  } catch (e) {
    next(e);
  }
});

router.post('/parse-sample', authenticate, (req, res) => {
  const { sampleId } = req.body;
  const sample = getSampleById(sampleId);
  if (!sample) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sample not found', status: 404 } });
  }
  const parsed = sample.extractedData;
  const deadlines = generateDeadlinesForStage(
    parsed.stage || 'PROVISIONAL',
    parsed.triggerDate || new Date().toISOString().split('T')[0],
    parsed.priorityDate,
    (parsed.jurisdiction || 'IN') as JurisdictionCode
  );
  res.json({ success: true, data: { parsed, deadlines, sample: { id: sample.id, label: sample.label, fileName: sample.fileName } } });
});

router.post('/auto-docket', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    let parsed;
    if (req.body.sampleId) {
      const sample = getSampleById(req.body.sampleId);
      parsed = sample?.extractedData;
    } else if (req.file) {
      const text = fs.readFileSync(req.file.path, 'utf-8');
      parsed = parseReceiptText(text);
    } else if (req.body.rawText) {
      parsed = parseReceiptText(req.body.rawText);
    } else {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Provide file, sampleId, or rawText', status: 422 } });
    }

    const stage = parsed?.stage || 'PROVISIONAL';
    const triggerDate = parsed?.triggerDate || new Date().toISOString().split('T')[0];
    const deadlines = generateDeadlinesForStage(stage, triggerDate, parsed?.priorityDate, (parsed?.jurisdiction || 'IN') as JurisdictionCode);

    res.json({
      success: true,
      data: {
        parsedPreview: { ...parsed, proposedDeadlines: deadlines },
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/auto-docket/confirm', authenticate, async (req, res, next) => {
  try {
    const firmId = req.user!.firmId;
    const { parsed, leadAttorneyId, supervisingPartnerId } = req.body;
    if (!parsed?.matterNumber || !parsed?.title) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parsed data', status: 422 } });
    }

    let client = await prisma.client.findFirst({ where: { firmId, name: parsed.clientName } });
    if (!client && parsed.clientName) {
      client = await prisma.client.create({
        data: {
          firmId,
          name: parsed.clientName,
          contactEmail: parsed.clientEmail,
          code: parsed.clientName.substring(0, 6).toUpperCase(),
        },
      });
    }

    const stage = (parsed.stage || 'PROVISIONAL') as ProsecutionStage;
    const triggerDate = parsed.triggerDate || new Date().toISOString().split('T')[0];
    const generated = generateDeadlinesForStage(stage, triggerDate, parsed.priorityDate, (parsed.jurisdiction || 'IN') as JurisdictionCode);

    const matter = await prisma.matter.create({
      data: {
        firmId,
        matterNumber: parsed.matterNumber,
        title: parsed.title,
        jurisdiction: (parsed.jurisdiction || 'IN') as JurisdictionCode,
        currentStage: stage,
        priorityDate: parsed.priorityDate ? new Date(parsed.priorityDate) : null,
        filingDate: parsed.triggerDate ? new Date(parsed.triggerDate) : null,
        officialAppNumber: parsed.officialAppNumber,
        abstract: parsed.abstract,
        clientId: client?.id,
        leadAttorneyId: leadAttorneyId || req.user!.id,
        supervisingPartnerId,
        deadlines: {
          create: generated.map((d) => ({
            ruleId: d.ruleId,
            title: d.title,
            description: d.description,
            statutoryDueDate: new Date(d.statutoryDueDate),
            isStatutoryBar: d.isStatutoryBar,
            isExtendable: d.isExtendable,
            requiredReceiptType: d.requiredReceiptType as ReceiptType | undefined,
            statutorySection: d.statutorySection,
            ...computeDeadlineFields(d.statutoryDueDate),
          })),
        },
      },
      include: { deadlines: true, client: true },
    });

    res.status(201).json({ success: true, data: matter });
  } catch (e) {
    next(e);
  }
});

export default router;

// Verification routes in separate file but also deadline clear
