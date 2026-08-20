import dotenv from 'dotenv';
dotenv.config();

const rawFrontendUrls = process.env.FRONTEND_URL || "http://localhost:5173";

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  frontendUrl: rawFrontendUrls.split(",")[0].trim(),
  /** FRONTEND_URL accepts a comma-separated list so Vercel preview domains work too. */
  frontendUrls: rawFrontendUrls.split(",").map((u) => u.trim()).filter(Boolean),
  isProduction: (process.env.NODE_ENV || "development") === "production",
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  simulatedDate: process.env.SIMULATED_DATE || new Date().toISOString().split('T')[0],
};
