import { redact } from './redact';

describe('redact', () => {
  it('removes secrets and keeps operational fields', () => {
    const safe = redact({
      requestId: 'abc',
      password: 'hunter2',
      sessionToken: 'raw-session',
      cookie: 'tp_session=abc',
      authorization: 'Bearer secret',
      nested: { csrfSecret: 'nope', route: '/api/v1/health' },
    }) as Record<string, unknown>;

    expect(safe.requestId).toBe('abc');
    expect(safe.password).toBe('[redacted]');
    expect(safe.sessionToken).toBe('[redacted]');
    expect(safe.cookie).toBe('[redacted]');
    expect(safe.authorization).toBe('[redacted]');
    expect((safe.nested as Record<string, unknown>).csrfSecret).toBe('[redacted]');
    expect((safe.nested as Record<string, unknown>).route).toBe('/api/v1/health');
    expect(JSON.stringify(safe)).not.toContain('hunter2');
    expect(JSON.stringify(safe)).not.toContain('raw-session');
  });
});
