// CI Test Setup - No external dependencies required
// This setup file ensures tests can run in CI environments without database connections

import './env-setup';

// Mock Prisma Client completely for CI tests
const mockPrismaInstance = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $queryRaw: jest.fn().mockResolvedValue([{ count: 1 }]),
  $transaction: jest.fn((fn) => typeof fn === 'function' ? fn({}) : Promise.resolve()),
  document: {
    create: jest.fn().mockResolvedValue({ 
      id: 'test-doc', 
      title: 'Test Document', 
      publishedAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    }),
    findUnique: jest.fn().mockResolvedValue({ 
      id: 'test-doc', 
      title: 'Test Document', 
      publishedAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    }),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ 
      id: 'test-doc', 
      title: 'Updated Document', 
      publishedAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    }),
    delete: jest.fn().mockResolvedValue({ id: 'test-doc' }),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0)
  },
  comment: {
    create: jest.fn().mockResolvedValue({ id: 'test-comment' }),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ id: 'test-comment' }),
    delete: jest.fn().mockResolvedValue({ id: 'test-comment' }),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 })
  },
  version: {
    create: jest.fn().mockResolvedValue({ id: 'test-version' }),
    findMany: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 })
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance)
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    flushAll: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
    isOpen: true,
    isReady: true
  }))
}));

// Mock WebSocket for CI
jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
    close: jest.fn()
  }))
}));

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.MOCK_EXTERNAL_SERVICES = 'true';
  
  // Suppress console logs in CI unless explicitly requested
  if (process.env.CI && !process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    // Keep console.error for debugging test failures
  }
});

afterAll(() => {
  // Clean up any lingering timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

export {};