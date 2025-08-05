// Test environment setup
// Set test database URL and disable external services for unit tests

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/obsidian_comments_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Mock external services for unit tests
process.env.MOCK_EXTERNAL_SERVICES = 'true';