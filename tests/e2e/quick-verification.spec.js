const { test, expect } = require('@playwright/test');

test('Quick verification - editor loads and functions work', async ({ page }) => {
  const docId = 'quick-test-' + Date.now();
  
  // Monitor for any JavaScript errors
  const jsErrors = [];
  page.on('pageerror', error => {
    jsErrors.push(error.message);
    console.log('JS ERROR:', error.message);
  });

  await page.goto(`/editor/${docId}`);
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check if editor loads
  const editorExists = await page.locator('.tiptap').count();
  console.log('Editor elements found:', editorExists);
  
  // Check for JS errors
  console.log('JavaScript errors:', jsErrors.length);
  jsErrors.forEach(error => console.log('  -', error));
  
  // Check if debug functions are available
  const debugCheck = await page.evaluate(() => {
    return {
      editorFunctions: typeof window.editorFunctions !== 'undefined',
      functions: window.editorFunctions ? Object.keys(window.editorFunctions) : []
    };
  });
  
  console.log('Debug check:', debugCheck);
  
  // Basic validation
  expect(jsErrors.length).toBe(0);
  expect(editorExists).toBeGreaterThan(0);
});