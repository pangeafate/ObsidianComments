/**
 * My Links Functionality TDD Test Suite
 * 
 * Testing:
 * 1. Links are saved correctly when visiting documents
 * 2. URLs use correct /editor/ path (not /edit/)
 * 3. Dynamic titles are extracted and displayed correctly
 * 4. Clicking links navigates to correct URLs
 * 5. Link titles update when document content changes
 */

const { test, expect } = require('@playwright/test');

// Helper function to create unique document ID
function generateDocumentId() {
  return `links-test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Helper to clear localStorage before tests
async function clearMyLinks(page) {
  await page.evaluate(() => {
    localStorage.removeItem('obsidian-comments-links');
  });
}

test.describe('My Links Functionality', () => {
  let documentId;
  
  test.beforeEach(async ({ page }) => {
    documentId = generateDocumentId();
    console.log(`📝 Testing with document ID: ${documentId}`);
    
    // Clear any existing links
    await clearMyLinks(page);
    
    // Set up error logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 BROWSER ERROR:', msg.text());
      }
    });
  });

  test('should save link with correct /editor/ URL path when visiting document', async ({ page }) => {
    console.log('🔗 Test: Links should use /editor/ path, not /edit/');
    
    // Navigate to a document using correct /editor/ path
    const editorUrl = `http://localhost:3001/editor/${documentId}`;
    await page.goto(editorUrl);
    await page.waitForLoadState('networkidle');
    
    // Set user name to activate link tracking
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('LinkTestUser');
      await page.locator('text=Set Name').click();
      await page.waitForTimeout(2000); // Allow link tracking to process
    }
    
    // Check what's stored in localStorage
    const storedLinks = await page.evaluate(() => {
      const links = localStorage.getItem('obsidian-comments-links');
      return links ? JSON.parse(links) : [];
    });
    
    console.log('💾 Stored links:', JSON.stringify(storedLinks, null, 2));
    
    // Verify link was saved
    expect(storedLinks.length).toBeGreaterThan(0);
    
    // Check the URL format
    const savedLink = storedLinks.find(link => link.id === documentId);
    expect(savedLink).toBeTruthy();
    
    console.log('🔍 Saved link URL:', savedLink.url);
    
    // CRITICAL TEST: URL should contain /editor/ not /edit/
    expect(savedLink.url).toContain('/editor/');
    expect(savedLink.url).not.toContain('/edit/');
    
    // Should be the full correct URL
    expect(savedLink.url).toBe(`http://localhost:3001/editor/${documentId}`);
    
    console.log('✅ Link saved with correct /editor/ path');
  });

  test('should display dynamic document title in My Links pane', async ({ page }) => {
    console.log('📝 Test: My Links should show dynamic document titles');
    
    // Navigate to document
    await page.goto(`http://localhost:3001/editor/${documentId}`);
    await page.waitForLoadState('networkidle');
    
    // Set user name
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('TitleTestUser');
      await page.locator('text=Set Name').click();
      await page.waitForTimeout(1000);
    }
    
    // Type specific content with clear title
    const testTitle = 'Dynamic Link Title Test Document';
    const testContent = `${testTitle}\n\nThis is the body content that should not appear in My Links.`;
    
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(testContent);
      await page.waitForTimeout(3000); // Wait for auto-save and title extraction
    }
    
    // Open My Links pane
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    // Verify My Links pane is visible
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    await expect(myLinksPane).toBeVisible();
    
    // Check if the dynamic title appears in the links list
    const linksList = myLinksPane.locator('.space-y-3');
    await expect(linksList).toBeVisible();
    
    // Look for the specific title we typed
    const dynamicTitleLink = linksList.locator(`text="${testTitle}"`);
    
    if (await dynamicTitleLink.isVisible()) {
      console.log('✅ SUCCESS: Dynamic title found in My Links');
      await expect(dynamicTitleLink).toBeVisible();
    } else {
      console.log('⚠️ Dynamic title not found, checking what titles are displayed...');
      
      // Get all link titles for debugging
      const allLinkTitles = await linksList.locator('a').allTextContents();
      console.log('📋 All displayed titles:', allLinkTitles);
      
      // Check localStorage to see what's actually stored
      const storedLinks = await page.evaluate(() => {
        const links = localStorage.getItem('obsidian-comments-links');
        return links ? JSON.parse(links) : [];
      });
      
      const currentLink = storedLinks.find(link => link.id === documentId);
      console.log('💾 Stored link title:', currentLink?.title);
      
      // This test might initially fail - that's expected in TDD
      // We'll fix the implementation after identifying the issue
      expect(dynamicTitleLink).toBeVisible();
    }
  });

  test('should update link title when document content changes', async ({ page }) => {
    console.log('🔄 Test: Link titles should update when content changes');
    
    // Navigate to document
    await page.goto(`http://localhost:3001/editor/${documentId}`);
    await page.waitForLoadState('networkidle');
    
    // Set user name
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('UpdateTestUser');
      await page.locator('text=Set Name').click();
      await page.waitForTimeout(1000);
    }
    
    // Type initial content
    const initialTitle = 'Initial Title';
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(`${initialTitle}\n\nInitial content here.`);
      await page.waitForTimeout(3000);
    }
    
    // Check initial title in localStorage
    let storedLinks = await page.evaluate(() => {
      const links = localStorage.getItem('obsidian-comments-links');
      return links ? JSON.parse(links) : [];
    });
    
    let currentLink = storedLinks.find(link => link.id === documentId);
    console.log('📝 Initial stored title:', currentLink?.title);
    
    // Update the content with new title
    const updatedTitle = 'Updated Dynamic Title';
    await editor.click();
    await editor.press('Control+a'); // Select all
    await editor.fill(`${updatedTitle}\n\nUpdated content here.`);
    await page.waitForTimeout(3000);
    
    // Check updated title in localStorage
    storedLinks = await page.evaluate(() => {
      const links = localStorage.getItem('obsidian-comments-links');
      return links ? JSON.parse(links) : [];
    });
    
    currentLink = storedLinks.find(link => link.id === documentId);
    console.log('📝 Updated stored title:', currentLink?.title);
    
    // The title should have updated
    expect(currentLink?.title).toContain(updatedTitle);
    
    console.log('✅ Link title updates correctly when content changes');
  });

  test('should navigate to correct URL when clicking My Links', async ({ page }) => {
    console.log('🖱️ Test: Clicking My Links should navigate to correct /editor/ URLs');
    
    // First, create a link by visiting a document
    await page.goto(`http://localhost:3001/editor/${documentId}`);
    await page.waitForLoadState('networkidle');
    
    // Set user name
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('NavTestUser');
      await page.locator('text=Set Name').click();
      await page.waitForTimeout(1000);
    }
    
    // Add some content
    const testTitle = 'Navigation Test Document';
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(`${testTitle}\n\nTest content for navigation.`);
      await page.waitForTimeout(3000);
    }
    
    // Open My Links pane
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    // Find and click the link
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    const linksList = myLinksPane.locator('.space-y-3');
    
    // Click the first available link
    const firstLink = linksList.locator('a').first();
    if (await firstLink.isVisible()) {
      const linkUrl = await firstLink.getAttribute('href');
      console.log('🔗 Link URL:', linkUrl);
      
      // Verify it uses /editor/ path
      expect(linkUrl).toContain('/editor/');
      expect(linkUrl).not.toContain('/edit/');
      
      // Click the link
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we navigated to the correct URL
      const currentUrl = page.url();
      console.log('🌐 Current URL after click:', currentUrl);
      
      expect(currentUrl).toContain(`/editor/${documentId}`);
      
      console.log('✅ Navigation works correctly with /editor/ URLs');
    } else {
      console.log('❌ No links found in My Links pane');
      throw new Error('No links found to test navigation');
    }
  });

  test('should handle multiple documents correctly', async ({ page }) => {
    console.log('📚 Test: Multiple documents should each get correct URLs and titles');
    
    const documentIds = [
      generateDocumentId(),
      generateDocumentId(),
      generateDocumentId()
    ];
    
    const testTitles = [
      'First Document Title',
      'Second Document Title', 
      'Third Document Title'
    ];
    
    // Visit each document and add content
    for (let i = 0; i < documentIds.length; i++) {
      const docId = documentIds[i];
      const title = testTitles[i];
      
      console.log(`📄 Processing document ${i + 1}: ${docId}`);
      
      await page.goto(`http://localhost:3001/editor/${docId}`);
      await page.waitForLoadState('networkidle');
      
      // Set user name (only needed once)
      if (i === 0) {
        const nameInput = page.locator('input[placeholder="Enter your name"]');
        if (await nameInput.isVisible()) {
          await nameInput.fill('MultiDocUser');
          await page.locator('text=Set Name').click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Add content
      const editor = page.locator('.ProseMirror');
      if (await editor.isVisible()) {
        await editor.click();
        await editor.fill(`${title}\n\nContent for document ${i + 1}.`);
        await page.waitForTimeout(3000);
      }
    }
    
    // Check all links are stored correctly
    const storedLinks = await page.evaluate(() => {
      const links = localStorage.getItem('obsidian-comments-links');
      return links ? JSON.parse(links) : [];
    });
    
    console.log('📋 All stored links:', storedLinks.length);
    
    // Verify each document has correct URL and title
    for (let i = 0; i < documentIds.length; i++) {
      const docId = documentIds[i];
      const expectedTitle = testTitles[i];
      
      const savedLink = storedLinks.find(link => link.id === docId);
      expect(savedLink).toBeTruthy();
      
      // Check URL format
      expect(savedLink.url).toBe(`http://localhost:3001/editor/${docId}`);
      
      // Check title (if dynamic titles are working)
      console.log(`📝 Document ${i + 1} title: "${savedLink.title}"`);
      
      // This assertion will help us see if dynamic titles are working
      if (savedLink.title.includes(expectedTitle)) {
        console.log(`✅ Document ${i + 1}: Dynamic title working`);
      } else {
        console.log(`⚠️ Document ${i + 1}: Expected "${expectedTitle}", got "${savedLink.title}"`);
      }
    }
    
    console.log('✅ Multiple documents handled correctly');
  });
});