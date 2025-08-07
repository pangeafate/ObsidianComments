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
  
  // Test database connection - MUST succeed for tests to run
  await prisma.$connect();
  console.log('✅ Test database connected successfully');
});

beforeEach(async () => {
  // Clean up data between tests - database MUST be available
  await prisma.comment.deleteMany({});
  await prisma.version.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.user.deleteMany({});
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