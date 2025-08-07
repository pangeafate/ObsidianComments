import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:test_password@localhost:5432/obsidian_comments_test'
    }
  }
});

beforeAll(async () => {
  // Set up test environment
  process.env.FRONTEND_URL = 'http://localhost:5173';
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Test database connected successfully');
  } catch (error) {
    console.warn('⚠️ Database connection failed, tests may not work properly:', error instanceof Error ? error.message : 'Unknown error');
  }
});

beforeEach(async () => {
  // Clean up data between tests if database is available
  try {
    await prisma.comment.deleteMany({});
    await prisma.version.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (error) {
    // Silently skip cleanup if database is not available
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };

// Dummy test to satisfy Jest requirement
describe('Test Setup', () => {
  it('should configure test environment correctly', () => {
    expect(process.env.NODE_ENV).not.toBe('production');
  });
});