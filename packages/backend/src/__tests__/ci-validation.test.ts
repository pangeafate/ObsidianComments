// Simple CI/CD validation tests that don't require external services

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
});