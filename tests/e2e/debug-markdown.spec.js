/**
 * Debug Markdown Rendering
 */

const { test, expect } = require('@playwright/test');

async function createMarkdownDocument(request, title, markdownContent) {
  const response = await request.post('http://localhost:8081/api/notes/share', {
    data: {
      title,
      content: markdownContent,
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result;
}

test('Debug markdown checkbox rendering', async ({ page, request }) => {
  const markdownContent = `# Task List Example

- [ ] Unchecked task
- [x] Completed task`;

  const doc = await createMarkdownDocument(request, 'Debug Test', markdownContent);
  
  await page.goto(`http://localhost:8080/view/${doc.shareId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.prose', { timeout: 10000 });
  
  // Debug: Print the actual HTML content
  const content = page.locator('.prose');
  const htmlContent = await content.innerHTML();
  console.log('Actual HTML content:', htmlContent);
  
  // Check for any checkboxes
  const allCheckboxes = page.locator('input[type="checkbox"]');
  const checkboxCount = await allCheckboxes.count();
  console.log('Number of checkboxes found:', checkboxCount);
  
  if (checkboxCount > 0) {
    for (let i = 0; i < checkboxCount; i++) {
      const checkbox = allCheckboxes.nth(i);
      const isChecked = await checkbox.isChecked();
      const hasCheckedAttr = await checkbox.getAttribute('checked');
      console.log(`Checkbox ${i}: isChecked=${isChecked}, hasCheckedAttr=${hasCheckedAttr}`);
    }
  }
});