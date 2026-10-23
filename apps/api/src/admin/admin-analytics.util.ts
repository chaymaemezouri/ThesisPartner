/** Calendar day YYYY-MM-DD in UTC. */
export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** First day of month YYYY-MM-01 in UTC. */
export function toMonthKey(date: Date): string {
  return `${date.toISOString().slice(0, 7)}-01`;
}

export function daysAgo(days: number, from = new Date()): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

export function fillDailySeries(
  fromInclusive: Date,
  toExclusive: Date,
  counts: Map<string, number>,
): { date: string; count: number }[] {
  const points: { date: string; count: number }[] = [];
  const cursor = new Date(
    Date.UTC(
      fromInclusive.getUTCFullYear(),
      fromInclusive.getUTCMonth(),
      fromInclusive.getUTCDate(),
    ),
  );
  const end = new Date(
    Date.UTC(toExclusive.getUTCFullYear(), toExclusive.getUTCMonth(), toExclusive.getUTCDate()),
  );
  while (cursor < end) {
    const key = toDayKey(cursor);
    points.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

const SENSITIVE_METADATA_KEYS = new Set([
  'token',
  'password',
  'passwordHash',
  'tokenHash',
  'csrf',
  'secret',
  'authorization',
  'cookie',
]);

/** Drop secrets from audit metadata before Super Admin display. */
export function sanitizeAuditMetadata(metadata: unknown): Record<string, unknown> | null {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (SENSITIVE_METADATA_KEYS.has(key.toLowerCase()) || /token|secret|password|hash/i.test(key)) {
      continue;
    }
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = sanitizeAuditMetadata(value);
      if (nested) result[key] = nested;
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else if (value === null) {
      result[key] = null;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** Actions considered platform usage for analytics (no scientific payloads). */
export const ADMIN_ACTIVITY_ACTIONS = [
  'auth.register',
  'auth.login',
  'auth.logout',
  'auth.login_failed',
  'invitation.created',
  'invitation.accepted',
  'invitation.rejected',
  'invitation.cancelled',
  'invitation.resent',
  'invitation.supervisor_change_created',
  'supervision.replaced',
  'membership.create',
  'admin.user_suspend',
  'admin.user_reactivate',
  'admin.bootstrap_super_admin',
] as const;
