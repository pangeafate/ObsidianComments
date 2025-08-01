// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
export const testUtils = {
  // Generate a test token
  generateTestToken: (userId: string) => {
    return `test-token-${userId}`;
  },
  
  // Create test timestamps
  timestamp: () => new Date().toISOString(),
  
  // Test data factory
  createTestNote: (overrides = {}) => ({
    id: 'test-note-id',
    content: '# Test Note\n\nThis is a test note.',
    shareId: 'test-share-id',
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};