import { parseEnv } from './env';

const valid = {
  APP_URL: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://thesispartner:thesispartner@localhost:5432/thesispartner',
  REDIS_URL: 'redis://localhost:6379',
};

describe('parseEnv', () => {
  it('applies defaults for a minimal valid environment', () => {
    const env = parseEnv(valid);
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.RATE_LIMIT_MAX).toBe(100);
    expect(env.MAX_UPLOAD_SIZE_MB).toBe(50);
    expect(env.SIGNED_URL_TTL_SECONDS).toBe(300);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.SMTP_HOST).toBe('127.0.0.1');
    expect(env.SMTP_SECURE).toBe(false);
    expect(env.S3_PUBLIC_URL).toBeUndefined();
    expect(env.FILE_SCAN_MODE).toBe('stub');
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.OPENAI_MODEL).toBe('gpt-4o-mini');
    expect(env.PAYMENT_PROVIDER).toBe('mock');
    expect(env.MOCK_PAYMENT_SCENARIO).toBe('success');
  });

  it('rejects mock payments in production', () => {
    expect(() =>
      parseEnv({
        ...valid,
        NODE_ENV: 'production',
        PAYMENT_PROVIDER: 'mock',
        MOCK_WEBHOOK_SECRET: 'dev-mock-webhook-secret',
      }),
    ).toThrow(/PAYMENT_PROVIDER/);
  });

  it('defaults production to no payment provider', () => {
    const env = parseEnv({ ...valid, NODE_ENV: 'production' });
    expect(env.PAYMENT_PROVIDER).toBe('none');
    expect(env.SMTP_HOST).toBeUndefined();
  });

  it('rejects a missing database url without echoing secrets', () => {
    expect(() =>
      parseEnv({
        APP_URL: 'http://localhost:5173',
        REDIS_URL: 'redis://localhost:6379',
        DATABASE_URL: 'mysql://user:super-secret@localhost/db',
      }),
    ).toThrow(/DATABASE_URL/);

    try {
      parseEnv({
        APP_URL: 'http://localhost:5173',
        REDIS_URL: 'redis://localhost:6379',
        DATABASE_URL: 'mysql://user:super-secret@localhost/db',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain('super-secret');
    }
  });

  it('rejects an empty environment', () => {
    expect(() => parseEnv({})).toThrow(/Invalid environment/);
  });
});
