/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 20000,
};
