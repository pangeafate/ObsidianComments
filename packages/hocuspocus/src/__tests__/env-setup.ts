// Hocuspocus test environment setup
// Load .env.test file and configure test environment variables

import path from 'path';
import fs from 'fs';

// Load .env.test file if it exists
const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  require('dotenv').config({ path: envTestPath });
  console.log('✅ Hocuspocus: Loaded .env.test configuration');
} else {
  console.log('⚠️  Hocuspocus: No .env.test file found, using fallback values');
}

// Ensure test environment is set
process.env.NODE_ENV = 'test';

// Use loaded environment variables or fallback to test values
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:test_password@localhost:5432/obsidian_comments_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';

// Test-specific configurations
process.env.PORT = process.env.PORT || '8082';
process.env.MOCK_EXTERNAL_SERVICES = process.env.MOCK_EXTERNAL_SERVICES || 'true';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.DISABLE_LOGS = process.env.DISABLE_LOGS || 'true';

// Hocuspocus-specific configurations
process.env.HOCUSPOCUS_SECRET = process.env.HOCUSPOCUS_SECRET || 'test-hocuspocus-secret';
process.env.WEBSOCKET_TIMEOUT = process.env.WEBSOCKET_TIMEOUT || '5000';
process.env.MAX_CONNECTIONS = process.env.MAX_CONNECTIONS || '100';

console.log('✅ Hocuspocus test environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]',
  REDIS_URL: process.env.REDIS_URL ? '[CONFIGURED]' : '[NOT SET]',
  PORT: process.env.PORT,
  MOCK_EXTERNAL_SERVICES: process.env.MOCK_EXTERNAL_SERVICES
});