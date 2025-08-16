module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '!**/__tests__/setup*.ts',
    '!**/__tests__/env-setup.ts',
    '!**/__tests__/mocks/**'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  setupFiles: ['<rootDir>/src/__tests__/env-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  bail: true, // Stop on first test failure
  maxWorkers: 1 // Run tests sequentially for consistency
};
