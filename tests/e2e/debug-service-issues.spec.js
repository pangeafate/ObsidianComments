/**
 * Debug Service Issues Test Suite
 * 
 * Systematically tests the application to identify:
 * 1. White screen issues after hard refresh
 * 2. Document creation problems from root URL
 * 3. API connectivity issues
 * 4. JavaScript errors
 */

const { test, expect } = require('@playwright/test');

test.describe('Debug Service Issues', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 BROWSER ERROR:', msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log('🚨 PAGE ERROR:', error.message);
    });
    
    // Listen for failed requests
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`🚨 FAILED REQUEST: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('should load homepage without white screen', async ({ page }) => {
    console.log('🔍 Testing homepage load...');
    
    // Go to homepage
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we get a white screen (body should have content)
    const bodyText = await page.locator('body').textContent();
    console.log('📄 Body content length:', bodyText?.length || 0);
    
    // Should see the main heading
    await expect(page.locator('h1')).toContainText('Obsidian Comments');
    
    // Should see the description
    await expect(page.locator('p')).toContainText('collaborative Markdown editor');
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: `test-results/homepage-load-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log('✅ Homepage loads correctly');
  });

  test('should handle hard refresh without white screen', async ({ page }) => {
    console.log('🔄 Testing hard refresh behavior...');
    
    // Go to homepage first
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Verify it loads initially
    await expect(page.locator('h1')).toContainText('Obsidian Comments');
    
    // Perform hard refresh
    await page.reload({ waitUntil: 'networkidle' });
    
    // Check if white screen occurs
    const bodyText = await page.locator('body').textContent();
    console.log('📄 Body content after refresh:', bodyText?.length || 0);
    
    // Should still see content after refresh
    await expect(page.locator('h1')).toContainText('Obsidian Comments');
    
    await page.screenshot({ 
      path: `test-results/hard-refresh-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log('✅ Hard refresh works correctly');
  });

  test('should test document creation workflow', async ({ page }) => {
    console.log('📝 Testing document creation from root URL...');
    
    // Start at homepage
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Since there's no "create document" button on homepage, 
    // let's test navigating directly to a new document URL
    const newDocId = `test-doc-${Date.now()}`;
    const editorUrl = `http://localhost:3001/edit/${newDocId}`;
    
    console.log(`🔗 Testing direct navigation to: ${editorUrl}`);
    
    // Navigate to editor with new document ID
    await page.goto(editorUrl);
    await page.waitForLoadState('networkidle');
    
    // Check if editor loads
    const hasEditor = await page.locator('.ProseMirror').isVisible().catch(() => false);
    console.log('📝 Editor visible:', hasEditor);
    
    if (hasEditor) {
      // Test typing in editor
      await page.locator('.ProseMirror').click();
      await page.locator('.ProseMirror').fill('Test document content');
      
      // Wait for auto-save
      await page.waitForTimeout(3000);
      
      console.log('✅ Document creation works via direct URL');
    } else {
      console.log('❌ Editor not loading - checking for errors...');
      
      // Check what's actually on the page
      const pageContent = await page.locator('body').textContent();
      console.log('📄 Page content:', pageContent?.substring(0, 200) + '...');
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: `test-results/document-creation-${Date.now()}.png`,
      fullPage: true 
    });
  });

  test('should test API connectivity', async ({ page }) => {
    console.log('🔌 Testing API connectivity...');
    
    // Test health endpoint
    const healthResponse = await page.request.get('http://localhost:3001/health');
    console.log('❤️  Health endpoint:', healthResponse.status(), await healthResponse.text());
    
    // Test backend API through nginx proxy
    const apiResponse = await page.request.get('http://localhost:3001/api/notes/test-doc');
    console.log('📡 API response:', apiResponse.status());
    
    if (apiResponse.status() === 404) {
      console.log('✅ API is accessible (404 is expected for non-existent doc)');
    } else if (apiResponse.status() >= 500) {
      console.log('❌ API server error:', apiResponse.status());
    }
    
    // Test WebSocket connection by going to editor page
    await page.goto('http://localhost:3001/edit/test-ws-connection');
    await page.waitForLoadState('networkidle');
    
    // Look for WebSocket connection indicators
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible()) {
      const statusText = await connectionStatus.textContent();
      console.log('🔗 WebSocket status:', statusText);
    } else {
      console.log('⚠️  Connection status not found');
    }
  });

  test('should test all main routes', async ({ page }) => {
    console.log('🛣️  Testing all application routes...');
    
    const routes = [
      { path: '/', name: 'Homepage' },
      { path: '/edit/test-route-doc', name: 'Editor' },
      { path: '/share/test-route-doc', name: 'Share' }
    ];
    
    for (const route of routes) {
      console.log(`📍 Testing route: ${route.path} (${route.name})`);
      
      await page.goto(`http://localhost:3001${route.path}`);
      await page.waitForLoadState('networkidle');
      
      // Check if page loads (not white screen)
      const bodyText = await page.locator('body').textContent();
      const hasContent = bodyText && bodyText.trim().length > 0;
      
      console.log(`  - Content length: ${bodyText?.length || 0}`);
      console.log(`  - Has content: ${hasContent}`);
      
      if (!hasContent) {
        console.log(`❌ WHITE SCREEN detected for route: ${route.path}`);
        await page.screenshot({ 
          path: `test-results/white-screen-${route.name}-${Date.now()}.png`,
          fullPage: true 
        });
      } else {
        console.log(`✅ Route ${route.path} loads correctly`);
      }
    }
  });

  test('should identify specific error causes', async ({ page }) => {
    console.log('🔍 Identifying specific error causes...');
    
    let jsErrors = [];
    let networkErrors = [];
    let apiErrors = [];
    
    // Collect JavaScript errors
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // Collect network errors  
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    
    // Navigate and interact with the app
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to editor
    await page.goto('http://localhost:3001/edit/debug-test-doc');
    await page.waitForLoadState('networkidle');
    
    // Try to interact with editor if it exists
    if (await page.locator('.ProseMirror').isVisible()) {
      await page.locator('.ProseMirror').click();
      await page.locator('.ProseMirror').type('Debug test content');
      await page.waitForTimeout(2000);
    }
    
    // Report findings
    console.log('\n🚨 ERROR SUMMARY:');
    console.log('JavaScript Errors:', jsErrors.length);
    jsErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    
    console.log('Network Errors:', networkErrors.length);
    networkErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    
    if (jsErrors.length === 0 && networkErrors.length === 0) {
      console.log('✅ No errors detected - app should be working correctly');
    } else {
      console.log('❌ Errors found - these may be causing the issues');
    }
  });
});