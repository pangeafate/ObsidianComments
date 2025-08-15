// Hocuspocus Jest configuration for TDD development
const path = require('path');
const fs = require('fs');

// Load .env.test file if it exists
const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  require('dotenv').config({ path: envTestPath });
}

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
  
  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  
  // Clear mocks between tests for clean TDD cycles
  clearMocks: true,
  restoreMocks: true,
  
  verbose: false
};