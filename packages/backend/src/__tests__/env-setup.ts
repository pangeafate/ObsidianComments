// Test environment setup
// Set test database URL and disable external services for unit tests

process.env.NODE_ENV = 'test';

// Use CI environment variables if available, otherwise fallback to local test values
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:test_password@localhost:5432/obsidian_comments_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Mock external services for unit tests
process.env.MOCK_EXTERNAL_SERVICES = 'true';

// Import Redis mock
import './mocks/redis';