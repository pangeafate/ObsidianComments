module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*-tdd.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup-mock.ts'],
  setupFiles: ['<rootDir>/src/__tests__/env-setup.ts'],
  testTimeout: 10000,
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};