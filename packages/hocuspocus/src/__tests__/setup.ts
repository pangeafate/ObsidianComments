import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:test_password@localhost:5432/obsidian_comments_test'
    }
  }
});

beforeAll(async () => {
  // Try to connect and clean up test database
  try {
    await prisma.$connect();
    await prisma.$transaction([
      prisma.comment.deleteMany(),
      prisma.version.deleteMany(),
      prisma.document.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  } catch (error) {
    console.warn('⚠️ Database not available for cleanup, tests may use mocks');
  }
});

afterEach(async () => {
  // Clean up after each test if database is available
  try {
    await prisma.$transaction([
      prisma.comment.deleteMany(),
      prisma.version.deleteMany(),
      prisma.document.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  } catch (error) {
    // Silently skip cleanup if database is not available
  }
});

afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Silently handle disconnect errors
  }
});

export { prisma };

// Dummy test to satisfy Jest requirement
describe('Hocuspocus Test Setup', () => {
  it('should configure test environment correctly', () => {
    expect(process.env.NODE_ENV).not.toBe('production');
  });
});