module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup-ci.ts'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '!**/__tests__/**/*.integration.test.ts' // Skip integration tests in CI
  ],
  collectCoverage: true,
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/index.ts' // Skip entry point
  ],
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 1,
  // Fast CI configuration
  bail: false,
  verbose: false
};