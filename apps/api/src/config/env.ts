import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  value === undefined || value === '' ? undefined : value;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url(),
  API_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(3000)),
  DATABASE_URL: z.string().startsWith('postgres'),
  REDIS_URL: z.string().startsWith('redis'),
  LOG_LEVEL: z.enum(['silent', 'info', 'warn', 'error']).default('info'),
  TRUST_PROXY: z.preprocess(
    (value) => (value === undefined || value === '' ? 'false' : value),
    z.enum(['true', 'false']).transform((value) => value === 'true'),
  ),
  RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100_000).default(100),
  ),
  RATE_LIMIT_TTL_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1000).max(3_600_000).default(60_000),
  ),
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().min(1).max(255).optional()),
  SMTP_PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(65535).default(1025),
  ),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().min(1).max(320).optional()),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().min(1).max(256).optional()),
  SMTP_SECURE: z.preprocess(
    (value) => (value === undefined || value === '' ? 'false' : value),
    z.enum(['true', 'false']).transform((value) => value === 'true'),
  ),
  SMTP_FROM: z.preprocess(
    emptyToUndefined,
    z.string().min(3).max(320).default('ThesisPartner <noreply@thesispartner.local>'),
  ),
  S3_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().default('http://127.0.0.1:9000')),
  S3_PUBLIC_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  S3_REGION: z.preprocess(emptyToUndefined, z.string().min(1).max(64).default('us-east-1')),
  S3_BUCKET: z.preprocess(emptyToUndefined, z.string().min(3).max(63).default('thesispartner')),
  S3_ACCESS_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).max(128).default('thesispartner'),
  ),
  S3_SECRET_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).max(256).default('thesispartner-secret'),
  ),
  S3_FORCE_PATH_STYLE: z.preprocess(
    (value) => (value === undefined || value === '' ? 'true' : value),
    z.enum(['true', 'false']).transform((value) => value === 'true'),
  ),
  SIGNED_URL_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(30).max(3600).default(300),
  ),
  MAX_UPLOAD_SIZE_MB: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(512).default(50),
  ),
  UPLOAD_RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(10_000).default(20),
  ),
  UPLOAD_RATE_LIMIT_TTL_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1000).max(3_600_000).default(60_000),
  ),
  FILE_SCAN_MODE: z.preprocess(emptyToUndefined, z.enum(['stub', 'allow']).default('stub')),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(10).max(200).optional()),
  OPENAI_MODEL: z.preprocess(emptyToUndefined, z.string().min(1).max(80).default('gpt-4o-mini')),
  /** Optional. Promotes this existing account to SUPER_ADMIN when none exists yet. */
  SUPER_ADMIN_BOOTSTRAP_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email().max(320).optional(),
  ),
  PAYMENT_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['none', 'mock']).optional()),
  MOCK_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).max(128).optional()),
  MOCK_PAYMENT_SCENARIO: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        'success',
        'decline',
        'cancel',
        'pending',
        'delayed',
        'duplicate',
        'out_of_order',
        'refund',
        'renewal_fail',
      ])
      .default('success'),
  ),
});

export type Env = Omit<z.infer<typeof schema>, 'PAYMENT_PROVIDER' | 'MOCK_WEBHOOK_SECRET'> & {
  PAYMENT_PROVIDER: 'none' | 'mock';
  MOCK_WEBHOOK_SECRET?: string;
};
export type LogLevel = Env['LOG_LEVEL'];

export const ENV = Symbol('ENV');

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = schema.safeParse({
    NODE_ENV: source.NODE_ENV,
    APP_URL: source.APP_URL,
    API_PORT: source.API_PORT,
    DATABASE_URL: source.DATABASE_URL,
    REDIS_URL: source.REDIS_URL,
    LOG_LEVEL: source.LOG_LEVEL,
    TRUST_PROXY: source.TRUST_PROXY,
    RATE_LIMIT_MAX: source.RATE_LIMIT_MAX,
    RATE_LIMIT_TTL_MS: source.RATE_LIMIT_TTL_MS,
    SMTP_HOST: source.SMTP_HOST,
    SMTP_PORT: source.SMTP_PORT,
    SMTP_USER: source.SMTP_USER,
    SMTP_PASS: source.SMTP_PASS,
    SMTP_SECURE: source.SMTP_SECURE,
    SMTP_FROM: source.SMTP_FROM,
    S3_ENDPOINT: source.S3_ENDPOINT,
    S3_PUBLIC_URL: source.S3_PUBLIC_URL,
    S3_REGION: source.S3_REGION,
    S3_BUCKET: source.S3_BUCKET,
    S3_ACCESS_KEY: source.S3_ACCESS_KEY,
    S3_SECRET_KEY: source.S3_SECRET_KEY,
    S3_FORCE_PATH_STYLE: source.S3_FORCE_PATH_STYLE,
    SIGNED_URL_TTL_SECONDS: source.SIGNED_URL_TTL_SECONDS,
    MAX_UPLOAD_SIZE_MB: source.MAX_UPLOAD_SIZE_MB,
    UPLOAD_RATE_LIMIT_MAX: source.UPLOAD_RATE_LIMIT_MAX,
    UPLOAD_RATE_LIMIT_TTL_MS: source.UPLOAD_RATE_LIMIT_TTL_MS,
    FILE_SCAN_MODE: source.FILE_SCAN_MODE,
    OPENAI_API_KEY: source.OPENAI_API_KEY,
    OPENAI_MODEL: source.OPENAI_MODEL,
    SUPER_ADMIN_BOOTSTRAP_EMAIL: source.SUPER_ADMIN_BOOTSTRAP_EMAIL,
    PAYMENT_PROVIDER: source.PAYMENT_PROVIDER,
    MOCK_WEBHOOK_SECRET: source.MOCK_WEBHOOK_SECRET,
    MOCK_PAYMENT_SCENARIO: source.MOCK_PAYMENT_SCENARIO,
  });

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.') || 'env').join(', ');
    throw new Error(`Invalid environment: ${fields}`);
  }

  const data = result.data;
  const smtpHost =
    data.SMTP_HOST ?? (data.NODE_ENV === 'development' ? '127.0.0.1' : data.SMTP_HOST);
  const provider = data.PAYMENT_PROVIDER ?? (data.NODE_ENV === 'production' ? 'none' : 'mock');
  if (data.NODE_ENV === 'production' && provider === 'mock') {
    throw new Error('Invalid environment: PAYMENT_PROVIDER');
  }
  let mockSecret = data.MOCK_WEBHOOK_SECRET;
  if (provider === 'mock' && !mockSecret) {
    if (data.NODE_ENV === 'production') {
      throw new Error('Invalid environment: MOCK_WEBHOOK_SECRET');
    }
    mockSecret = 'dev-mock-webhook-secret';
  }

  return {
    ...data,
    SMTP_HOST: smtpHost,
    PAYMENT_PROVIDER: provider,
    MOCK_WEBHOOK_SECRET: mockSecret,
  };
}
