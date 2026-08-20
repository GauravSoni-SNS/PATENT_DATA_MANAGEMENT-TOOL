import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    console.error('Ensure PostgreSQL is running and DATABASE_URL is set in backend/.env');
    process.exit(1);
  }

  // 0.0.0.0 so container platforms (Render) can reach the port they assign.
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`LexPatent API listening on port ${env.port}`);
    console.log("Health: /api/v1/health");
  });
}

main();
