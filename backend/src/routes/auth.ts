import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authenticate, signAccessToken, signRefreshToken } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required', status: 422 } });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials', status: 401 } });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials', status: 401 } });
    }

    const authUser = {
      id: user.id,
      firmId: user.firmId,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken(user.id);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          firmId: user.firmId,
          specialization: user.specialization,
          avatarUrl: user.avatarUrl,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No refresh token', status: 401 } });
    }
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } } });
    if (!stored) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token', status: 401 } });
    }
    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found', status: 401 } });
    }
    const authUser = {
      id: user.id,
      firmId: user.firmId,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    res.json({ success: true, data: { accessToken: signAccessToken(authUser) } });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, firmId: true, specialization: true, avatarUrl: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

export default router;
