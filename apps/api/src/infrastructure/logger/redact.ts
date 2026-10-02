const SENSITIVE_KEY =
  /password|token|secret|cookie|authorization|csrf|session|signedurl|storagekey|checksum/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(nested, depth + 1);
    }
    return output;
  }
  return value;
}
