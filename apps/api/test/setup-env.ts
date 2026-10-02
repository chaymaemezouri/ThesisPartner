process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:5173';
process.env.API_PORT = '3010';
process.env.LOG_LEVEL = 'silent';
process.env.TRUST_PROXY = 'false';
process.env.RATE_LIMIT_MAX = '10000';
process.env.RATE_LIMIT_TTL_MS = '60000';
process.env.UPLOAD_RATE_LIMIT_MAX = '10000';
process.env.UPLOAD_RATE_LIMIT_TTL_MS = '60000';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required');
}

process.env.DATABASE_URL = testDatabaseUrl;

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is required');
}
