import pg from 'pg';
import { loadEnvFile, repoRootEnvPath } from './env-file.mjs';

loadEnvFile(repoRootEnvPath());

const devUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;

if (!devUrl || !testUrl) {
  console.error('DATABASE_URL and TEST_DATABASE_URL are required');
  process.exit(1);
}

const databaseName = new URL(testUrl).pathname.replace(/^\//, '');
if (!/^[a-z0-9_]+$/.test(databaseName)) {
  console.error('Refusing to create a database with an unexpected name');
  process.exit(1);
}

const client = new pg.Client({ connectionString: devUrl });
await client.connect();
try {
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    databaseName,
  ]);
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE ${databaseName}`);
  }
} finally {
  await client.end();
}
