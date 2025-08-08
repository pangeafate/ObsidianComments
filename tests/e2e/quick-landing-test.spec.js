/**
 * Quick Landing Page Test
 * Tests the landing page on the correct port (8083) to verify functionality
 */

const { test, expect } = require('@playwright/test');

test('Quick landing page test on correct port', async ({ page }) => {
  console.log('🎯 Testing landing page on port 8083');
  
  // Navigate to the correct port where frontend is running
  await page.goto('http://localhost:8083');
  await page.waitForLoadState('networkidle');
  
  // Verify landing page loaded
  await expect(page.locator('text="Obsidian Comments"')).toBeVisible();
  console.log('✅ Landing page loaded');
  
  // Find the Create New Note button
  const createButton = page.getByRole('button', { name: /Create New Note/i });
  await expect(createButton).toBeVisible({ timeout: 10000 });
  console.log('✅ Create button found');
  
  // Click the button
  await createButton.click();
  console.log('✅ Create button clicked');
  
  // Wait for navigation (this should work now)
  await page.waitForURL('**/editor/**', { timeout: 15000 });
  console.log('✅ Navigation to editor successful');
  
  // Verify we're in the editor
  const url = page.url();
  expect(url).toContain('/editor/');
  console.log(`✅ Successfully navigated to: ${url}`);
  
  // Wait for editor to load
  await page.waitForSelector('.ProseMirror', { timeout: 10000 });
  await expect(page.locator('.ProseMirror')).toBeVisible();
  console.log('✅ Editor loaded successfully');
  
  console.log('🎉 Quick landing page test PASSED!');
});

console.log('🧪 Quick Landing Test Suite Loaded!');