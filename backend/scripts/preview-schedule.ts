/**
 * Shows which alerts each schedule would raise for the current data.
 * Read-only: it transmits nothing and writes nothing.
 */
import { PrismaClient } from '@prisma/client';
import { decideAlert, scheduleDays, AlertScheduleId } from '../src/services/alertSchedule';
import { calculateDaysRemaining } from '../src/services/deadlineService';

const prisma = new PrismaClient();
const LEAD = parseInt(process.env.ALERT_LEAD_DAYS || '10', 10);

async function main() {
  const deadlines = await prisma.deadline.findMany({
    where: { status: { in: ['PENDING', 'WAITING_VERIFICATION'] } },
    include: { matter: { select: { matterNumber: true } } },
  });

  const rows = deadlines
    .map((d) => ({
      matter: d.matter.matterNumber,
      title: d.title.slice(0, 44),
      days: calculateDaysRemaining(d.statutoryDueDate),
    }))
    .sort((a, b) => a.days - b.days);

  for (const schedule of ['EVE_OF', 'HALVING', 'DAILY'] as AlertScheduleId[]) {
    const firing = rows.filter((r) => decideAlert(r.days, schedule, LEAD));
    console.log(`\n${schedule}  (fires at T-${scheduleDays(schedule, LEAD).join(', T-')})`);
    console.log(`  would alert today: ${firing.length} of ${rows.length} open deadlines`);
    for (const r of firing) {
      const label = decideAlert(r.days, schedule, LEAD)!.tierLabel;
      console.log(`    T-${String(r.days).padStart(3)}  ${r.matter.padEnd(20)} ${label}`);
    }
  }

  console.log('\nAll open deadlines:');
  for (const r of rows) console.log(`  T-${String(r.days).padStart(3)}  ${r.matter.padEnd(20)} ${r.title}`);

  await prisma.$disconnect();
}

main();
