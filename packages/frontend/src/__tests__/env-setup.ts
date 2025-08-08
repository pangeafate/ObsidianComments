// Frontend test environment setup
// Load .env.test file and configure test environment variables

import path from 'path';
import fs from 'fs';

// Load .env.test file if it exists
const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  require('dotenv').config({ path: envTestPath });
  console.log('✅ Frontend: Loaded .env.test configuration');
} else {
  console.log('⚠️  Frontend: No .env.test file found, using fallback values');
}

// Ensure test environment is set
process.env.NODE_ENV = 'test';

// Use loaded environment variables or fallback to test values
process.env.VITE_API_URL = process.env.VITE_API_URL || 'http://localhost:8081';
process.env.VITE_WS_URL = process.env.VITE_WS_URL || 'ws://localhost:8081/ws';
process.env.VITE_HOCUSPOCUS_URL = process.env.VITE_HOCUSPOCUS_URL || 'ws://localhost:8082';

// Test-specific configurations
process.env.VITE_APP_NAME = process.env.VITE_APP_NAME || 'ObsidianComments Test';
process.env.VITE_ENABLE_DEV_TOOLS = process.env.VITE_ENABLE_DEV_TOOLS || 'true';
process.env.VITE_ENABLE_ANALYTICS = process.env.VITE_ENABLE_ANALYTICS || 'false';
process.env.VITE_MOCK_EXTERNAL_SERVICES = process.env.VITE_MOCK_EXTERNAL_SERVICES || 'true';

console.log('✅ Frontend test environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  VITE_API_URL: process.env.VITE_API_URL,
  VITE_WS_URL: process.env.VITE_WS_URL,
  VITE_MOCK_EXTERNAL_SERVICES: process.env.VITE_MOCK_EXTERNAL_SERVICES
});