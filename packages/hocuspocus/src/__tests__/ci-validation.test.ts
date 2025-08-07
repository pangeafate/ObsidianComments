// Simple CI/CD validation tests for hocuspocus
import './ci-setup';  // Use CI-specific setup instead of regular setup

describe('CI/CD Validation - Hocuspocus', () => {
  it('should have Node.js available', () => {
    expect(typeof process.version).toBe('string');
    expect(process.version).toMatch(/^v\d+/);
  });

  it('should be able to import core dependencies', () => {
    expect(() => {
      const { Hocuspocus } = require('@hocuspocus/server');
      expect(Hocuspocus).toBeDefined();
      expect(typeof Hocuspocus).toBe('function');
    }).not.toThrow();
  });

  it('should be able to import Prisma client', () => {
    expect(() => {
      const { PrismaClient } = require('@prisma/client');
      expect(PrismaClient).toBeDefined();
      expect(typeof PrismaClient).toBe('function');
    }).not.toThrow();
  });

  it('should have environment variables configured', () => {
    // In test environment, these might not be defined, but we should handle that gracefully
    expect(typeof process.env.NODE_ENV).toBe('string');
  });
});