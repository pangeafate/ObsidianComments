const { test, expect } = require('@playwright/test');

test('Test if JS error is fixed after reordering', async ({ page }) => {
  const jsErrors = [];
  
  page.on('pageerror', error => {
    jsErrors.push(error.message);
    console.log('JS ERROR:', error.message);
  });

  await page.goto('/editor/fixed-test-' + Date.now());
  await page.waitForTimeout(5000);
  
  const editorExists = await page.locator('.tiptap').count();
  console.log('Editor elements:', editorExists);
  console.log('JS errors:', jsErrors.length);
  
  jsErrors.forEach(error => console.log('  -', error));
  
  // Check if debug functions are available now
  const debugCheck = await page.evaluate(() => {
    return {
      editorFunctions: typeof window.editorFunctions !== 'undefined',
      functions: window.editorFunctions ? Object.keys(window.editorFunctions) : []
    };
  });
  
  console.log('Debug check:', debugCheck);
  
  // This should pass now
  expect(jsErrors.length).toBe(0);
  expect(editorExists).toBeGreaterThan(0);
  expect(debugCheck.editorFunctions).toBe(true);
});