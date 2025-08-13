// Hocuspocus CI Test Setup - No external dependencies required
import './env-setup';

// Mock Prisma Client for CI
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ count: 1 }]),
    $transaction: jest.fn((fn) => typeof fn === 'function' ? fn({}) : Promise.resolve()),
    document: {
      create: jest.fn().mockResolvedValue({ id: 'test-doc', content: 'test content' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'test-doc', content: 'test content' }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'test-doc', content: 'updated content' }),
      upsert: jest.fn().mockResolvedValue({ id: 'test-doc', content: 'upserted content' }),
      delete: jest.fn().mockResolvedValue({ id: 'test-doc' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 })
    },
    comment: {
      create: jest.fn().mockResolvedValue({ id: 'test-comment' }),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 })
    },
    version: {
      create: jest.fn().mockResolvedValue({ id: 'test-version' }),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 })
    }
  }))
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    isOpen: true,
    isReady: true
  }))
}));

// Mock Hocuspocus Server
jest.mock('@hocuspocus/server', () => ({
  Server: jest.fn(() => ({
    configure: jest.fn().mockReturnThis(),
    listen: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock Hocuspocus Extensions
jest.mock('@hocuspocus/extension-database', () => ({
  Database: jest.fn(() => ({}))
}));

jest.mock('@hocuspocus/extension-redis', () => ({
  Redis: jest.fn(() => ({}))
}));

jest.mock('@hocuspocus/extension-logger', () => ({
  Logger: jest.fn(() => ({}))
}));

jest.mock('@hocuspocus/extension-throttle', () => ({
  Throttle: jest.fn(() => ({}))
}));

// Mock Y.js
jest.mock('yjs', () => ({
  Doc: jest.fn(() => ({
    getText: jest.fn(() => ({
      toString: jest.fn(() => 'mocked content'),
      insert: jest.fn(),
      delete: jest.fn()
    })),
    transact: jest.fn((fn) => fn()),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

// Global test setup
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.MOCK_EXTERNAL_SERVICES = 'true';
  
  if (process.env.CI && !process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
});

export {};