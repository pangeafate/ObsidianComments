/**
 * Test for title duplication bug on page refresh
 */

const { test, expect } = require('@playwright/test');

async function createDocument(request, title, content) {
  const response = await request.post('http://localhost:8081/api/notes/share', {
    data: {
      title,
      content,
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result;
}

test('Title duplication bug - refresh after title change', async ({ page, request }) => {
  const originalTitle = 'Test Document';
  const newTitle = 'Updated Title';
  const content = `# Test\n\nSome content here.`;

  // Create a document
  const doc = await createDocument(request, originalTitle, content);
  
  // Navigate to editor
  await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
  await page.waitForLoadState('networkidle');
  
  // Wait for editor to be ready
  await page.waitForSelector('.prose', { timeout: 15000 });
  
  // Set user name
  const nameInput = page.locator('input[placeholder="Enter your name..."]');
  if (await nameInput.isVisible()) {
    await nameInput.fill('Test User');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  }
  
  // Click on title to edit it
  const titleElement = page.locator('h1').first();
  await titleElement.click();
  
  // Wait for title input to appear and change title
  const titleInput = page.locator('input[type="text"]').first();
  await titleInput.waitFor({ state: 'visible' });
  await titleInput.clear();
  await titleInput.fill(newTitle);
  await titleInput.press('Enter');
  
  // Wait for save to complete
  await page.waitForTimeout(2000);
  
  // Verify title changed
  await expect(page.locator('h1').first()).toContainText(newTitle);
  
  // Refresh the page multiple times to trigger the bug
  for (let i = 0; i < 3; i++) {
    console.log(`Refresh attempt ${i + 1}`);
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prose', { timeout: 15000 });
    
    // Set user name again after refresh
    const nameInputRefresh = page.locator('input[placeholder="Enter your name..."]');
    if (await nameInputRefresh.isVisible()) {
      await nameInputRefresh.fill('Test User');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Check if title is duplicated
    const titleText = await page.locator('h1').first().textContent();
    console.log(`Title after refresh ${i + 1}: "${titleText}"`);
    
    // The bug manifests as title containing the text multiple times
    if (titleText && titleText.includes(newTitle)) {
      const occurrences = titleText.split(newTitle).length - 1;
      if (occurrences > 1) {
        console.error(`❌ Title duplication detected: "${titleText}" (${occurrences} occurrences)`);
        
        // Take screenshot for debugging
        await page.screenshot({ path: `title-duplication-${i + 1}.png` });
        
        throw new Error(`Title duplication bug reproduced after ${i + 1} refresh(es): "${titleText}"`);
      }
    }
    
    // Wait between refreshes
    await page.waitForTimeout(1000);
  }
  
  console.log('✅ No title duplication detected after 3 refreshes');
});

test('Title duplication bug - collaborative scenario', async ({ page, context }) => {
  const title = 'Collaborative Test';
  const content = `# Test\n\nCollaborative content.`;

  // Create document via API
  const request = await context.newRequest();
  const doc = await createDocument(request, title, content);
  
  // Open same document in two tabs
  const page2 = await context.newPage();
  
  // Navigate both pages to the editor
  await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
  await page2.goto(`http://localhost:8083/editor/${doc.shareId}`);
  
  // Wait for both to load
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page2.waitForLoadState('networkidle')
  ]);
  
  await Promise.all([
    page.waitForSelector('.prose', { timeout: 15000 }),
    page2.waitForSelector('.prose', { timeout: 15000 })
  ]);
  
  // Set user names
  const nameInput1 = page.locator('input[placeholder="Enter your name..."]');
  if (await nameInput1.isVisible()) {
    await nameInput1.fill('User 1');
    await page.keyboard.press('Enter');
  }
  
  const nameInput2 = page2.locator('input[placeholder="Enter your name..."]');
  if (await nameInput2.isVisible()) {
    await nameInput2.fill('User 2');
    await page2.keyboard.press('Enter');
  }
  
  await page.waitForTimeout(2000);
  
  // Simultaneously change title on both pages (race condition)
  await Promise.all([
    (async () => {
      const titleElement = page.locator('h1').first();
      await titleElement.click();
      const titleInput = page.locator('input[type="text"]').first();
      await titleInput.waitFor({ state: 'visible' });
      await titleInput.clear();
      await titleInput.fill('Title Changed by User 1');
      await titleInput.press('Enter');
    })(),
    (async () => {
      // Small delay to create race condition
      await page2.waitForTimeout(100);
      const titleElement = page2.locator('h1').first();
      await titleElement.click();
      const titleInput = page2.locator('input[type="text"]').first();
      await titleInput.waitFor({ state: 'visible' });
      await titleInput.clear();
      await titleInput.fill('Title Changed by User 2');
      await titleInput.press('Enter');
    })()
  ]);
  
  // Wait for synchronization
  await page.waitForTimeout(3000);
  
  // Check final title state on both pages
  const finalTitle1 = await page.locator('h1').first().textContent();
  const finalTitle2 = await page2.locator('h1').first().textContent();
  
  console.log(`Final title on page 1: "${finalTitle1}"`);
  console.log(`Final title on page 2: "${finalTitle2}"`);
  
  // Check for duplication
  [finalTitle1, finalTitle2].forEach((titleText, index) => {
    if (titleText) {
      // Look for patterns like "Title Changed by User 1Title Changed by User 2"
      const words = titleText.split(' ');
      const uniqueWords = new Set(words);
      if (words.length > uniqueWords.size * 1.5) { // Allow some repetition but not excessive
        console.error(`❌ Potential title duplication on page ${index + 1}: "${titleText}"`);
      }
    }
  });
  
  await page2.close();
  
  console.log('✅ Collaborative title change test completed');
});