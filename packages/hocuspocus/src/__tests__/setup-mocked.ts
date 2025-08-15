// Mocked setup for Hocuspocus TDD development
// This setup uses mocks instead of real database connections for fast, isolated tests

// Mock PrismaClient to avoid database connection attempts
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ version: 'PostgreSQL 15.0' }]),
    $transaction: jest.fn().mockImplementation(async (ops) => {
      if (Array.isArray(ops)) {
        return ops.map(() => ({ count: 0 }));
      }
      return ops();
    }),
    comment: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    version: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    document: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockImplementation((data) => Promise.resolve({
        id: 'test-doc-id-' + Date.now(),
        shareId: data?.data?.shareId || 'test-share-id-' + Date.now(),
        title: data?.data?.title || 'Test Document',
        content: data?.data?.content || '',
        htmlContent: data?.data?.htmlContent || null,
        yjsState: data?.data?.yjsState || Buffer.from([]),
        metadata: data?.data?.metadata || {},
        source: data?.data?.source || 'hocuspocus',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        version: 1
      })),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn()
    },
    user: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }))
}));

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn(),
    on: jest.fn()
  }))
}));

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.MOCK_EXTERNAL_SERVICES = 'true';
  
  console.log('✅ Hocuspocus test environment configured with mocks (TDD mode)');
});

beforeEach(() => {
  // Clear all mocks before each test for clean state
  jest.clearAllMocks();
  
  // Reset any module mocks
  jest.resetModules();
});

afterAll(() => {
  // Cleanup after all tests
  console.log('✅ Hocuspocus mocked test environment cleaned up');
});

// Create a mock Prisma client instance for tests that need it
export const mockPrisma = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $queryRaw: jest.fn().mockResolvedValue([{ version: 'PostgreSQL 15.0' }]),
  $transaction: jest.fn().mockImplementation(async (ops) => {
    if (Array.isArray(ops)) {
      return ops.map(() => ({ count: 0 }));
    }
    return ops();
  }),
  comment: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  version: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  document: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    create: jest.fn().mockImplementation((data) => Promise.resolve({
      id: 'test-doc-id-' + Date.now(),
      shareId: data?.data?.shareId || 'test-share-id-' + Date.now(),
      title: data?.data?.title || 'Test Document',
      content: data?.data?.content || '',
      htmlContent: data?.data?.htmlContent || null,
      yjsState: data?.data?.yjsState || Buffer.from([]),
      metadata: data?.data?.metadata || {},
      source: data?.data?.source || 'hocuspocus',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      version: 1
    })),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn()
  },
  user: {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

export const prisma = mockPrisma;

// Dummy test to satisfy Jest requirement
describe('Hocuspocus Mocked Test Setup', () => {
  it('should configure mocked test environment correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.MOCK_EXTERNAL_SERVICES).toBe('true');
  });
});