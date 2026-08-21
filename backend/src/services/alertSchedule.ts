import { NotificationTier } from '@prisma/client';

/**
 * When an alert fires, as opposed to what it says.
 *
 * The team's problem is missed hearing dates, not a shortage of notifications,
 * so the schedule is deliberately separate from the message: it decides which
 * days produce an alert at all, and can be swapped without touching content.
 */
export type AlertScheduleId = 'EVE_OF' | 'HALVING' | 'DAILY';

export interface AlertDecision {
  tier: NotificationTier;
  tierLabel: string;
  isEmergency: boolean;
}

/**
 * Repeated halving from the lead time: 10 -> 5 -> 2 -> 1 -> 0.
 * Each step floors, and 0 (the day itself) always closes the sequence.
 */
export function halvingDays(leadDays: number): number[] {
  const days = new Set<number>();
  let current = Math.floor(leadDays);
  while (current >= 1) {
    days.add(current);
    current = Math.floor(current / 2);
  }
  days.add(0);
  return [...days].sort((a, b) => b - a);
}

export const SCHEDULES: Record<AlertScheduleId, { label: string; description: string; fires(days: number, leadDays: number): boolean }> = {
  EVE_OF: {
    label: 'Day before and day of',
    description: 'One alert the day before the deadline, one on the day itself.',
    fires: (days) => days === 1 || days === 0,
  },
  HALVING: {
    label: 'Halving countdown',
    description: 'Alerts at the lead time then each halving of it, ending on the day itself.',
    fires: (days, leadDays) => halvingDays(leadDays).includes(days),
  },
  DAILY: {
    label: 'Daily inside the lead time',
    description: 'An alert every day from the lead time until the deadline.',
    fires: (days, leadDays) => days >= 0 && days <= leadDays,
  },
};

function label(days: number): AlertDecision {
  if (days < 0) {
    return {
      tier: 'DAILY_COUNTDOWN',
      tierLabel: `OVERDUE BY ${Math.abs(days)} DAY${Math.abs(days) === 1 ? '' : 'S'}`,
      isEmergency: true,
    };
  }
  if (days === 0) return { tier: 'DAILY_COUNTDOWN', tierLabel: 'DUE TODAY', isEmergency: true };
  if (days === 1) return { tier: 'DAILY_COUNTDOWN', tierLabel: 'DUE TOMORROW', isEmergency: true };
  if (days <= 5) return { tier: 'T_5_CRITICAL', tierLabel: `${days} DAYS REMAINING`, isEmergency: true };
  if (days <= 15) return { tier: 'T_15_URGENT', tierLabel: `${days} DAYS REMAINING`, isEmergency: false };
  return { tier: 'T_30_ADVISORY', tierLabel: `${days} DAYS REMAINING`, isEmergency: false };
}

/**
 * Returns the alert to raise for a deadline that is `days` away, or null for a
 * quiet day. An overdue deadline always alerts, under every schedule: silence
 * after a missed date is the failure this tool exists to prevent.
 */
export function decideAlert(
  days: number,
  schedule: AlertScheduleId,
  leadDays: number
): AlertDecision | null {
  if (days < 0) return label(days);
  const plan = SCHEDULES[schedule] ?? SCHEDULES.EVE_OF;
  return plan.fires(days, leadDays) ? label(days) : null;
}

/** The days this schedule will fire on, for showing the plan in the UI. */
export function scheduleDays(schedule: AlertScheduleId, leadDays: number): number[] {
  if (schedule === 'EVE_OF') return [1, 0];
  if (schedule === 'HALVING') return halvingDays(leadDays);
  return Array.from({ length: leadDays + 1 }, (_, i) => leadDays - i);
}
