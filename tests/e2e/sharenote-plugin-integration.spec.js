/**
 * ShareNote Plugin Integration E2E Test
 * 
 * Tests the ShareNote plugin integration with the backend API.
 * This ensures the HTML sharing workflow works end-to-end.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BACKEND_URL = process.env.TEST_URL?.replace(':3001', ':8081') || 'http://localhost:8081';
const API_BASE = `${BACKEND_URL}/api`;

test.describe('ShareNote Plugin Integration', () => {
  test('should share note with HTML content via API', async ({ request }) => {
    // Simulate what the ShareNote plugin would send
    const noteData = {
      title: 'E2E Test Note',
      content: '# E2E Test Note\n\nThis is a test note with **bold** and *italic* text.',
      htmlContent: '<h1>E2E Test Note</h1><p>This is a test note with <strong>bold</strong> and <em>italic</em> text.</p>'
    };

    // Make the API call that the plugin would make
    const response = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    // Verify the response
    expect(response.status()).toBe(201);
    
    const result = await response.json();
    expect(result).toHaveProperty('shareId');
    expect(result).toHaveProperty('viewUrl');
    expect(result).toHaveProperty('editUrl');
    expect(result).toHaveProperty('collaborativeUrl');
    expect(result.title).toBe('E2E Test Note');

    console.log('✅ ShareNote API integration working:', {
      shareId: result.shareId,
      viewUrl: result.viewUrl,
      editUrl: result.editUrl
    });
  });

  test('should retrieve shared note with HTML content', async ({ request }) => {
    // First share a note
    const noteData = {
      title: 'HTML Retrieval Test',
      content: '# HTML Retrieval Test\n\nContent with HTML rendering.',
      htmlContent: '<h1>HTML Retrieval Test</h1><p>Content with HTML rendering.</p>'
    };

    const shareResponse = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    const shareResult = await shareResponse.json();
    const shareId = shareResult.shareId;

    // Retrieve the note
    const getResponse = await request.get(`${API_BASE}/notes/${shareId}`);
    expect(getResponse.status()).toBe(200);

    const note = await getResponse.json();
    expect(note.title).toBe('HTML Retrieval Test');
    expect(note.content).toContain('# HTML Retrieval Test');
    expect(note.htmlContent).toContain('<h1>HTML Retrieval Test</h1>');
    expect(note.renderMode).toBe('html');

    console.log('✅ HTML content retrieval working');
  });

  test('should handle backward compatibility with markdown-only notes', async ({ request }) => {
    // Share a markdown-only note (no HTML)
    const noteData = {
      title: 'Markdown Only Test',
      content: '# Markdown Only Test\n\nThis note has no HTML content.'
    };

    const response = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    expect(response.status()).toBe(201);
    
    const result = await response.json();
    expect(result.title).toBe('Markdown Only Test');

    // Retrieve and verify it's stored as markdown mode
    const getResponse = await request.get(`${API_BASE}/notes/${result.shareId}`);
    const note = await getResponse.json();
    
    expect(note.renderMode).toBe('markdown');
    expect(note.htmlContent).toBeNull();

    console.log('✅ Backward compatibility with markdown-only notes working');
  });

  test('should validate XSS protection in HTML content', async ({ request }) => {
    // Try to share a note with malicious HTML
    const noteData = {
      title: 'XSS Test Note',
      content: '# XSS Test\n\nSafe content',
      htmlContent: '<h1>XSS Test</h1><script>alert("xss")</script><p>Safe content</p>'
    };

    const response = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    expect(response.status()).toBe(201);
    const result = await response.json();

    // Retrieve and verify script tags were removed
    const getResponse = await request.get(`${API_BASE}/notes/${result.shareId}`);
    const note = await getResponse.json();
    
    expect(note.htmlContent).not.toContain('<script>');
    expect(note.htmlContent).toContain('<h1>XSS Test</h1>');
    expect(note.htmlContent).toContain('<p>Safe content</p>');

    console.log('✅ XSS protection working - script tags removed');
  });

  test('should handle CORS headers for Obsidian origin', async ({ request }) => {
    const noteData = {
      title: 'CORS Test',
      content: '# CORS Test\n\nTesting CORS headers.',
      htmlContent: '<h1>CORS Test</h1><p>Testing CORS headers.</p>'
    };

    const response = await request.post(`${API_BASE}/notes/share`, {
      data: noteData,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      }
    });

    // Check CORS headers
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe('app://obsidian.md');
    
    console.log('✅ CORS headers correct for Obsidian origin');
  });
});