import { UrgencyTier } from '@prisma/client';
import { env } from '../config/env';

export interface UrgencyInfo {
  key: string;
  label: string;
  badgeClass: string;
  color: string;
  priority: number;
}

let simulatedDate = env.simulatedDate;

export function setSimulatedDate(date: string) {
  simulatedDate = date;
}

export function getSimulatedDate(): string {
  return simulatedDate;
}

export function calculateDaysRemaining(targetDate: Date | string): number {
  const current = new Date(simulatedDate);
  const target = new Date(targetDate);
  const diffTime = target.getTime() - current.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getUrgencyTier(daysRemaining: number): UrgencyInfo {
  if (daysRemaining < 0) {
    return { key: 'OVERDUE', label: 'DEADLINE LAPSED / OVERDUE', badgeClass: 'badge-overdue', color: '#ef4444', priority: 1 };
  }
  if (daysRemaining <= 4) {
    return { key: 'DAILY_CRITICAL', label: `T-${daysRemaining}d DAILY COUNTDOWN`, badgeClass: 'badge-daily-critical', color: '#dc2626', priority: 2 };
  }
  if (daysRemaining <= 5) {
    return { key: 'T_5_CRITICAL', label: '5-DAY RED CRITICAL ALERT', badgeClass: 'badge-critical-5d', color: '#f87171', priority: 3 };
  }
  if (daysRemaining <= 15) {
    return { key: 'T_15_URGENT', label: `${daysRemaining}d URGENT WARNING`, badgeClass: 'badge-urgent-15d', color: '#f97316', priority: 4 };
  }
  if (daysRemaining <= 30) {
    return { key: 'T_30_ADVISORY', label: `${daysRemaining}d 30-Day Advisory`, badgeClass: 'badge-advisory-30d', color: '#eab308', priority: 5 };
  }
  return { key: 'SAFE_UPCOMING', label: `${daysRemaining}d (Safe)`, badgeClass: 'badge-safe', color: '#10b981', priority: 6 };
}

export function urgencyKeyToEnum(key: string): UrgencyTier {
  const map: Record<string, UrgencyTier> = {
    SAFE_UPCOMING: 'SAFE_UPCOMING',
    T_30_ADVISORY: 'T_30_ADVISORY',
    T_15_URGENT: 'T_15_URGENT',
    T_5_CRITICAL: 'T_5_CRITICAL',
    DAILY_CRITICAL: 'DAILY_CRITICAL',
    OVERDUE: 'OVERDUE',
  };
  return map[key] || 'SAFE_UPCOMING';
}

interface DeadlineLike {
  id: string;
  status: string;
  statutoryDueDate: Date | string;
  title: string;
  ruleId: string;
  isStatutoryBar?: boolean;
}

export function enrichDeadlines<T extends DeadlineLike>(deadlines: T[]) {
  const active = deadlines.filter((d) => d.status === 'PENDING' || d.status === 'WAITING_VERIFICATION');
  if (active.length === 0) {
    return {
      nearestDeadline: null,
      daysRemaining: null,
      urgency: { key: 'COMPLETED', label: 'All Deadlines Cleared', badgeClass: 'badge-completed', color: '#06b6d4', priority: 7 },
    };
  }
  const sorted = [...active].sort(
    (a, b) => new Date(a.statutoryDueDate).getTime() - new Date(b.statutoryDueDate).getTime()
  );
  const nearest = sorted[0];
  const days = calculateDaysRemaining(nearest.statutoryDueDate);
  const urgency = getUrgencyTier(days);
  return { nearestDeadline: nearest, daysRemaining: days, urgency };
}

export function computeDeadlineFields(statutoryDueDate: Date | string) {
  const days = calculateDaysRemaining(statutoryDueDate);
  const urgency = getUrgencyTier(days);
  const status = days < 0 ? 'OVERDUE' : undefined;
  return {
    daysRemaining: days,
    urgencyTier: urgencyKeyToEnum(urgency.key),
    overdueStatus: status,
  };
}
