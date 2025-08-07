module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/ci-validation.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/ci-setup.ts'],  // Use CI-specific setup
  testTimeout: 10000,
  // Environment variables for testing
  setupFiles: ['<rootDir>/src/__tests__/env-setup.ts']
};