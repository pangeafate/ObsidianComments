// Unit test configuration for Hocuspocus - no database dependencies
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/server.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  testTimeout: 10000,
  
  // No setup files - pure unit tests with mocks only
  setupFiles: [],
  setupFilesAfterEnv: [],
  
  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  
  // Clear mocks between tests for clean TDD cycles
  clearMocks: true,
  restoreMocks: true,
  
  verbose: true
};