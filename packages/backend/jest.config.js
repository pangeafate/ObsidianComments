module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
  // Environment variables for testing
  setupFiles: ['<rootDir>/src/__tests__/env-setup.ts'],
  // Ignore database integration tests in CI until DB is properly configured
  testPathIgnorePatterns: [
    '/node_modules/',
    process.env.CI && !process.env.DATABASE_URL ? '/__tests__/.*\\.integration\\.test\\.ts$' : ''
  ].filter(Boolean)
};