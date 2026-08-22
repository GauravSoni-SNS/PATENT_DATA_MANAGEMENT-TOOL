import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { can } from '../services/permissions';

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function forbidden(res: import('express').Response, message: string) {
  return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message, status: 403 } });
}

const MEMBER_FIELDS = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  altPhone: true,
  altEmail: true,
  role: true,
} as const;

/** Every team in the firm, with its members. Readable by any signed-in member. */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: { firmId: req.user!.firmId },
      include: {
        members: { include: { user: { select: MEMBER_FIELDS } } },
        _count: { select: { matters: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: teams.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        practice: t.practice,
        isActive: t.isActive,
        matterCount: t._count.matters,
        members: t.members.map((m) => m.user),
      })),
    });
  } catch (e) {
    next(e);
  }
});

/** Teams the caller belongs to, used to pick a team when adding a matter. */
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: req.user!.id, team: { firmId: req.user!.firmId, isActive: true } },
      include: { team: true },
      orderBy: { team: { name: 'asc' } },
    });
    res.json({ success: true, data: memberships.map((m) => m.team) });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    if (!can(req.user!.role, 'MANAGE_TEAMS')) return forbidden(res, 'Only an admin can create teams');

    const name = String(req.body?.name ?? '').trim();
    if (!name) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Team name is required', status: 422 } });
    }

    const existing = await prisma.team.findFirst({ where: { firmId: req.user!.firmId, name } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'A team with that name already exists', status: 409 } });
    }

    const team = await prisma.team.create({
      data: {
        firmId: req.user!.firmId,
        name,
        description: req.body?.description ? String(req.body.description) : null,
        practice: req.body?.practice ? String(req.body.practice) : null,
      },
    });
    res.status(201).json({ success: true, data: team });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    if (!can(req.user!.role, 'MANAGE_TEAMS')) return forbidden(res, 'Only an admin can change teams');

    const id = paramId(req.params.id);
    const team = await prisma.team.findFirst({ where: { id, firmId: req.user!.firmId } });
    if (!team) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team not found', status: 404 } });

    const data: Record<string, unknown> = {};
    if (req.body?.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body?.description !== undefined) data.description = req.body.description ? String(req.body.description) : null;
    if (req.body?.practice !== undefined) data.practice = req.body.practice ? String(req.body.practice) : null;
    if (req.body?.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

    const updated = await prisma.team.update({ where: { id }, data });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

/**
 * Sets a team's membership.
 *
 * Only people already in the firm can be added: an id from another firm is
 * rejected rather than silently ignored, so a mistake is visible.
 */
router.put('/:id/members', authenticate, async (req, res, next) => {
  try {
    if (!can(req.user!.role, 'MANAGE_TEAMS')) return forbidden(res, 'Only an admin can change team membership');

    const id = paramId(req.params.id);
    const firmId = req.user!.firmId;

    const team = await prisma.team.findFirst({ where: { id, firmId } });
    if (!team) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team not found', status: 404 } });

    const requested: string[] = Array.isArray(req.body?.userIds) ? req.body.userIds.map(String) : [];
    const unique = [...new Set(requested)];

    const firmMembers = await prisma.user.findMany({
      where: { id: { in: unique }, firmId, isActive: true },
      select: { id: true },
    });
    if (firmMembers.length !== unique.length) {
      const known = new Set(firmMembers.map((u) => u.id));
      const strangers = unique.filter((u) => !known.has(u));
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Only active members of this firm can join a team. Rejected: ${strangers.join(', ')}`,
          status: 422,
        },
      });
    }

    await prisma.$transaction([
      prisma.teamMember.deleteMany({ where: { teamId: id } }),
      prisma.teamMember.createMany({ data: unique.map((userId) => ({ teamId: id, userId })) }),
    ]);

    const refreshed = await prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: { select: MEMBER_FIELDS } } } },
    });

    res.json({
      success: true,
      data: { id, members: refreshed?.members.map((m) => m.user) ?? [] },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
