const { test, expect } = require('@playwright/test');

test('Test original editor without modifications', async ({ page }) => {
  const jsErrors = [];
  
  page.on('pageerror', error => {
    jsErrors.push(error.message);
    console.log('JS ERROR:', error.message);
  });

  await page.goto('/editor/original-test-' + Date.now());
  await page.waitForTimeout(5000);
  
  const editorExists = await page.locator('.tiptap').count();
  console.log('Editor elements:', editorExists);
  console.log('JS errors:', jsErrors.length);
  
  jsErrors.forEach(error => console.log('  -', error));
  
  // This should pass with the original code
  expect(jsErrors.length).toBe(0);
  expect(editorExists).toBeGreaterThan(0);
});