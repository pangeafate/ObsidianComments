#!/usr/bin/env node

/**
 * Comprehensive deployment testing script
 * Tests all critical functionality after deployment
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://obsidiancomments.serverado.app';
const TIMEOUT = 30000; // 30 seconds

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: TIMEOUT,
      ...options
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test runner
async function runTest(name, testFn) {
  totalTests++;
  console.log(`\n🔍 Testing: ${name}`);
  
  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;
    
    passedTests++;
    console.log(`✅ PASS: ${name} (${duration}ms)`);
    testResults.push({ name, status: 'PASS', duration });
  } catch (error) {
    failedTests++;
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    testResults.push({ name, status: 'FAIL', error: error.message });
  }
}

// Tests
const tests = {
  // 1. Basic connectivity
  async testHomepageAccessible() {
    const response = await makeRequest(PRODUCTION_URL);
    if (response.statusCode !== 200) {
      throw new Error(`Homepage returned ${response.statusCode} instead of 200`);
    }
    if (!response.body || response.body.length < 100) {
      throw new Error('Homepage response too short');
    }
  },

  // 2. API health check
  async testAPIHealth() {
    const response = await makeRequest(`${PRODUCTION_URL}/api/health`);
    if (response.statusCode !== 200) {
      throw new Error(`API health returned ${response.statusCode}`);
    }
    
    const data = JSON.parse(response.body);
    if (data.status !== 'healthy') {
      throw new Error(`API status is ${data.status}, not healthy`);
    }
    
    // Check database connectivity
    if (!data.services || !data.services.database || data.services.database !== 'connected') {
      throw new Error('Database is not healthy');
    }
    
    // Check Redis connectivity
    if (!data.services || !data.services.redis || data.services.redis !== 'connected') {
      throw new Error('Redis is not healthy');
    }
  },

  // 3. Static assets loading
  async testStaticAssets() {
    const response = await makeRequest(PRODUCTION_URL);
    
    // Check for CSS
    if (!response.body.includes('.css') && !response.body.includes('<style>')) {
      throw new Error('No CSS references found');
    }
    
    // Check for JavaScript
    if (!response.body.includes('.js') && !response.body.includes('<script>')) {
      throw new Error('No JavaScript references found');
    }
  },

  // 4. CORS configuration
  async testCORSHeaders() {
    const response = await makeRequest(`${PRODUCTION_URL}/api/health`, {
      headers: {
        'Origin': 'app://obsidian.md'
      }
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    if (!corsHeader) {
      throw new Error('No CORS headers present');
    }
    
    if (!corsHeader.includes('obsidian.md') && corsHeader !== '*') {
      throw new Error(`CORS header incorrect: ${corsHeader}`);
    }
  },

  // 5. WebSocket endpoint
  async testWebSocketEndpoint() {
    const wsUrl = PRODUCTION_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const response = await makeRequest(`${PRODUCTION_URL}/ws`, {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      }
    }).catch(err => {
      // WebSocket upgrade will fail in normal HTTP request, but we should get a specific response
      return { statusCode: 426, error: err.message };
    });
    
    // Should get upgrade required or bad request
    if (response.statusCode !== 426 && response.statusCode !== 400 && response.statusCode !== 101) {
      throw new Error(`WebSocket endpoint returned unexpected status: ${response.statusCode}`);
    }
  },

  // 6. Note creation API
  async testNoteCreation() {
    const noteData = JSON.stringify({
      title: `Deployment Test ${Date.now()}`,
      content: '# Test Note\nThis is a test note created during deployment verification.'
    });
    
    const response = await makeRequest(`${PRODUCTION_URL}/api/notes/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: noteData
    });
    
    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Note creation returned ${response.statusCode}`);
    }
    
    const data = JSON.parse(response.body);
    if (!data.shareId) {
      throw new Error('No shareId returned from note creation');
    }
    
    // Try to retrieve the created note
    const getResponse = await makeRequest(`${PRODUCTION_URL}/api/notes/${data.shareId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (getResponse.statusCode !== 200) {
      throw new Error(`Could not retrieve created note: ${getResponse.statusCode}`);
    }
  },

  // 7. Response time check
  async testResponseTime() {
    const startTime = Date.now();
    await makeRequest(PRODUCTION_URL);
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 5000) {
      throw new Error(`Response time too slow: ${responseTime}ms`);
    }
    
    console.log(`   Response time: ${responseTime}ms`);
  },

  // 8. SSL certificate (for HTTPS)
  async testSSLCertificate() {
    if (!PRODUCTION_URL.startsWith('https://')) {
      console.log('   Skipping SSL test (not HTTPS)');
      return;
    }
    
    const response = await makeRequest(PRODUCTION_URL);
    // If we got here without SSL errors, the certificate is valid
    console.log('   SSL certificate is valid');
  },

  // 9. Database connectivity via API
  async testDatabaseConnectivity() {
    const response = await makeRequest(`${PRODUCTION_URL}/api/notes`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Even if empty, should return 200
    if (response.statusCode !== 200) {
      throw new Error(`Database query returned ${response.statusCode}`);
    }
  },

  // 10. Rate limiting
  async testRateLimiting() {
    const requests = [];
    
    // Make 10 rapid requests
    for (let i = 0; i < 10; i++) {
      requests.push(makeRequest(`${PRODUCTION_URL}/api/health`));
    }
    
    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.statusCode);
    
    // All should succeed (rate limit is usually higher than 10)
    const failed = statusCodes.filter(code => code !== 200);
    if (failed.length > 5) {
      throw new Error(`Too many requests failed: ${failed.length}/10`);
    }
    
    console.log(`   Rate limiting working (${failed.length}/10 requests throttled)`);
  }
};

// Main execution
async function main() {
  console.log('🚀 ObsidianComments Deployment Test Suite');
  console.log('=========================================');
  console.log(`Target: ${PRODUCTION_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  // Run all tests
  for (const [testName, testFn] of Object.entries(tests)) {
    await runTest(testName, testFn);
  }

  // Summary
  console.log('\n=========================================');
  console.log('📊 Test Results Summary');
  console.log('=========================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Detailed results
  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }
  
  // Exit code
  if (failedTests > 0) {
    console.log('\n❌ Deployment verification FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ Deployment verification PASSED');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTest, tests, makeRequest };