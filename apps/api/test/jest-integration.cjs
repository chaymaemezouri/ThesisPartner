/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000,
  maxWorkers: 1,
};
