import { createCsrfSecret, createCsrfToken, hashCsrfSecret, verifyCsrfToken } from './csrf';

describe('csrf', () => {
  it('accepts a token created for the same secret and rejects tampering', () => {
    const secret = createCsrfSecret();
    const token = createCsrfToken(secret);

    expect(verifyCsrfToken(secret, token)).toBe(true);
    expect(verifyCsrfToken(secret, `${token}x`)).toBe(false);
    expect(verifyCsrfToken(createCsrfSecret(), token)).toBe(false);
    expect(verifyCsrfToken(secret, undefined)).toBe(false);
    expect(hashCsrfSecret(secret)).not.toBe(secret);
  });
});
