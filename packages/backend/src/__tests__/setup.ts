import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'file:./test.db'
    }
  }
});

beforeAll(async () => {
  // Set up test environment
  process.env.FRONTEND_URL = 'http://localhost:5173';
  
  // Create the database schema
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      publishedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      yjsState BLOB
    )
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot BLOB NOT NULL,
      metadata TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdBy TEXT,
      message TEXT,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
      UNIQUE(documentId, version)
    )
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      threadId TEXT,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      resolved BOOLEAN DEFAULT FALSE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      position TEXT,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    )
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      displayName TEXT,
      color TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
});

beforeEach(async () => {
  // Clean up data between tests
  try {
    await prisma.comment.deleteMany({});
    await prisma.version.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (error) {
    // Ignore errors if tables don't exist
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