import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { calculateDeadlines, generateDeadlinesForStage, getTriggerEventForStage, JURISDICTIONS, STAGES, STATUTORY_RULES } from '../services/rulesEngine';
import type { Jurisdiction, TriggerEvent } from '../services/rulesEngine';

const router = Router();

router.get('/', authenticate, (_req, res) => {
  res.json({
    success: true,
    data: {
      jurisdictions: JURISDICTIONS,
      stages: STAGES,
      triggerEvents: Object.keys(STATUTORY_RULES),
    },
  });
});

const calculateSchema = z.object({
  triggerEvent: z.string(),
  triggerDate: z.string(),
  jurisdiction: z.enum(['IN', 'US', 'EP', 'WO']).default('IN'),
  priorityDate: z.string().optional(),
});

router.post('/calculate', authenticate, validate(calculateSchema), (req, res) => {
  const { triggerEvent, triggerDate, jurisdiction, priorityDate } = req.body;
  const deadlines = calculateDeadlines(
    triggerEvent as TriggerEvent,
    triggerDate,
    jurisdiction as Jurisdiction,
    priorityDate
  );
  res.json({ success: true, data: { deadlines } });
});

router.post('/generate-for-stage', authenticate, (req, res) => {
  const { stage, triggerDate, priorityDate, jurisdiction } = req.body;
  const deadlines = generateDeadlinesForStage(stage, triggerDate, priorityDate, jurisdiction || 'IN');
  res.json({ success: true, data: { deadlines, triggerEvent: getTriggerEventForStage(stage) } });
});

export default router;
