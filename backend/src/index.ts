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

  app.listen(env.port, () => {
    console.log(`LexPatent API running at http://localhost:${env.port}`);
    console.log(`Health: http://localhost:${env.port}/api/v1/health`);
  });
}

main();
