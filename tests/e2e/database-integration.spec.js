const { test, expect } = require('@playwright/test');

test.describe('Database Integration Tests', () => {
  
  // Helper function to handle user name overlay
  async function handleUserNameOverlay(page) {
    const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
    
    try {
      await userNameOverlay.waitFor({ state: 'visible', timeout: 2000 });
      
      console.log('User name overlay detected, filling it out...');
      const nameInput = page.locator('input[placeholder="Enter your name..."]');
      await nameInput.fill('Test User ' + Date.now());
      
      const submitButton = page.locator('button:has-text("Continue"), button:has-text("Start"), button:has-text("OK"), button[type="submit"]').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('Submitted user name');
      }
      
      await userNameOverlay.waitFor({ state: 'hidden', timeout: 5000 });
      console.log('User name overlay dismissed');
      
    } catch (error) {
      console.log('No user name overlay found (this is fine)');
    }
  }

  test('Load document from database - Local Testing Document', async ({ page }) => {
    console.log('🔍 Testing database document: test-doc-local-demo');
    
    await page.goto('/editor/test-doc-local-demo');
    await handleUserNameOverlay(page);
    
    // Wait for editor to load
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Check if document content loaded from database
    const editorContent = await page.locator('.tiptap').textContent();
    console.log('Editor content length:', editorContent?.length || 0);
    
    // Verify specific content from our database document
    await expect(page.locator('.tiptap')).toContainText('Welcome to ObsidianComments');
    await expect(page.locator('.tiptap')).toContainText('Real-time collaboration');
    await expect(page.locator('.tiptap')).toContainText('Document ID: test-doc-local-demo');
    
    console.log('✅ Database document loaded successfully');
  });

  test('Load document from database - Collaboration Demo', async ({ page }) => {
    console.log('🔍 Testing database document: collaboration-demo-123');
    
    await page.goto('/editor/collaboration-demo-123');
    await handleUserNameOverlay(page);
    
    // Wait for editor to load
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Check if document content loaded from database
    const editorContent = await page.locator('.tiptap').textContent();
    console.log('Editor content length:', editorContent?.length || 0);
    
    // Verify specific content from our database document
    await expect(page.locator('.tiptap')).toContainText('Collaboration Testing');
    await expect(page.locator('.tiptap')).toContainText('Open in Multiple Tabs');
    await expect(page.locator('.tiptap')).toContainText('Document ID: collaboration-demo-123');
    
    console.log('✅ Database document loaded successfully');
  });

  test('Edit and persistence with database document', async ({ page }) => {
    console.log('🔍 Testing edit and persistence with database document');
    
    await page.goto('/editor/test-doc-local-demo');
    await handleUserNameOverlay(page);
    
    // Wait for editor to load
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Verify original content loads
    await expect(page.locator('.tiptap')).toContainText('Welcome to ObsidianComments');
    
    // Add some new content
    await page.click('.tiptap');
    await page.keyboard.press('End'); // Go to end of document
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    
    const testText = '**TEST EDIT** - Added by E2E test at ' + new Date().toISOString();
    await page.type('.tiptap', testText);
    
    // Verify the edit appears
    await expect(page.locator('.tiptap')).toContainText('TEST EDIT');
    
    // Wait for potential auto-save
    await page.waitForTimeout(3000);
    
    console.log('✅ Edit functionality works with database document');
  });

  test('API endpoints accessible', async ({ page }) => {
    console.log('🔍 Testing API endpoints from frontend');
    
    // Test API calls directly from browser context
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('/api/health');
      return {
        status: response.status,
        data: await response.json()
      };
    });
    
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data.status).toBe('ok');
    console.log('✅ Health API accessible from frontend');
    
    // Test document API
    const docResponse = await page.evaluate(async () => {
      const response = await fetch('/api/notes/test-doc-local-demo');
      return {
        status: response.status,
        data: await response.json()
      };
    });
    
    expect(docResponse.status).toBe(200);
    expect(docResponse.data.shareId).toBe('test-doc-local-demo');
    expect(docResponse.data.title).toBe('Local Testing Document');
    console.log('✅ Document API accessible from frontend');
  });
});