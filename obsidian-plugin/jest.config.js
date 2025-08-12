module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__', '<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/api-client.ts': {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90
    },
    './src/share-manager.ts': {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90
    },
    './src/main.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/settings.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^obsidian$': '<rootDir>/__mocks__/obsidian.ts'
  },
  testTimeout: 10000,
  verbose: true,
  bail: false,
  watchPathIgnorePatterns: ['<rootDir>/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(obsidian)/)'
  ]
};