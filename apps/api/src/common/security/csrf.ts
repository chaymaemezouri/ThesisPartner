import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function createCsrfSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashCsrfSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function createCsrfToken(secret: string): string {
  const nonce = randomBytes(16).toString('base64url');
  const mac = createHmac('sha256', secret).update(nonce).digest('base64url');
  return `${nonce}.${mac}`;
}

export function verifyCsrfToken(secret: string, token: string | undefined): boolean {
  if (!secret || !token) return false;
  const separator = token.indexOf('.');
  if (separator <= 0) return false;

  const nonce = token.slice(0, separator);
  const mac = token.slice(separator + 1);
  const expected = createHmac('sha256', secret).update(nonce).digest('base64url');
  const actualBuffer = Buffer.from(mac);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
