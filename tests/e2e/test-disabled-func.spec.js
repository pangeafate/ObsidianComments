const { test, expect } = require('@playwright/test');

test('Test with disabled checkAndLoadDocument', async ({ page }) => {
  const jsErrors = [];
  
  page.on('pageerror', error => {
    jsErrors.push(error.message);
    console.log('JS ERROR:', error.message);
  });

  await page.goto('/editor/disabled-test-' + Date.now());
  await page.waitForTimeout(3000);
  
  const editorExists = await page.locator('.tiptap').count();
  console.log('Editor elements:', editorExists);
  console.log('JS errors:', jsErrors.length);
  
  jsErrors.forEach(error => console.log('  -', error));
  
  // Just check if the JS error goes away
  if (jsErrors.length === 0) { 
    console.log('✅ No JS errors - checkAndLoadDocument was the issue');
  } else {
    console.log('❌ JS errors persist - issue is elsewhere');
  }
  
  expect(jsErrors.length).toBe(0);
});