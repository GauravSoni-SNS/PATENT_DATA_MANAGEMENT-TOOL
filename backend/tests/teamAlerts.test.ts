import { describe, it, expect } from 'vitest';
import { evaluateMatterNotifications } from '../src/services/notificationService';
import { setSimulatedDate } from '../src/services/deadlineService';
import { can, permissionsFor } from '../src/services/permissions';

// describe bodies run during collection, before any hook, so the clock is set
// at module level rather than in beforeAll.
setSimulatedDate('2026-09-20');

const hearing = {
  id: 'd1',
  title: 'Hearing before the Trade Marks Registry',
  statutoryDueDate: new Date('2026-09-21'),
  status: 'PENDING',
};

const person = (first: string, extras: Record<string, unknown> = {}) => ({
  firstName: first,
  lastName: 'Test',
  email: `${first.toLowerCase()}@firm.test`,
  phone: '+919000000000',
  ...extras,
});

describe('alerts go to the whole team', () => {
  const alerts = evaluateMatterNotifications({
    id: 'm1',
    matterNumber: 'IN-6043666',
    title: 'G POLYPLAST hearing',
    team: {
      name: 'Trade Marks',
      members: [{ user: person('Asha') }, { user: person('Bhavin') }, { user: person('Chirag') }],
    },
    createdBy: person('Asha'),
    deadlines: [hearing],
  });

  it('tells every member, not only the person who added the matter', () => {
    const emails = alerts[0].recipients.map((r) => r.email).sort();
    expect(emails).toEqual(['asha@firm.test', 'bhavin@firm.test', 'chirag@firm.test']);
  });

  it('names the team on each recipient', () => {
    expect(alerts[0].recipients.every((r) => r.role === 'Trade Marks team')).toBe(true);
  });

  it('does not tell the same address twice when the uploader is also a member', () => {
    const emails = alerts[0].recipients.map((r) => r.email);
    expect(new Set(emails).size).toBe(emails.length);
  });
});

describe('backup contacts', () => {
  it('are included for team members who set one', () => {
    const alerts = evaluateMatterNotifications({
      id: 'm2',
      matterNumber: 'IN-7000000',
      title: 'With a backup',
      team: {
        name: 'Patents',
        members: [{ user: person('Deep', { altEmail: 'deep.backup@firm.test', altPhone: '+919000009999' }) }],
      },
      deadlines: [hearing],
    });
    const roles = alerts[0].recipients.map((r) => r.role);
    expect(roles).toContain('Patents team');
    expect(roles).toContain('Patents team backup');
  });
});

describe('a matter with no team yet', () => {
  it('falls back to whoever added it, so nothing goes unwatched', () => {
    const alerts = evaluateMatterNotifications({
      id: 'm3',
      matterNumber: 'IN-8000000',
      title: 'No team assigned',
      team: null,
      createdBy: person('Esha'),
      deadlines: [hearing],
    });
    expect(alerts[0].recipients.map((r) => r.email)).toEqual(['esha@firm.test']);
    expect(alerts[0].recipients[0].role).toBe('Matter owner');
  });
});

describe('permissions by designation', () => {
  it('lets only an admin manage teams', () => {
    expect(can('ADMIN', 'MANAGE_TEAMS')).toBe(true);
    expect(can('PARTNER', 'MANAGE_TEAMS')).toBe(false);
    expect(can('ATTORNEY', 'MANAGE_TEAMS')).toBe(false);
    expect(can('PARALEGAL', 'MANAGE_TEAMS')).toBe(false);
  });

  it('lets the working roles add matters', () => {
    for (const role of ['ADMIN', 'PARTNER', 'ATTORNEY', 'PARALEGAL']) {
      expect(can(role, 'ADD_MATTER'), `${role} should be able to add a matter`).toBe(true);
    }
  });

  it('reports the whole set for the UI', () => {
    expect(permissionsFor('PARALEGAL')).toMatchObject({ ADD_MATTER: true, MANAGE_TEAMS: false });
  });
});
