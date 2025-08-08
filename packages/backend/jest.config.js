// Default Jest configuration - supports TDD development with mocked dependencies
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
  testTimeout: 15000,
  
  // Environment setup - loads .env.test
  setupFiles: ['<rootDir>/src/__tests__/env-setup.ts'],
  
  // Use mocked setup by default for TDD
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup-mocked.ts'],
  
  // Test path configuration
  testPathIgnorePatterns: [
    '/node_modules/',
    // By default, ignore integration tests that require real database
    '/__tests__/.*\\.integration\\.test\\.ts$'
  ],
  
  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  
  // Clear mocks between tests for clean TDD cycles
  clearMocks: true,
  restoreMocks: true,
  
  verbose: false
};