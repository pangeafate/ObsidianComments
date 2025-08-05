// Mock test setup that doesn't require database
// For pure unit tests of route logic

beforeAll(async () => {
  // Set up test environment
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.MOCK_EXTERNAL_SERVICES = 'true';
});

// Mock Prisma for unit tests
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    document: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(5),
    },
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ test: 1 }]),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock Redis for unit tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
}));

// Dummy test to satisfy Jest requirement
describe('Test Setup - Mock', () => {
  it('should configure mock test environment correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.MOCK_EXTERNAL_SERVICES).toBe('true');
  });
});