/** Prints what the seed actually put in the database. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, role: true, phone: true } });
  const clients = await prisma.client.findMany({ select: { name: true, contactEmail: true, contactPhone: true } });
  const matters = await prisma.matter.count();
  const deadlines = await prisma.deadline.count();
  const receipts = await prisma.receipt.count();

  console.log(`users ${users.length} | clients ${clients.length} | matters ${matters} | deadlines ${deadlines} | receipts ${receipts}`);
  for (const u of users) {
    console.log(`  ${u.role.padEnd(10)} ${u.email.padEnd(32)} ${u.phone ?? 'NO PHONE'}`);
  }
  console.log(`client contacts with phone: ${clients.filter((c) => c.contactPhone).length}/${clients.length}`);
  await prisma.$disconnect();
}

main();
