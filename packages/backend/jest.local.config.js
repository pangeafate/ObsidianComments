// Jest configuration for local TDD development
// This configuration supports both mocked and test database modes

const path = require('path');

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
  
  // Choose setup based on TEST_MODE environment variable
  setupFilesAfterEnv: [
    process.env.TEST_MODE === 'integration' 
      ? '<rootDir>/src/__tests__/setup-integration.ts'
      : '<rootDir>/src/__tests__/setup-mocked.ts'
  ].filter(Boolean),
  
  // Test path configuration based on mode
  testPathIgnorePatterns: [
    '/node_modules/',
    // If running in mocked mode, ignore integration tests
    process.env.TEST_MODE !== 'integration' ? '/__tests__/.*\\.integration\\.test\\.ts$' : '',
    // If running in integration mode, ignore mocked-only tests
    process.env.TEST_MODE === 'integration' ? '/__tests__/.*\\.unit\\.test\\.ts$' : ''
  ].filter(Boolean),
  
  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};