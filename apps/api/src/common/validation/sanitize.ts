const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_DEPTH = 20;

export function collectUnsafeJson(value: unknown, depth = 0, path = 'body'): string[] {
  if (depth > MAX_DEPTH) return [`${path}:too_deep`];
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectUnsafeJson(item, depth + 1, `${path}.${index}`));
  }

  const found: string[] = [];
  for (const key of Object.keys(value)) {
    const next = `${path}.${key}`;
    if (BLOCKED_KEYS.has(key)) found.push(next);
    found.push(...collectUnsafeJson((value as Record<string, unknown>)[key], depth + 1, next));
  }
  return found;
}
