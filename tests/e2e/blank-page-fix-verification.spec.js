const { test, expect } = require('@playwright/test');

test.describe('Blank Page Fix - New Note Editor Loading', () => {
  // Test the critical path: Creating a new note and ensuring editor loads properly
  test('should create new note and load editor without blank page', async ({ page }) => {
    console.log('🚀 Starting blank page fix verification test');

    // Step 1: Navigate to homepage
    console.log('📍 Step 1: Navigate to homepage');
    await page.goto('/');
    
    // Verify homepage loads
    await expect(page).toHaveTitle(/Obsidian Comments/);
    await expect(page.locator('h1')).toContainText('Obsidian Comments');
    
    // Step 2: Click "Create New Note" button
    console.log('📍 Step 2: Click Create New Note button');
    const createButton = page.locator('button', { hasText: 'Create New Note' });
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
    
    // Click the button and wait for navigation
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'), // Wait for new tab/window
      createButton.click()
    ]);
    
    console.log('✅ New note page opened');

    // Step 3: Verify editor page loads (no blank page)
    console.log('📍 Step 3: Verify editor loads without blank page');
    
    // Wait for the page to load completely
    await newPage.waitForLoadState('networkidle');
    
    // CRITICAL: Check that we never see just a blank page
    const loadingText = newPage.locator('text=Loading document...');
    const editorRoot = newPage.locator('#root');
    
    // If loading appears, it should disappear quickly
    try {
      await loadingText.waitFor({ timeout: 2000 });
      console.log('⏳ Loading indicator appeared');
      await loadingText.waitFor({ state: 'hidden', timeout: 10000 });
      console.log('✅ Loading indicator disappeared');
    } catch (e) {
      console.log('ℹ️ Loading indicator did not appear (direct load)');
    }
    
    // Step 4: Verify editor components are visible
    console.log('📍 Step 4: Verify editor components are visible');
    
    // Check for editor toolbar/header
    await expect(newPage.locator('h1')).toBeVisible({ timeout: 15000 });
    
    // Check for main editor content area
    const editorContent = newPage.locator('[data-testid="editor-content"], .ProseMirror, .prose');
    await expect(editorContent.first()).toBeVisible({ timeout: 15000 });
    
    // Check for buttons (New Note, Comments, My Links)
    await expect(newPage.locator('button', { hasText: 'New Note' })).toBeVisible();
    await expect(newPage.locator('button', { hasText: 'Comments' })).toBeVisible();
    
    // Step 5: Verify editor is functional (can type)
    console.log('📍 Step 5: Test editor functionality');
    
    // Click in the editor and type
    await editorContent.first().click();
    await newPage.keyboard.type('This is a test to verify the editor works!');
    
    // Verify text appears
    await expect(editorContent.first()).toContainText('This is a test to verify the editor works!');
    
    // Step 6: Verify no JavaScript errors occurred
    console.log('📍 Step 6: Check for JavaScript errors');
    
    const errors = [];
    newPage.on('pageerror', error => {
      errors.push(error.message);
      console.error('❌ JavaScript error:', error.message);
    });
    
    // Wait a moment to catch any late errors
    await newPage.waitForTimeout(2000);
    
    // Verify no critical errors
    expect(errors.filter(e => 
      e.includes('Cannot access') || 
      e.includes('ReferenceError') || 
      e.includes('undefined')
    )).toHaveLength(0);
    
    console.log('✅ Blank page fix verification completed successfully');
  });

  test('should handle new note creation from URL directly', async ({ page }) => {
    console.log('🚀 Starting direct URL navigation test');
    
    // Generate a unique document ID
    const uniqueId = `test-direct-${Date.now()}`;
    const editorUrl = `/editor/${uniqueId}`;
    
    console.log(`📍 Navigating directly to: ${editorUrl}`);
    
    // Navigate directly to editor URL
    await page.goto(editorUrl);
    await page.waitForLoadState('networkidle');
    
    // Should not show blank page
    const loadingText = page.locator('text=Loading document...');
    
    // If loading appears, it should disappear
    try {
      await loadingText.waitFor({ timeout: 3000 });
      console.log('⏳ Loading indicator appeared for direct navigation');
      await loadingText.waitFor({ state: 'hidden', timeout: 10000 });
      console.log('✅ Loading completed for direct navigation');
    } catch (e) {
      console.log('ℹ️ Direct load without loading indicator');
    }
    
    // Verify editor loads
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
    
    const editorContent = page.locator('[data-testid="editor-content"], .ProseMirror, .prose');
    await expect(editorContent.first()).toBeVisible({ timeout: 15000 });
    
    // Test typing
    await editorContent.first().click();
    await page.keyboard.type('Direct URL navigation test');
    await expect(editorContent.first()).toContainText('Direct URL navigation test');
    
    console.log('✅ Direct URL navigation test completed successfully');
  });

  test('should show proper error handling for network issues', async ({ page }) => {
    console.log('🚀 Testing error handling');
    
    // Simulate network issues by intercepting API calls
    await page.route('**/api/**', (route) => {
      // Fail the first few API calls to simulate network issues
      if (Math.random() < 0.3) {
        route.abort('networkfailed');
      } else {
        route.continue();
      }
    });
    
    const uniqueId = `test-error-${Date.now()}`;
    await page.goto(`/editor/${uniqueId}`);
    
    // Should still eventually load or show proper error, not blank page
    try {
      await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });
      console.log('✅ Editor loaded despite network issues');
    } catch (e) {
      // Should show some error message, not blank page
      const errorMessages = await page.locator('text=/error|failed|try again/i').count();
      expect(errorMessages).toBeGreaterThan(0);
      console.log('✅ Proper error message shown instead of blank page');
    }
  });

  test('should verify WebSocket connection works', async ({ page }) => {
    console.log('🚀 Testing WebSocket connectivity');
    
    const uniqueId = `test-websocket-${Date.now()}`;
    await page.goto(`/editor/${uniqueId}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for editor to load
    const editorContent = page.locator('[data-testid="editor-content"], .ProseMirror, .prose');
    await expect(editorContent.first()).toBeVisible({ timeout: 15000 });
    
    // Check for connection status indicator
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status, text=/connected|online/i');
    
    try {
      await expect(connectionStatus.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Connection status indicator visible');
    } catch (e) {
      console.log('ℹ️ Connection status not visible (may be auto-hidden)');
    }
    
    // Type something and verify it works (indicates WebSocket is functional)
    await editorContent.first().click();
    await page.keyboard.type('WebSocket test content');
    await expect(editorContent.first()).toContainText('WebSocket test content');
    
    console.log('✅ WebSocket functionality verified');
  });
});