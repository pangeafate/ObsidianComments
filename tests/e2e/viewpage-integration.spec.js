/**
 * ViewPage Integration E2E Test
 * 
 * Tests the ViewPage component with actual backend integration.
 * Validates HTML viewing, markdown fallback, and security features.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';
const FRONTEND_URL = process.env.TEST_URL || 'http://localhost:8080';
const API_BASE = `${BACKEND_URL}/api`;

test.describe('ViewPage Integration', () => {
  test('should display HTML content in ViewPage', async ({ page, request }) => {
    // First create a shared note with HTML content
    const noteData = {
      title: 'HTML ViewPage Test',
      content: '# HTML ViewPage Test\n\nThis note has **bold** and *italic* text.',
      htmlContent: '<h1>HTML ViewPage Test</h1><p>This note has <strong>bold</strong> and <em>italic</em> text.</p>'
    };

    const shareResponse = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    expect(shareResponse.status()).toBe(201);
    const result = await shareResponse.json();
    const shareId = result.shareId;

    // Navigate to ViewPage
    await page.goto(`${FRONTEND_URL}/view/${shareId}`);

    // Should display the document title
    await expect(page.locator('h1').filter({ hasText: 'HTML ViewPage Test' }).first()).toBeVisible();

    // Should display HTML content (not raw markdown)
    await expect(page.locator('.prose strong')).toHaveText('bold');
    await expect(page.locator('.prose em')).toHaveText('italic');

    // Should not display raw markdown syntax
    await expect(page.locator('text=**bold**')).not.toBeVisible();
    await expect(page.locator('text=*italic*')).not.toBeVisible();

    // Should show "HTML View" badge
    await expect(page.locator('text=HTML View')).toBeVisible();

    // Should have edit link
    await expect(page.locator('a', { hasText: 'Edit this document' })).toBeVisible();
  });

  test('should fallback to markdown rendering when no HTML content', async ({ page, request }) => {
    // Create a markdown-only note
    const noteData = {
      title: 'Markdown ViewPage Test',
      content: '# Markdown ViewPage Test\n\nThis note has **bold** and *italic* text.'
      // No htmlContent
    };

    const shareResponse = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    const result = await shareResponse.json();
    const shareId = result.shareId;

    // Navigate to ViewPage
    await page.goto(`${FRONTEND_URL}/view/${shareId}`);

    // Should display the document title
    await expect(page.locator('h1').filter({ hasText: 'Markdown ViewPage Test' }).first()).toBeVisible();

    // Should display rendered HTML from markdown
    await expect(page.locator('.prose strong')).toHaveText('bold');
    await expect(page.locator('.prose em')).toHaveText('italic');

    // Should show "Markdown View" badge
    await expect(page.locator('text=Markdown View')).toBeVisible();
  });

  test('should display document metadata correctly', async ({ page, request }) => {
    // Create a note with specific title
    const noteData = {
      title: 'Metadata Test Note',
      content: '# Different Content Title\n\nThe document title should be the filename, not the content title.',
      htmlContent: '<h1>Different Content Title</h1><p>The document title should be the filename, not the content title.</p>'
    };

    const shareResponse = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    const result = await shareResponse.json();
    const shareId = result.shareId;

    await page.goto(`${FRONTEND_URL}/view/${shareId}`);

    // Should display the provided title (not extracted from content)
    await expect(page.locator('.text-3xl').first()).toHaveText('Metadata Test Note');

    // Should show creation date
    await expect(page.locator('text=Created')).toBeVisible();

    // Should show permissions
    await expect(page.locator('text=access')).toBeVisible();
  });

  test('should handle XSS protection in HTML content', async ({ page, request }) => {
    // Try to create a note with potentially malicious HTML
    const noteData = {
      title: 'XSS Protection Test',
      content: '# XSS Test\n\nSafe content',
      htmlContent: '<h1>XSS Test</h1><script>window.xssTest = true;</script><p>Safe content</p>'
    };

    const shareResponse = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    const result = await shareResponse.json();
    const shareId = result.shareId;

    await page.goto(`${FRONTEND_URL}/view/${shareId}`);

    // Should display safe content
    await expect(page.locator('h1').filter({ hasText: 'XSS Protection Test' }).first()).toBeVisible();
    await expect(page.locator('.prose p')).toHaveText('Safe content');

    // Script should not execute
    const xssExecuted = await page.evaluate(() => window.xssTest);
    expect(xssExecuted).toBeUndefined();

    // Script tags should not be in DOM
    const scriptTags = await page.locator('script').count();
    expect(scriptTags).toBe(0);
  });

  test('should handle non-existent documents gracefully', async ({ page }) => {
    // Try to access a non-existent document
    await page.goto(`${FRONTEND_URL}/view/non-existent-doc-123`);

    // Should show error message
    await expect(page.locator('text=Document Not Found')).toBeVisible();
    await expect(page.locator('text=The document you\'re looking for doesn\'t exist')).toBeVisible();
    await expect(page.locator('text=Return to Home')).toBeVisible();
  });

  test('should navigate between view and edit modes', async ({ page, request }) => {
    // Create a shared note
    const noteData = {
      title: 'Navigation Test',
      content: '# Navigation Test\n\nThis tests navigation between view and edit modes.',
      htmlContent: '<h1>Navigation Test</h1><p>This tests navigation between view and edit modes.</p>'
    };

    const shareResponse = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    const result = await shareResponse.json();
    const shareId = result.shareId;

    // Go to ViewPage
    await page.goto(`${FRONTEND_URL}/view/${shareId}`);

    // Should have edit link
    const editLink = page.locator('a', { hasText: 'Edit this document' });
    await expect(editLink).toBeVisible();

    // Click edit link should navigate to editor
    await editLink.click();
    
    // Should navigate to editor page
    await expect(page).toHaveURL(`${FRONTEND_URL}/editor/${shareId}`);
    
    // Editor should load (basic check)
    await page.waitForLoadState('networkidle');
    
    // Go back to view mode by changing URL
    await page.goto(`${FRONTEND_URL}/view/${shareId}`);
    
    // Should be back in view mode
    await expect(page.locator('h1').filter({ hasText: 'Navigation Test' }).first()).toBeVisible();
    await expect(page.locator('text=HTML View')).toBeVisible();
  });

  test('should be responsive and accessible', async ({ page, request }) => {
    const noteData = {
      title: 'Accessibility Test',
      content: '# Accessibility Test\n\nThis tests accessibility features.',
      htmlContent: '<h1>Accessibility Test</h1><p>This tests accessibility features.</p>'
    };

    const shareResponse = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    const result = await shareResponse.json();
    const shareId = result.shareId;

    await page.goto(`${FRONTEND_URL}/view/${shareId}`);

    // Check basic accessibility
    await expect(page.locator('main, [role="main"], .min-h-screen')).toBeVisible();
    
    // Links should be keyboard accessible
    const editLink = page.locator('a', { hasText: 'Edit this document' });
    await editLink.focus();
    await expect(editLink).toBeFocused();

    // Should work on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1').filter({ hasText: 'Accessibility Test' }).first()).toBeVisible();
    await expect(page.locator('.prose')).toBeVisible();
  });
});