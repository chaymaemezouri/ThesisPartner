export function formatDay(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function daysSince(value: Date): number {
  const elapsed = Date.now() - value.getTime();
  return Math.max(0, Math.floor(elapsed / 86_400_000));
}

export function cleared(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
