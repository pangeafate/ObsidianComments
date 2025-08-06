import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:test_password@localhost:5432/obsidian_comments_test'
    }
  }
});

beforeAll(async () => {
  // Clean up test database
  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.version.deleteMany(),
    prisma.document.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterEach(async () => {
  // Clean up after each test
  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.version.deleteMany(),
    prisma.document.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };

// Dummy test to satisfy Jest requirement
describe('Hocuspocus Test Setup', () => {
  it('should configure test environment correctly', () => {
    expect(process.env.NODE_ENV).not.toBe('production');
  });
});