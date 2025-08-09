/**
 * TDD Test Suite for View Mode Markdown Rendering
 * 
 * Tests to verify that markdown content is properly rendered as HTML 
 * in view mode, showing formatted text with headings, bold, italics, etc.
 */

const { test, expect } = require('@playwright/test');

// Helper to create a document with markdown content
const TEST_URL = process.env.TEST_URL || 'http://localhost';
async function createMarkdownDocument(request, title, markdownContent) {
  const response = await request.post(`${TEST_URL}/api/notes/share`, {
    data: {
      title,
      content: markdownContent,
      // Don't provide htmlContent to force markdown rendering
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result;
}

test.describe('View Mode Markdown Rendering (TDD)', () => {
  
  test('should render headings properly in view mode', async ({ page, request }) => {
    console.log('📝 Testing heading rendering in view mode');
    
    const markdownContent = `# Main Heading
## Secondary Heading
### Third Level Heading

This is a paragraph with regular text.`;

    const doc = await createMarkdownDocument(request, 'Heading Test', markdownContent);
    
    // Navigate to view mode
    await page.goto(`http://localhost:8080/view/${doc.shareId}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for content to load
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Test: Main heading should be rendered as H1
    const h1 = page.locator('h1:has-text("Main Heading")');
    await expect(h1).toBeVisible();
    
    // Test: Secondary heading should be rendered as H2
    const h2 = page.locator('h2:has-text("Secondary Heading")');
    await expect(h2).toBeVisible();
    
    // Test: Third level heading should be rendered as H3
    const h3 = page.locator('h3:has-text("Third Level Heading")');
    await expect(h3).toBeVisible();
    
    // Test: Paragraph should be rendered as P
    const paragraph = page.locator('p:has-text("This is a paragraph with regular text.")');
    await expect(paragraph).toBeVisible();
    
    console.log('✅ Heading rendering test passed');
  });

  test('should render bold and italic text properly', async ({ page, request }) => {
    console.log('📝 Testing bold and italic text rendering');
    
    const markdownContent = `This is **bold text** and this is *italic text*.
    
You can also have ***bold and italic*** together.

Some \`inline code\` should be displayed in monospace.`;

    const doc = await createMarkdownDocument(request, 'Text Formatting Test', markdownContent);
    
    await page.goto(`http://localhost:8080/view/${doc.shareId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Test: Bold text should be rendered with <strong> tag
    const boldText = page.locator('strong:has-text("bold text")');
    await expect(boldText).toBeVisible();
    
    // Test: Italic text should be rendered with <em> tag
    const italicText = page.locator('em:has-text("italic text")');
    await expect(italicText).toBeVisible();
    
    // Test: Inline code should be rendered with <code> tag
    const inlineCode = page.locator('code:has-text("inline code")');
    await expect(inlineCode).toBeVisible();
    
    console.log('✅ Text formatting rendering test passed');
  });

  test('should render lists properly', async ({ page, request }) => {
    console.log('📝 Testing list rendering');
    
    const markdownContent = `# Task List Example

- First bullet point
- Second bullet point
- Third bullet point

## Task List

- [ ] Unchecked task
- [x] Completed task
- [ ] Another unchecked task`;

    const doc = await createMarkdownDocument(request, 'List Test', markdownContent);
    
    await page.goto(`http://localhost:8080/view/${doc.shareId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Test: Bullet list should be rendered as UL with LI elements
    const bulletList = page.locator('ul').first();
    await expect(bulletList).toBeVisible();
    
    const firstBullet = page.locator('li:has-text("First bullet point")');
    await expect(firstBullet).toBeVisible();
    
    // Test: Task list should render checkboxes
    const checkedTask = page.locator('input[type="checkbox"][checked]');
    await expect(checkedTask).toBeVisible();
    
    const uncheckedTask = page.locator('input[type="checkbox"]:not([checked])').first();
    await expect(uncheckedTask).toBeVisible();
    
    console.log('✅ List rendering test passed');
  });

  test('should render blockquotes and code blocks properly', async ({ page, request }) => {
    console.log('📝 Testing blockquotes and code blocks');
    
    const markdownContent = `> This is a blockquote
> It can span multiple lines

Here's a code block:

\`\`\`javascript
function hello() {
    console.log("Hello world!");
}
\`\`\`

And some regular text.`;

    const doc = await createMarkdownDocument(request, 'Blockquote and Code Test', markdownContent);
    
    await page.goto(`http://localhost:8080/view/${doc.shareId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Test: Blockquote should be rendered
    const blockquote = page.locator('blockquote');
    await expect(blockquote).toBeVisible();
    await expect(blockquote).toContainText('This is a blockquote');
    
    // Test: Code block should be rendered
    const codeBlock = page.locator('pre code');
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText('function hello()');
    
    console.log('✅ Blockquote and code block rendering test passed');
  });

  test('should NOT show raw markdown syntax in view mode', async ({ page, request }) => {
    console.log('📝 Testing that raw markdown syntax is not visible');
    
    const markdownContent = `# This Should Be a Heading

**This should be bold** not surrounded by asterisks.

*This should be italic* not surrounded by single asterisks.

\`This should be code\` not surrounded by backticks.`;

    const doc = await createMarkdownDocument(request, 'Raw Markdown Test', markdownContent);
    
    await page.goto(`http://localhost:8080/view/${doc.shareId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Get the content area
    const content = page.locator('.prose');
    const textContent = await content.textContent();
    
    // Test: Raw markdown symbols should NOT be visible in the text
    expect(textContent).not.toContain('**This should be bold**');
    expect(textContent).not.toContain('*This should be italic*');
    expect(textContent).not.toContain('`This should be code`');
    expect(textContent).not.toContain('# This Should Be a Heading');
    
    // Test: But the actual content should be visible
    expect(textContent).toContain('This should be bold');
    expect(textContent).toContain('This should be italic');
    expect(textContent).toContain('This should be code');
    expect(textContent).toContain('This Should Be a Heading');
    
    console.log('✅ Raw markdown syntax invisibility test passed');
  });
});

console.log('🧪 View Mode Markdown Rendering Test Suite Loaded!');