// Simple CI/CD validation tests that don't require external services
// This test file runs WITHOUT database/redis connections for CI environments

// Mock PrismaClient to avoid database connection attempts
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    comment: { deleteMany: jest.fn() },
    version: { deleteMany: jest.fn() },
    document: { deleteMany: jest.fn() },
    user: { deleteMany: jest.fn() }
  }))
}));

describe('CI/CD Validation', () => {
  it('should have correct environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.REDIS_URL).toBeDefined();
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  it('should be able to import main modules', () => {
    expect(() => require('../utils/validation')).not.toThrow();
    expect(() => require('../utils/errors')).not.toThrow();
  });

  it('should validate basic data correctly', () => {
    const { validateDocumentData } = require('../utils/validation');
    
    const validData = {
      title: 'Test Title',
      content: 'Test Content'
    };
    
    expect(() => validateDocumentData(validData)).not.toThrow();
  });

  it('should reject invalid data', () => {
    const { validateDocumentData } = require('../utils/validation');
    
    const invalidData = {
      title: '', // Empty title should fail
      content: 'Test Content'
    };
    
    expect(() => validateDocumentData(invalidData)).toThrow();
  });

  it('should be able to import app module without errors', () => {
    // Test that the app can be imported without throwing due to missing env vars
    expect(() => {
      const app = require('../app');
      expect(app).toBeDefined();
    }).not.toThrow();
  });
});