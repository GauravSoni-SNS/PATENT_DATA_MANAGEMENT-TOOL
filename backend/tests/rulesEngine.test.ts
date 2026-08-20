import { describe, it, expect, beforeAll } from 'vitest';
import { calculateDeadlines, generateDeadlinesForStage, addMonths, addDays } from '../src/services/rulesEngine';
import { calculateDaysRemaining, getUrgencyTier, setSimulatedDate } from '../src/services/deadlineService';

describe('Rules Engine', () => {
  it('computes 12-month priority bar', () => {
    const deadlines = calculateDeadlines('PROVISIONAL_FILED', '2025-08-20', 'IN');
    const bar = deadlines.find((d) => d.ruleId === 'CONVENTION_12M_BAR');
    expect(bar?.statutoryDueDate).toBe('2026-08-20');
  });

  it('computes FER response with extension', () => {
    const deadlines = calculateDeadlines('FER_OA_ISSUED', '2026-02-23', 'IN');
    const fer = deadlines.find((d) => d.ruleId === 'FER_RESPONSE_DUE');
    expect(fer?.statutoryDueDate).toBe('2026-08-23');
    expect(fer?.extendedDueDate).toBe('2026-11-23');
  });

  it('computes 15-day hearing submission', () => {
    const deadlines = calculateDeadlines('HEARING_SCHEDULED', '2026-08-16', 'IN');
    const hearing = deadlines.find((d) => d.ruleId === 'HEARING_WRITTEN_SUBMISSION');
    expect(hearing?.statutoryDueDate).toBe('2026-08-31');
  });

  it('generates deadlines for PROVISIONAL stage', () => {
    const deadlines = generateDeadlinesForStage('PROVISIONAL', '2025-09-02', '2025-09-02', 'IN');
    expect(deadlines.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Deadline Service', () => {
  beforeAll(() => setSimulatedDate('2026-08-18'));

  it('classifies 2 days as DAILY_CRITICAL', () => {
    expect(getUrgencyTier(2).key).toBe('DAILY_CRITICAL');
  });

  it('classifies 5 days as T_5_CRITICAL', () => {
    expect(getUrgencyTier(5).key).toBe('T_5_CRITICAL');
  });

  it('classifies 15 days as T_15_URGENT', () => {
    expect(getUrgencyTier(15).key).toBe('T_15_URGENT');
  });

  it('calculates days remaining correctly', () => {
    expect(calculateDaysRemaining('2026-08-20')).toBe(2);
    expect(calculateDaysRemaining('2026-08-23')).toBe(5);
  });
});
