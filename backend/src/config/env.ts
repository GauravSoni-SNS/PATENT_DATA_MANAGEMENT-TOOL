import dotenv from 'dotenv';
dotenv.config();

const rawFrontendUrls = process.env.FRONTEND_URL || 'http://localhost:5173';

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  frontendUrl: rawFrontendUrls.split(',')[0].trim(),
  /** FRONTEND_URL accepts a comma-separated list so Vercel preview domains work too. */
  frontendUrls: rawFrontendUrls.split(',').map((u) => u.trim()).filter(Boolean),
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  simulatedDate: process.env.SIMULATED_DATE || new Date().toISOString().split('T')[0],

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },

  /**
   * WhatsApp gateway (Visity by default). Field names are configurable so a
   * change of vendor, or of their payload shape, is an env edit rather than a
   * code change.
   */
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || '',
    apiKey: process.env.WHATSAPP_API_KEY || '',
    sender: process.env.WHATSAPP_SENDER || '',
    authHeader: process.env.WHATSAPP_AUTH_HEADER || 'Authorization',
    authScheme: process.env.WHATSAPP_AUTH_SCHEME ?? 'Bearer',
    toField: process.env.WHATSAPP_TO_FIELD || 'to',
    messageField: process.env.WHATSAPP_MESSAGE_FIELD || 'message',
    senderField: process.env.WHATSAPP_SENDER_FIELD || 'from',
  },
};
