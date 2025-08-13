module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/ci-validation.test.ts',
    '**/__tests__/**/health-tdd.test.ts',
    '**/__tests__/**/validation.test.ts',
    '**/__tests__/**/html-sanitizer.test.ts',
    '**/__tests__/**/feature-flags.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  // Only use env setup, not database setup for CI validation
  setupFiles: ['<rootDir>/src/__tests__/env-setup.ts'],
  testTimeout: 10000,
  // No setupFilesAfterEnv to avoid database connection
  verbose: true
};