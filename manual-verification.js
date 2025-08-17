#!/usr/bin/env node

const BASE_URL = 'http://138.197.187.49';
const API_URL = `${BASE_URL}/api`;

async function testAPI() {
  console.log('🧪 Running Manual Production Verification Tests');
  console.log('================================================\n');

  let passed = 0;
  let failed = 0;

  function logTest(name, success, details = '') {
    if (success) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}: ${details}`);
      failed++;
    }
  }

  // Test 1: Health endpoints
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthText = await healthResponse.text();
    logTest('Frontend health endpoint', healthResponse.ok && healthText === 'healthy');
  } catch (error) {
    logTest('Frontend health endpoint', false, error.message);
  }

  try {
    const apiHealthResponse = await fetch(`${API_URL}/health`);
    const apiHealthData = await apiHealthResponse.json();
    logTest('API health endpoint', apiHealthResponse.ok && apiHealthData.status === 'healthy');
    console.log(`   Database: ${apiHealthData.services?.database || 'unknown'}`);
    console.log(`   Redis: ${apiHealthData.services?.redis || 'unknown'}`);
  } catch (error) {
    logTest('API health endpoint', false, error.message);
  }

  // Test 2: Document creation
  try {
    const createResponse = await fetch(`${API_URL}/notes/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Verification Test',
        content: '# Test Document\\n\\nThis is a test document for verification.'
      })
    });
    const createData = await createResponse.json();
    
    if (createResponse.ok && createData.shareId) {
      logTest('Document creation', true);
      console.log(`   Created document: ${createData.shareId}`);
      
      // Test 3: Document retrieval
      try {
        const getResponse = await fetch(`${API_URL}/notes/${createData.shareId}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        const noteData = await getResponse.json();
        
        logTest('Document retrieval', getResponse.ok && noteData.title === 'Verification Test');
        console.log(`   Retrieved title: ${noteData.title}`);
      } catch (error) {
        logTest('Document retrieval', false, error.message);
      }
    } else {
      logTest('Document creation', false, createData.error || 'Unknown error');
    }
  } catch (error) {
    logTest('Document creation', false, error.message);
  }

  // Test 4: CORS headers
  try {
    const corsResponse = await fetch(`${API_URL}/health`, {
      headers: { 'Origin': 'http://localhost' }
    });
    const corsHeaders = corsResponse.headers;
    logTest('CORS headers present', corsHeaders.get('access-control-allow-origin') !== null);
  } catch (error) {
    logTest('CORS headers present', false, error.message);
  }

  // Test 5: Security headers
  try {
    const securityResponse = await fetch(BASE_URL);
    const headers = securityResponse.headers;
    logTest('Security headers', 
      headers.get('x-frame-options') !== null || 
      headers.get('x-content-type-options') !== null
    );
  } catch (error) {
    logTest('Security headers', false, error.message);
  }

  // Summary
  console.log('\\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\\n🎉 All tests passed! Production deployment is working correctly.');
  } else {
    console.log('\\n⚠️  Some tests failed. Please check the deployment.');
  }

  return failed === 0;
}

// Run if called directly
if (require.main === module) {
  testAPI().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { testAPI };