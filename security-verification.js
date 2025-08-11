#!/usr/bin/env node

/**
 * SECURITY VERIFICATION SCRIPT
 * 
 * This script tests the XSS protection measures implemented in the application.
 * Run this after deploying to verify that XSS vulnerabilities have been properly fixed.
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:8081';
const XSS_TEST_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<svg/onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<div onclick="alert(\'XSS\')">Click me</div>',
  '"><script>alert("XSS")</script>',
  '<script>document.cookie="xss=true"</script>',
  'data:text/html,<script>alert("XSS")</script>',
  '<style>@import"javascript:alert(\'XSS\')"</style>'
];

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

async function testXSSProtection() {
  console.log('🔒 Starting XSS Protection Verification Tests...\n');
  console.log(`Testing against: ${API_BASE_URL}`);
  console.log(`Testing ${XSS_TEST_PAYLOADS.length} XSS payloads...\n`);

  for (let i = 0; i < XSS_TEST_PAYLOADS.length; i++) {
    const payload = XSS_TEST_PAYLOADS[i];
    console.log(`Test ${i + 1}/${XSS_TEST_PAYLOADS.length}: Testing payload: ${payload.substring(0, 50)}${payload.length > 50 ? '...' : ''}`);
    
    try {
      await testTitleXSS(payload);
      await testContentXSS(payload);
      console.log('✅ PASS: XSS payload properly sanitized\n');
      testResults.passed++;
    } catch (error) {
      console.error('❌ FAIL: XSS protection failed');
      console.error(`Error: ${error.message}\n`);
      testResults.failed++;
      testResults.errors.push({ payload, error: error.message });
    }
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('🔒 XSS PROTECTION VERIFICATION RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📊 Total Tests: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL SECURITY TESTS PASSED!');
    console.log('✅ XSS vulnerabilities have been successfully fixed.');
    process.exit(0);
  } else {
    console.log('\n⚠️  SECURITY VULNERABILITIES DETECTED!');
    console.log('❌ XSS protection is not working properly.');
    console.log('\nFailed tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. Payload: ${error.payload}`);
      console.log(`   Error: ${error.error}`);
    });
    process.exit(1);
  }
}

async function testTitleXSS(payload) {
  const testId = `xss-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Test title field XSS protection
    const response = await axios.post(`${API_BASE_URL}/api/notes/share`, {
      title: payload,
      content: 'Safe test content',
      shareId: testId
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (response.status === 201) {
      // Check if the response contains the XSS payload
      const responseData = JSON.stringify(response.data);
      
      if (responseData.includes('<script>') || 
          responseData.includes('javascript:') ||
          responseData.includes('onerror') ||
          responseData.includes('onload') ||
          responseData.includes('onclick')) {
        throw new Error('XSS payload found in API response - server-side sanitization failed');
      }

      // Verify the title was sanitized
      if (response.data.title && (
          response.data.title.includes('<script>') ||
          response.data.title.includes('javascript:') ||
          response.data.title.includes('onerror')
      )) {
        throw new Error('XSS payload found in title field - sanitization failed');
      }
    } else if (response.status >= 400) {
      // Request rejection is also acceptable security behavior
      console.log(`   Note: Request rejected with status ${response.status} (acceptable)`);
    }
  } catch (error) {
    if (error.response && error.response.status >= 400) {
      // Request rejection is acceptable
      console.log(`   Note: Request rejected with status ${error.response.status} (acceptable)`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server - is it running?');
    } else {
      throw error;
    }
  }
}

async function testContentXSS(payload) {
  const testId = `xss-test-content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Test HTML content field XSS protection
    const response = await axios.post(`${API_BASE_URL}/api/notes/share`, {
      title: 'Safe Title',
      content: 'Safe content',
      htmlContent: payload,
      shareId: testId
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (response.status === 201) {
      // Check if the response contains dangerous XSS payload
      const responseData = JSON.stringify(response.data);
      
      if (responseData.includes('<script>') || 
          responseData.includes('javascript:alert') ||
          responseData.includes('onerror=') ||
          responseData.includes('onload=')) {
        throw new Error('XSS payload found in HTML content response - server-side sanitization failed');
      }
    }
  } catch (error) {
    if (error.response && error.response.status >= 400) {
      // Request rejection is acceptable
      console.log(`   Note: HTML content request rejected with status ${error.response.status} (acceptable)`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server - is it running?');
    } else {
      throw error;
    }
  }
}

// Run the tests
testXSSProtection().catch(error => {
  console.error('\n💥 SECURITY VERIFICATION FAILED');
  console.error('Error:', error.message);
  process.exit(1);
});