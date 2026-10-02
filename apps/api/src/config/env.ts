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
  SMTP_FROM: z.preprocess(
    emptyToUndefined,
    z.string().min(3).max(320).default('ThesisPartner <noreply@thesispartner.local>'),
  ),
  S3_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().default('http://127.0.0.1:9000')),
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
  FILE_SCAN_MODE: z.preprocess(emptyToUndefined, z.enum(['stub']).default('stub')),
});

export type Env = z.infer<typeof schema>;
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
    SMTP_FROM: source.SMTP_FROM,
    S3_ENDPOINT: source.S3_ENDPOINT,
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
  });

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.') || 'env').join(', ');
    throw new Error(`Invalid environment: ${fields}`);
  }

  return result.data;
}
