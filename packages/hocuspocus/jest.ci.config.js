module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/ci-validation.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/ci-setup.ts'],  // Use CI-specific setup
  testTimeout: 10000
};