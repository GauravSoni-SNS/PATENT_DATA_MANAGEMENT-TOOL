import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({ where: { firmId: req.user!.firmId } });
    res.json({ success: true, data: clients });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const client = await prisma.client.create({
      data: { ...req.body, firmId: req.user!.firmId },
    });
    res.status(201).json({ success: true, data: client });
  } catch (e) {
    next(e);
  }
});

export default router;
