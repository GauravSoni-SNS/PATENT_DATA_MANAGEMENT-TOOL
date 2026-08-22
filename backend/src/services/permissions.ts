import { UserRole } from '@prisma/client';

/**
 * What each designation may do.
 *
 * Kept in one table rather than scattered across route guards, so the firm's
 * rules can be read and changed in a single place.
 */
export const PERMISSIONS = {
  /** Create and edit teams, and decide who is on them. */
  MANAGE_TEAMS: ['ADMIN'] as UserRole[],
  /** Add a matter, which is what triggers alerts for its team. */
  ADD_MATTER: ['ADMIN', 'PARTNER', 'ATTORNEY', 'PARALEGAL'] as UserRole[],
  /** Change the firm's alert schedule and channels. */
  MANAGE_ALERT_SETTINGS: ['ADMIN', 'PARTNER'] as UserRole[],
  /** Change another member's contact numbers. Everyone may change their own. */
  MANAGE_MEMBER_CONTACTS: ['ADMIN', 'PARTNER'] as UserRole[],
  /** Clear or extend a statutory deadline. */
  CLEAR_DEADLINE: ['ADMIN', 'PARTNER', 'ATTORNEY'] as UserRole[],
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

export function can(role: string | undefined, permission: PermissionName): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as string[]).includes(role);
}

/** The permission set for one role, for the UI to hide what it cannot do. */
export function permissionsFor(role: string | undefined): Record<PermissionName, boolean> {
  const result = {} as Record<PermissionName, boolean>;
  (Object.keys(PERMISSIONS) as PermissionName[]).forEach((name) => {
    result[name] = can(role, name);
  });
  return result;
}
