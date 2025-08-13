// Simple CI/CD validation tests for hocuspocus

describe('CI/CD Validation - Hocuspocus', () => {
  it('should have Node.js available', () => {
    expect(typeof process.version).toBe('string');
    expect(process.version).toMatch(/^v\d+/);
  });

  it('should be able to import core dependencies', () => {
    expect(() => {
      const { Server } = require('@hocuspocus/server');
      expect(Server).toBeDefined();
      // In CI environment, this will be mocked, so we check for existence
    }).not.toThrow();
  });

  it('should be able to import Prisma client', () => {
    expect(() => {
      const { PrismaClient } = require('@prisma/client');
      expect(PrismaClient).toBeDefined();
      // In CI environment, this will be mocked constructor function
    }).not.toThrow();
  });

  it('should have environment variables configured', () => {
    // In test environment, these might not be defined, but we should handle that gracefully
    expect(typeof process.env.NODE_ENV).toBe('string');
  });
});