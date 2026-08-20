import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/validate';
import authRoutes from './routes/auth';
import mattersRoutes from './routes/matters';
import rulesRoutes from './routes/rules';
import receiptsRoutes from './routes/receipts';
import verificationsRoutes, { deadlinesRouter } from './routes/verifications';
import notificationsRoutes from './routes/notifications';
import dashboardRoutes from './routes/dashboard';
import clientsRoutes from './routes/clients';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        // no Origin header: curl, health checks, same-origin requests
        if (!origin || env.frontendUrls.includes(origin)) return callback(null, true);
        // Deny by omitting the header rather than throwing, so a stray origin
        // is a browser-side CORS block and not a 500 in the API logs.
        return callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use('/uploads', express.static(path.resolve(env.uploadDir)));

  app.get('/api/v1/health', async (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/matters', mattersRoutes);
  app.use('/api/v1/matters', deadlinesRouter);
  app.use('/api/v1/rules', rulesRoutes);
  app.use('/api/v1/receipts', receiptsRoutes);
  app.use('/api/v1/verifications', verificationsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/clients', clientsRoutes);

  app.use(errorHandler);
  return app;
}
