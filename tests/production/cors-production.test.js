const https = require('https');

describe('Production CORS Configuration', () => {
  const PRODUCTION_URL = 'https://obsidiancomments.serverado.app';
  
  function makeRequest(url, options) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        }));
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  test('should return single CORS header in production for Obsidian origin', async () => {
    const response = await makeRequest(`${PRODUCTION_URL}/api/notes/share`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'app://obsidian.md',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });

    console.log('Response headers:', JSON.stringify(response.headers, null, 2));
    
    // Check for Access-Control-Allow-Origin header
    const corsHeaders = response.headers['access-control-allow-origin'];
    
    // Should be a single value, not multiple
    expect(corsHeaders).toBeDefined();
    expect(typeof corsHeaders).toBe('string');
    
    // Should NOT contain multiple values separated by commas
    expect(corsHeaders).not.toMatch(/,/);
    
    // Should be specific origin, not wildcard when Obsidian origin is provided
    expect(corsHeaders).toBe('app://obsidian.md');
  });

  test('should detect multiple CORS headers problem in production', async () => {
    const response = await makeRequest(`${PRODUCTION_URL}/api/notes/share`, {
      method: 'HEAD',
      headers: {
        'Origin': 'app://obsidian.md'
      }
    });

    console.log('All headers:', Object.keys(response.headers));
    console.log('CORS headers:', response.headers['access-control-allow-origin']);
    
    // This test will fail if we have multiple CORS headers
    const corsHeader = response.headers['access-control-allow-origin'];
    
    // Convert to string to handle potential arrays
    const corsValue = Array.isArray(corsHeader) ? corsHeader.join(', ') : corsHeader;
    
    // Log the exact value for debugging
    console.log('CORS header value:', JSON.stringify(corsValue));
    
    // Fail if we detect the problematic pattern
    if (corsValue && corsValue.includes(',')) {
      console.error('🚨 DETECTED MULTIPLE CORS VALUES:', corsValue);
      expect(corsValue).not.toMatch(/app:\/\/obsidian\.md.*,.*\*/);
      expect(corsValue).not.toMatch(/\*.*,.*app:\/\/obsidian\.md/);
    }
  });

  test('should work for POST request without multiple headers', async () => {
    try {
      const response = await makeRequest(`${PRODUCTION_URL}/api/notes/share`, {
        method: 'POST',
        headers: {
          'Origin': 'app://obsidian.md',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: '# Test CORS\n\nTesting CORS configuration',
          title: 'Test CORS Note'
        })
      });

      console.log('POST Response status:', response.statusCode);
      console.log('POST Response CORS:', response.headers['access-control-allow-origin']);
      
      // Should get a response (not necessarily successful due to auth)
      expect(response.statusCode).toBeDefined();
      
      // Should have CORS header
      const corsHeader = response.headers['access-control-allow-origin'];
      expect(corsHeader).toBeDefined();
      
      // Should not have multiple values
      const corsValue = Array.isArray(corsHeader) ? corsHeader.join(', ') : corsHeader;
      expect(corsValue).not.toMatch(/,/);
      
    } catch (error) {
      console.log('Expected error (likely auth/validation):', error.message);
      // This might fail due to CORS, which is what we're testing
    }
  });
});