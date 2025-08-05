/**
 * TDD Test for Dynamic Title Propagation Issue
 * 
 * This test reproduces the issue where document titles
 * don't propagate to My Links after recent changes.
 */

const { test, expect } = require('@playwright/test');

// Helper function to create unique document ID
function generateDocumentId() {
  return `title-test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

test.describe('Dynamic Title Propagation to My Links', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:3001/editor/clear-test');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.removeItem('obsidian-comments-links');
    });
    
    // Set up error logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 BROWSER ERROR:', msg.text());
      }
    });
  });

  test('should propagate document title from content to My Links', async ({ page }) => {
    console.log('🧪 Test: Document title should propagate to My Links');
    
    const docId = generateDocumentId();
    const expectedTitle = 'My Test Document Title';
    const testContent = `${expectedTitle}\n\nThis is the body content of my test document.`;
    
    // Navigate to document
    console.log(`📍 Navigating to document: ${docId}`);
    await page.goto(`http://localhost:3001/editor/${docId}`);
    await page.waitForLoadState('networkidle');
    
    // Handle name input
    const nameInput = page.locator('input[placeholder*="name"]');
    if (await nameInput.isVisible()) {
      console.log('📝 Setting user name...');
      await nameInput.fill('TitleTestUser');
      await page.locator('button:has-text("Continue")').click();
      await page.waitForTimeout(1000);
    }
    
    // Add content to trigger title extraction
    console.log('✏️ Adding content with title...');
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(testContent);
      console.log(`📝 Content added: "${expectedTitle}"`);
      
      // Wait for auto-save and title processing
      await page.waitForTimeout(5000); // Give time for title extraction and link tracking
    }
    
    // Open My Links pane
    console.log('🔗 Opening My Links pane...');
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    await expect(myLinksPane).toBeVisible();
    
    // Check what titles are actually displayed
    const linkElements = myLinksPane.locator('a');
    const linkCount = await linkElements.count();
    console.log(`🔍 Found ${linkCount} links in My Links pane`);
    
    if (linkCount > 0) {
      // Get the title of the first (most recent) link
      const displayedTitle = await linkElements.first().textContent();
      console.log(`📋 Displayed title: "${displayedTitle}"`);
      console.log(`🎯 Expected title: "${expectedTitle}"`);
      
      // Check localStorage as well
      const linksData = await page.evaluate(() => {
        const data = localStorage.getItem('obsidian-comments-links');
        return data ? JSON.parse(data) : [];
      });
      
      if (linksData.length > 0) {
        const storedTitle = linksData[0].title;
        console.log(`💾 Stored title in localStorage: "${storedTitle}"`);
      }
      
      // This test should PASS when the issue is fixed
      // Currently it will FAIL because titles don't propagate
      expect(displayedTitle).toBe(expectedTitle);
      
    } else {
      console.log('❌ No links found in My Links pane');
      throw new Error('No links found - link tracking may be broken');
    }
    
    console.log('✅ Dynamic title propagation test completed');
  });

  test('should update title in My Links when document content changes', async ({ page }) => {
    console.log('🧪 Test: Title should update when content changes');
    
    const docId = generateDocumentId();
    const initialTitle = 'Initial Title';
    const updatedTitle = 'Updated Document Title';
    
    // Navigate and set initial content
    await page.goto(`http://localhost:3001/editor/${docId}`);
    await page.waitForLoadState('networkidle');
    
    // Handle name
    const nameInput = page.locator('input[placeholder*="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('UpdateTestUser');
      await page.locator('button:has-text("Continue")').click();
      await page.waitForTimeout(1000);
    }
    
    // Set initial content
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(`${initialTitle}\n\nInitial content.`);
      await page.waitForTimeout(3000);
    }
    
    // Check initial title in My Links
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    const initialDisplayedTitle = await myLinksPane.locator('a').first().textContent();
    console.log(`📋 Initial displayed title: "${initialDisplayedTitle}"`);
    
    // Close My Links pane
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(500);
    
    // Update content with new title
    console.log('✏️ Updating content with new title...');
    if (await editor.isVisible()) {
      await editor.click();
      // Clear and set new content
      await page.keyboard.selectAll();
      await editor.fill(`${updatedTitle}\n\nUpdated content with new title.`);
      await page.waitForTimeout(5000); // Wait for title update
    }
    
    // Check updated title in My Links
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const updatedDisplayedTitle = await myLinksPane.locator('a').first().textContent();
    console.log(`📋 Updated displayed title: "${updatedDisplayedTitle}"`);
    console.log(`🎯 Expected updated title: "${updatedTitle}"`);
    
    // This should pass when the issue is fixed
    expect(updatedDisplayedTitle).toBe(updatedTitle);
    expect(updatedDisplayedTitle).not.toBe(initialTitle);
    
    console.log('✅ Title update test completed');
  });

  test('should not show default "Collaborative Editor" title for documents with real content', async ({ page }) => {
    console.log('🧪 Test: Should not show default title for real content');
    
    const docId = generateDocumentId();
    const realTitle = 'Real Document With Content';
    
    await page.goto(`http://localhost:3001/editor/${docId}`);
    await page.waitForLoadState('networkidle');
    
    // Handle name
    const nameInput = page.locator('input[placeholder*="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('DefaultTestUser');
      await page.locator('button:has-text("Continue")').click();
      await page.waitForTimeout(1000);
    }
    
    // Add meaningful content
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(`${realTitle}\n\nThis document has real meaningful content that should be reflected in the title.`);
      await page.waitForTimeout(4000);
    }
    
    // Check My Links
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    const displayedTitle = await myLinksPane.locator('a').first().textContent();
    
    console.log(`📋 Displayed title: "${displayedTitle}"`);
    
    // Should NOT show the default title
    expect(displayedTitle).not.toBe('Collaborative Editor');
    expect(displayedTitle).toBe(realTitle);
    
    console.log('✅ Non-default title test completed');
  });

});