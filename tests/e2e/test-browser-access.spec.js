const { test, expect } = require('@playwright/test');

test.describe('Production Site Accessibility', () => {
  test.setTimeout(60000); // 60 second timeout

  test('Site should be reachable via browser', async ({ page }) => {
    console.log('🌐 Testing site accessibility...');
    
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.log('Page error:', err.message));
    page.on('requestfailed', req => console.log('Failed request:', req.url(), req.failure()?.errorText));
    
    try {
      // Test 1: Basic connectivity
      console.log('📡 Testing basic connectivity...');
      const response = await page.goto('http://obsidiancomments.serverado.app/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      console.log('✅ Page loaded, status:', response?.status());
      expect(response?.status()).toBe(200);
      
      // Test 2: Check page title
      const title = await page.title();
      console.log('📝 Page title:', title);
      expect(title).toContain('Obsidian');
      
      // Test 3: Check if HTML structure is correct
      const bodyExists = await page.locator('body').count();
      console.log('🏗️ Body element exists:', bodyExists > 0);
      expect(bodyExists).toBeGreaterThan(0);
      
      // Test 4: Check for React root
      const rootExists = await page.locator('#root').count();
      console.log('⚛️ React root exists:', rootExists > 0);
      
      // Test 5: Wait for potential React app to load
      console.log('⏳ Waiting for app to initialize...');
      await page.waitForTimeout(5000);
      
      // Test 6: Check network requests
      console.log('🔍 Checking for network activity...');
      const requests = [];
      page.on('request', req => requests.push({ url: req.url(), method: req.method() }));
      
      await page.reload({ waitUntil: 'networkidle' });
      console.log('📊 Network requests made:', requests.length);
      requests.forEach(req => console.log(`  ${req.method} ${req.url}`));
      
      console.log('✅ All accessibility tests passed!');
      
    } catch (error) {
      console.error('❌ Accessibility test failed:', error.message);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
      console.log('📸 Debug screenshot saved as debug-screenshot.png');
      
      throw error;
    }
  });

  test('Health endpoint should work via browser', async ({ page }) => {
    console.log('🏥 Testing health endpoint via browser...');
    
    try {
      const response = await page.goto('http://obsidiancomments.serverado.app/api/health', {
        timeout: 15000
      });
      
      expect(response?.status()).toBe(200);
      
      const content = await page.textContent('body');
      const healthData = JSON.parse(content);
      
      console.log('✅ Health data:', healthData);
      expect(healthData.status).toBe('healthy');
      
    } catch (error) {
      console.error('❌ Health endpoint test failed:', error.message);
      throw error;
    }
  });

  test('Static assets should load', async ({ page }) => {
    console.log('📦 Testing static asset loading...');
    
    const responses = [];
    page.on('response', resp => {
      if (resp.url().includes('/assets/')) {
        responses.push({
          url: resp.url(),
          status: resp.status(),
          contentType: resp.headers()['content-type']
        });
      }
    });
    
    try {
      await page.goto('http://obsidiancomments.serverado.app/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log('📊 Static assets loaded:');
      responses.forEach(resp => {
        console.log(`  ${resp.status} ${resp.url} (${resp.contentType})`);
        expect(resp.status).toBe(200);
      });
      
      expect(responses.length).toBeGreaterThan(0);
      
    } catch (error) {
      console.error('❌ Static assets test failed:', error.message);
      throw error;
    }
  });
});