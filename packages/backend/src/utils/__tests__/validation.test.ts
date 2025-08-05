import { 
  validateDocumentData, 
  validatePublishData, 
  sanitizeInput,
  isValidUUID,
  ValidationError 
} from '../validation';

describe('validation utils', () => {
  describe('validateDocumentData', () => {
    it('should validate correct document data', () => {
      const validData = {
        title: 'Test Document',
        content: 'This is test content'
      };

      expect(() => validateDocumentData(validData)).not.toThrow();
    });

    it('should throw error for missing title', () => {
      const invalidData = {
        content: 'This is test content'
      };

      expect(() => validateDocumentData(invalidData)).toThrow(ValidationError);
    });

    it('should throw error for missing content', () => {
      const invalidData = {
        title: 'Test Document'
      };

      expect(() => validateDocumentData(invalidData)).toThrow(ValidationError);
    });

    it('should throw error for empty title', () => {
      const invalidData = {
        title: '',
        content: 'This is test content'
      };

      expect(() => validateDocumentData(invalidData)).toThrow(ValidationError);
    });

    it('should throw error for title too long', () => {
      const invalidData = {
        title: 'x'.repeat(201),
        content: 'This is test content'
      };

      expect(() => validateDocumentData(invalidData)).toThrow(ValidationError);
    });
  });

  describe('validatePublishData', () => {
    it('should validate correct publish data', () => {
      const validData = {
        title: 'Test Document',
        content: 'This is test content',
        metadata: { author: 'Test Author' }
      };

      expect(() => validatePublishData(validData)).not.toThrow();
    });

    it('should validate without metadata', () => {
      const validData = {
        title: 'Test Document',
        content: 'This is test content'
      };

      expect(() => validatePublishData(validData)).not.toThrow();
    });

    it('should throw error for invalid metadata', () => {
      const invalidData = {
        title: 'Test Document',
        content: 'This is test content',
        metadata: 'invalid metadata'
      };

      expect(() => validatePublishData(invalidData)).toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace from input', () => {
      const result = sanitizeInput('  hello world  ');
      expect(result).toBe('hello world');
    });

    it('should remove potential XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = sanitizeInput(maliciousInput);
      expect(result).not.toContain('<script>');
    });

    it('should handle empty input', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = sanitizeInput(null);
      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = sanitizeInput(undefined);
      expect(result).toBe('');
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUID v4', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(isValidUUID(validUUID)).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidUUID = 'not-a-uuid';
      expect(isValidUUID(invalidUUID)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidUUID('')).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidUUID(null as any)).toBe(false);
    });

    it('should reject UUID with wrong length', () => {
      const shortUUID = '123e4567-e89b-12d3-a456';
      expect(isValidUUID(shortUUID)).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with message', () => {
      const error = new ValidationError('Test error message');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('ValidationError');
    });

    it('should be instance of Error', () => {
      const error = new ValidationError('Test error');
      expect(error).toBeInstanceOf(Error);
    });
  });
});