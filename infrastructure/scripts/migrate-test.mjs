import { spawnSync } from 'node:child_process';
import { loadEnvFile, repoRootEnvPath } from './env-file.mjs';

loadEnvFile(repoRootEnvPath());

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error('TEST_DATABASE_URL is required');
  process.exit(1);
}

const result = spawnSync(
  'npm',
  ['exec', '-w', '@thesispartner/api', '--', 'prisma', 'migrate', 'deploy'],
  {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testUrl },
    shell: true,
  },
);

process.exit(result.status ?? 1);
