import { describe, it, expect } from 'vitest';
import { decideAlert, halvingDays, scheduleDays } from '../src/services/alertSchedule';

const LEAD = 10;

describe('EVE_OF schedule', () => {
  it('fires the day before and the day itself', () => {
    expect(decideAlert(1, 'EVE_OF', LEAD)?.tierLabel).toBe('DUE TOMORROW');
    expect(decideAlert(0, 'EVE_OF', LEAD)?.tierLabel).toBe('DUE TODAY');
  });

  it('stays quiet on every other day before the deadline', () => {
    for (const days of [2, 3, 5, 7, 10, 15, 30, 90]) {
      expect(decideAlert(days, 'EVE_OF', LEAD)).toBeNull();
    }
  });

  it('still alerts once the deadline has passed', () => {
    expect(decideAlert(-1, 'EVE_OF', LEAD)?.tierLabel).toBe('OVERDUE BY 1 DAY');
    expect(decideAlert(-4, 'EVE_OF', LEAD)?.tierLabel).toBe('OVERDUE BY 4 DAYS');
    expect(decideAlert(-1, 'EVE_OF', LEAD)?.isEmergency).toBe(true);
  });
});

describe('HALVING schedule', () => {
  it('halves the lead time down to the day itself', () => {
    expect(halvingDays(10)).toEqual([10, 5, 2, 1, 0]);
  });

  it('fires only on those days', () => {
    for (const days of [10, 5, 2, 1, 0]) {
      expect(decideAlert(days, 'HALVING', LEAD), `expected an alert at T-${days}`).not.toBeNull();
    }
    for (const days of [9, 8, 7, 6, 4, 3]) {
      expect(decideAlert(days, 'HALVING', LEAD), `expected silence at T-${days}`).toBeNull();
    }
  });

  it('handles other lead times', () => {
    expect(halvingDays(30)).toEqual([30, 15, 7, 3, 1, 0]);
    expect(halvingDays(1)).toEqual([1, 0]);
  });
});

describe('DAILY schedule', () => {
  it('fires every day inside the lead time', () => {
    for (let days = LEAD; days >= 0; days -= 1) {
      expect(decideAlert(days, 'DAILY', LEAD), `expected an alert at T-${days}`).not.toBeNull();
    }
  });

  it('stays quiet outside the lead time', () => {
    expect(decideAlert(LEAD + 1, 'DAILY', LEAD)).toBeNull();
  });
});

describe('scheduleDays', () => {
  it('describes the plan for the UI', () => {
    expect(scheduleDays('EVE_OF', 10)).toEqual([1, 0]);
    expect(scheduleDays('HALVING', 10)).toEqual([10, 5, 2, 1, 0]);
    expect(scheduleDays('DAILY', 3)).toEqual([3, 2, 1, 0]);
  });
});
