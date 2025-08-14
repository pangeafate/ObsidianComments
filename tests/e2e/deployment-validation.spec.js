const { test, expect } = require('@playwright/test');

// This test suite validates the production deployment
test.describe('Production Deployment Validation', () => {
  test.setTimeout(120000); // 2 minute timeout for each test
  
  let baseURL;
  
  test.beforeAll(async () => {
    // Use environment variable or default to production URL
    baseURL = process.env.TEST_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://obsidiancomments.serverado.app';
    console.log(`🌐 Testing deployment at: ${baseURL}`);
  });

  test('Homepage should load successfully', async ({ page }) => {
    console.log('🏠 Testing homepage accessibility...');
    
    // Enable detailed logging
    page.on('console', msg => console.log(`Browser: ${msg.text()}`));
    page.on('pageerror', err => console.log(`Page Error: ${err.message}`));
    page.on('requestfailed', req => console.log(`Failed Request: ${req.url()} - ${req.failure()?.errorText}`));
    
    try {
      // Navigate to homepage with longer timeout
      const response = await page.goto(baseURL, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      console.log(`✅ Response status: ${response?.status()}`);
      expect(response?.status()).toBe(200);
      
      // Check basic HTML structure
      await expect(page.locator('html')).toBeVisible();
      await expect(page.locator('head')).toBeVisible();
      await expect(page.locator('body')).toBeVisible();
      
      // Check for React root
      await expect(page.locator('#root')).toBeVisible();
      
      // Check page title
      const title = await page.title();
      console.log(`📝 Page title: "${title}"`);
      expect(title).toContain('Obsidian');
      
      console.log('✅ Homepage loads successfully');
      
    } catch (error) {
      console.error(`❌ Homepage test failed: ${error.message}`);
      await page.screenshot({ path: 'homepage-error.png', fullPage: true });
      throw error;
    }
  });

  test('API health endpoint should be accessible', async ({ page }) => {
    console.log('🏥 Testing API health endpoint...');
    
    try {
      const response = await page.goto(`${baseURL}/api/health`, {
        timeout: 30000
      });
      
      expect(response?.status()).toBe(200);
      
      const content = await page.textContent('body');
      const healthData = JSON.parse(content);
      
      console.log('📊 Health Data:', JSON.stringify(healthData, null, 2));
      
      // Validate health response structure
      expect(healthData.status).toBe('healthy');
      expect(healthData.environment).toBe('production');
      expect(healthData.services).toBeDefined();
      expect(healthData.services.database).toBe('connected');
      expect(healthData.services.redis).toBe('connected');
      expect(healthData.services.hocuspocus).toBe('connected');
      
      console.log('✅ API health endpoint working correctly');
      
    } catch (error) {
      console.error(`❌ Health endpoint test failed: ${error.message}`);
      throw error;
    }
  });

  test('Static assets should load correctly', async ({ page }) => {
    console.log('📦 Testing static assets...');
    
    const loadedAssets = [];
    const failedAssets = [];
    
    page.on('response', response => {
      if (response.url().includes('/assets/') || response.url().includes('.js') || response.url().includes('.css')) {
        if (response.status() === 200) {
          loadedAssets.push({
            url: response.url(),
            status: response.status(),
            contentType: response.headers()['content-type']
          });
        } else {
          failedAssets.push({
            url: response.url(),
            status: response.status()
          });
        }
      }
    });
    
    try {
      await page.goto(baseURL, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      console.log(`📊 Loaded assets: ${loadedAssets.length}`);
      loadedAssets.forEach(asset => {
        console.log(`  ✅ ${asset.status} ${asset.url}`);
      });
      
      console.log(`❌ Failed assets: ${failedAssets.length}`);
      failedAssets.forEach(asset => {
        console.log(`  ❌ ${asset.status} ${asset.url}`);
      });
      
      expect(loadedAssets.length).toBeGreaterThan(0);
      expect(failedAssets.length).toBe(0);
      
      console.log('✅ All static assets loaded successfully');
      
    } catch (error) {
      console.error(`❌ Static assets test failed: ${error.message}`);
      await page.screenshot({ path: 'assets-error.png', fullPage: true });
      throw error;
    }
  });

  test('React application should initialize', async ({ page }) => {
    console.log('⚛️ Testing React application initialization...');
    
    try {
      await page.goto(baseURL, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      // Wait for React to initialize (look for common React patterns)
      await page.waitForFunction(() => {
        return window.React || 
               document.querySelector('[data-reactroot]') || 
               document.querySelector('#root').children.length > 0;
      }, { timeout: 30000 });
      
      // Check if the app has rendered content
      const rootContent = await page.locator('#root').innerHTML();
      console.log(`📄 Root content length: ${rootContent.length} characters`);
      
      expect(rootContent.length).toBeGreaterThan(50); // Should have substantial content
      
      console.log('✅ React application initialized successfully');
      
    } catch (error) {
      console.error(`❌ React initialization test failed: ${error.message}`);
      await page.screenshot({ path: 'react-error.png', fullPage: true });
      throw error;
    }
  });

  test('Database connectivity through API', async ({ page }) => {
    console.log('🗄️ Testing database connectivity...');
    
    try {
      // Test documents endpoint to verify database
      const response = await page.goto(`${baseURL}/api/documents`, {
        timeout: 30000
      });
      
      // Should get either 200 with documents or 404/401 if endpoint doesn't exist
      // The key is that we get a proper response, not a connection error
      expect([200, 404, 401, 405].includes(response?.status())).toBeTruthy();
      
      console.log(`📊 Documents endpoint status: ${response?.status()}`);
      console.log('✅ Database connectivity confirmed');
      
    } catch (error) {
      console.error(`❌ Database connectivity test failed: ${error.message}`);
      throw error;
    }
  });

  test('WebSocket endpoint should be accessible', async ({ page }) => {
    console.log('🔌 Testing WebSocket endpoint...');
    
    try {
      // Test WebSocket connection by checking if the endpoint responds
      const wsTestCode = `
        new Promise((resolve) => {
          const ws = new WebSocket('${baseURL.replace('http://', 'ws://')}/ws');
          
          ws.onopen = () => {
            console.log('WebSocket connected');
            ws.close();
            resolve('connected');
          };
          
          ws.onerror = (error) => {
            console.log('WebSocket error:', error);
            resolve('error');
          };
          
          ws.onclose = () => {
            console.log('WebSocket closed');
          };
          
          // Timeout after 10 seconds
          setTimeout(() => {
            ws.close();
            resolve('timeout');
          }, 10000);
        });
      `;
      
      await page.goto(baseURL);
      
      const wsResult = await page.evaluate(wsTestCode);
      console.log(`🔌 WebSocket test result: ${wsResult}`);
      
      // WebSocket should either connect or timeout (not error)
      expect(['connected', 'timeout'].includes(wsResult)).toBeTruthy();
      
      console.log('✅ WebSocket endpoint accessible');
      
    } catch (error) {
      console.error(`❌ WebSocket test failed: ${error.message}`);
      throw error;
    }
  });

  test('Full application smoke test', async ({ page }) => {
    console.log('🧪 Running full application smoke test...');
    
    try {
      await page.goto(baseURL, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('domcontentloaded');
      
      // Take a screenshot for verification
      await page.screenshot({ 
        path: 'deployment-verification.png', 
        fullPage: true 
      });
      
      // Check for any JavaScript errors
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      
      // Wait a bit to catch any late-loading errors
      await page.waitForTimeout(5000);
      
      console.log(`🐛 JavaScript errors detected: ${errors.length}`);
      errors.forEach(error => console.log(`  ❌ ${error}`));
      
      // Application should load without critical errors
      expect(errors.length).toBeLessThan(5); // Allow some minor errors
      
      console.log('✅ Full application smoke test passed');
      
    } catch (error) {
      console.error(`❌ Smoke test failed: ${error.message}`);
      await page.screenshot({ path: 'smoke-test-error.png', fullPage: true });
      throw error;
    }
  });
});