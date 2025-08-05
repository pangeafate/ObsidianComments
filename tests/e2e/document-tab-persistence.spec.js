const { test, expect } = require('@playwright/test');

// Helper function to handle user name overlay
async function handleUserNameOverlay(page) {
  try {
    const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
    await userNameOverlay.waitFor({ state: 'visible', timeout: 3000 });
    
    console.log('User name overlay detected, filling it out...');
    const nameInput = page.locator('input[placeholder="Enter your name..."]');
    await nameInput.fill('Test User ' + Date.now());
    
    const submitButton = page.locator('button:has-text("Continue")').first();
    await submitButton.click();
    
    await userNameOverlay.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('User name overlay dismissed');
  } catch (error) {
    console.log('No user name overlay found (this is fine)');
  }
}

test.describe('Document Tab Persistence', () => {
  
  test('New document tab should be saved to database', async ({ page, browser }) => {
    const newDocId = 'test-new-doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Navigate directly to a new document
    await page.goto(`/editor/${newDocId}`);
    
    // Handle user name overlay
    await handleUserNameOverlay(page);
    
    // Wait for editor to load and document to be created
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for document creation
    
    console.log('Testing document persistence for ID:', newDocId);
    
    // Add some content to the document
    const testContent = 'This is a new document created via tab - ' + Date.now();
    await page.click('.tiptap');
    
    // Clear any existing content first
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    await page.type('.tiptap', testContent);
    
    // Wait for content to be auto-saved
    await page.waitForTimeout(5000);
    
    // Close the page and open a new one to test persistence
    await page.close();
    
    const newPage = await browser.newPage();
    await newPage.goto(`/editor/${newDocId}`);
    
    // Handle user name overlay in new page
    await handleUserNameOverlay(newPage);
    
    // Wait for editor to load
    await newPage.waitForSelector('.tiptap', { timeout: 10000 });
    await newPage.waitForTimeout(3000);
    
    // Check if the content persisted
    const editorContent = await newPage.locator('.tiptap').textContent();
    console.log('Persisted content:', editorContent);
    
    expect(editorContent).toContain(testContent);
    
    await newPage.close();
  });

  test('Document should be saved to database via API', async ({ page, request }) => {
    const newDocId = 'api-test-doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Navigate to the new document
    await page.goto(`/editor/${newDocId}`);
    
    // Handle user name overlay
    await handleUserNameOverlay(page);
    
    // Wait for editor to load
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for document creation
    
    // Add content
    const testContent = 'API persistence test content - ' + Date.now();
    await page.click('.tiptap');
    
    // Clear any existing content first
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    await page.type('.tiptap', testContent);
    
    // Wait for auto-save
    await page.waitForTimeout(5000);
    
    // Check if document exists in database via API
    const response = await request.get(`/api/notes/${newDocId}`);
    
    if (response.ok()) {
      const documentData = await response.json();
      console.log('Document found in database:', documentData);
      expect(documentData.shareId).toBe(newDocId);
      expect(documentData.content).toContain(testContent);
    } else {
      console.error('Document not found in database via API, status:', response.status());
      // Fail the test if document is not in database
      expect(response.status()).toBe(200);
    }
  });

  test('Multiple new documents should all persist', async ({ page, browser }) => {
    const documents = [];
    
    // Create 3 new documents
    for (let i = 0; i < 3; i++) {
      const docId = `multi-test-doc-${i}-` + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      documents.push({
        id: docId,
        content: `Document ${i} content - ` + Date.now()
      });
      
      await page.goto(`/editor/${docId}`);
      
      // Handle user name overlay (only needed on first document)
      if (i === 0) {
        await handleUserNameOverlay(page);
      }
      
      await page.waitForSelector('.tiptap', { timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for document creation
      
      await page.click('.tiptap');
      
      // Clear any existing content first
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Delete');
      
      await page.type('.tiptap', documents[i].content);
      
      // Wait for save
      await page.waitForTimeout(3000);
    }
    
    // Now verify all documents persist
    for (const doc of documents) {
      const newPage = await browser.newPage();
      await newPage.goto(`/editor/${doc.id}`);
      
      // Handle user name overlay in new page
      await handleUserNameOverlay(newPage);
      
      await newPage.waitForSelector('.tiptap', { timeout: 10000 });
      await newPage.waitForTimeout(2000);
      
      const content = await newPage.locator('.tiptap').textContent();
      expect(content).toContain(doc.content);
      
      await newPage.close();
    }
  });
});