const { test, expect } = require('@playwright/test');

test.describe('Manual Document Testing', () => {
  
  test('Investigate document loading issues', async ({ page }) => {
    console.log('🔍 Investigating document loading for test-doc-local-demo');
    
    // Enable more detailed console logging
    page.on('console', msg => {
      console.log(`Browser ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });
    
    page.on('requestfailed', request => {
      console.error('Request failed:', request.url(), request.failure().errorText);
    });
    
    await page.goto('/editor/test-doc-local-demo');
    
    // Take a screenshot to see what's happening
    await page.screenshot({ path: 'document-load-debug.png', fullPage: true });
    
    // Wait and see what elements are present
    await page.waitForTimeout(5000);
    
    // Check for React root
    const reactRoot = await page.locator('#root').isVisible();
    console.log('React root visible:', reactRoot);
    
    // Check for any visible text
    const bodyText = await page.locator('body').textContent();
    console.log('Body text (first 200 chars):', bodyText?.substring(0, 200) || '(empty)');
    
    // Check for loading states
    const loadingElements = await page.locator('[data-testid*="loading"], .loading, .spinner').count();
    console.log('Loading elements found:', loadingElements);
    
    // Check for error messages
    const errorElements = await page.locator('[data-testid*="error"], .error').count();
    console.log('Error elements found:', errorElements);
    
    // Look for TipTap editor specifically
    const tiptapExists = await page.locator('.tiptap').count();
    console.log('TipTap elements found:', tiptapExists);
    
    // Check if document content was fetched
    const apiCalled = await page.evaluate(() => {
      return window.performance.getEntriesByName('/api/notes/test-doc-local-demo').length > 0 ||
             window.performance.getEntriesByType('resource').some(r => r.name.includes('/api/notes/'));
    });
    console.log('API call detected:', apiCalled);
    
    console.log('Investigation complete - check debug screenshot');
  });
  
  test('Test API call manually', async ({ page }) => {
    console.log('🔍 Testing manual API call');
    
    await page.goto('/');
    
    // Test API call from browser context
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:3001/api/notes/test-doc-local-demo');
        return {
          status: res.status,
          ok: res.ok,
          data: await res.text()
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('Manual API response:', response);
  });
});