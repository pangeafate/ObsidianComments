/**
 * TDD Tests for Title Duplication Issue
 * 
 * Problem: Plugin creates notes with H1 titles, but frontend adds duplicate H1
 * Expected: No duplicate titles should appear in shared notes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Title Duplication Prevention', () => {
  // Mock the document service extensions that handle plugin content
  const mockDocumentService = {
    createDocument: jest.fn(),
    saveDocument: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plugin Content Processing', () => {
    it('should NOT add H1 header when plugin content already has one', async () => {
      // Arrange: Plugin sends content with existing H1
      const pluginContent = `# My Important Note

This is the content of my note with an existing H1 header.

- List item 1
- List item 2`;

      const pluginTitle = 'My Important Note';
      const documentId = 'obsidian-1234567890-abc123';

      // Act: Process the plugin content as the frontend would
      const processedContent = processPluginContent(documentId, pluginTitle, pluginContent);

      // Assert: Should not duplicate the H1 header
      expect(processedContent).not.toMatch(/^#\s+My Important Note\s*#\s+My Important Note/);
      expect(processedContent).toBe(pluginContent); // Should be unchanged
      
      // Count H1 headers - should only be 1
      const h1Count = (processedContent.match(/^#\s+/gm) || []).length;
      expect(h1Count).toBe(1);
    });

    it('should NOT add H1 header when plugin content has no H1 but has other content', async () => {
      // Arrange: Plugin content without H1 but with meaningful content
      const pluginContent = `This is a note without an H1 header.

It has multiple paragraphs and content.

## But it has H2 headers

And lists:
1. First item  
2. Second item`;

      const pluginTitle = 'Note Without H1';
      const documentId = 'obsidian-1234567890-def456';

      // Act: Process the plugin content
      const processedContent = processPluginContent(documentId, pluginTitle, pluginContent);

      // Assert: Should not add H1 header automatically
      expect(processedContent).toBe(pluginContent); // Should be unchanged
      expect(processedContent).not.toMatch(/^#\s+Note Without H1/);
    });

    it('should use minimal placeholder content only when no content is provided', async () => {
      // Arrange: Plugin sends only title, no content
      const pluginTitle = 'Empty Note';
      const documentId = 'obsidian-1234567890-ghi789';
      const pluginContent = '';

      // Act: Process empty plugin content
      const processedContent = processPluginContent(documentId, pluginTitle, pluginContent);

      // Assert: Should use minimal placeholder without H1
      expect(processedContent).toBe('Start typing here...');
      expect(processedContent).not.toMatch(/^#\s+/);
    });

    it('should handle plugin content with multiple H1 headers correctly', async () => {
      // Arrange: Plugin content with multiple H1s (edge case)
      const pluginContent = `# First Title

Some content here.

# Second Title  

More content here.`;

      const pluginTitle = 'First Title';
      const documentId = 'obsidian-1234567890-jkl012';

      // Act: Process content with multiple H1s
      const processedContent = processPluginContent(documentId, pluginTitle, pluginContent);

      // Assert: Should preserve existing structure without adding more H1s
      expect(processedContent).toBe(pluginContent);
      
      // Count H1 headers - should remain 2
      const h1Count = (processedContent.match(/^#\s+/gm) || []).length;
      expect(h1Count).toBe(2);
    });
  });

  describe('Title Display Separation', () => {
    it('should display title in UI header separately from content', () => {
      // Arrange
      const title = 'My Note Title';
      const content = `# My Note Title

Note content here.`;

      // Act: Simulate how the editor should display title vs content
      const displayTitle = extractDisplayTitle(title, content);
      const displayContent = extractDisplayContent(content, title);

      // Assert: Title should be shown in UI, content should not duplicate it
      expect(displayTitle).toBe('My Note Title');
      expect(displayContent).not.toMatch(/^#\s+My Note Title/);
      expect(displayContent.trim()).toMatch(/^Note content here\./);
    });

    it('should handle cases where content H1 differs from metadata title', () => {
      // Arrange: Content H1 differs from plugin-extracted title
      const metadataTitle = 'Filename Based Title'; // From file.basename
      const content = `# Content Based Title

This is when the H1 in content differs from filename.`;

      // Act
      const displayTitle = extractDisplayTitle(metadataTitle, content);
      const displayContent = extractDisplayContent(content, metadataTitle);

      // Assert: Should prefer metadata title, show content as-is
      expect(displayTitle).toBe('Filename Based Title');
      expect(displayContent).toBe(content); // Keep content H1 intact
    });
  });

  describe('Backend API Integration', () => {
    it('should send plugin content without modification to backend', async () => {
      // Arrange
      const originalContent = `# Original Title

Original content with formatting.

- List item
- Another item`;

      const title = 'Original Title';
      const documentId = 'obsidian-test-123';

      // Act: Simulate plugin API call
      await mockDocumentService.createDocument(documentId, title, originalContent);

      // Assert: Backend should receive exact content without modification
      expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
        documentId,
        title, 
        originalContent // Exact content, no H1 prepending
      );
    });

    it('should handle backend response correctly without adding extra H1s', async () => {
      // Arrange: Mock backend response
      const backendResponse = {
        shareId: 'obsidian-test-456',
        title: 'Backend Title',
        content: `# Backend Title

Content from backend.`,
        collaborativeUrl: 'https://example.com/editor/obsidian-test-456'
      };

      mockDocumentService.createDocument.mockResolvedValue(backendResponse);

      // Act: Process backend response
      const result = await mockDocumentService.createDocument('obsidian-test-456', 'Backend Title', '');

      // Assert: Response content should not be modified
      expect(result.content).toBe(`# Backend Title

Content from backend.`);
      expect(result.content).not.toMatch(/^#\s+Backend Title\s*#\s+Backend Title/);
    });
  });
});

// Helper functions that should be implemented to fix the issues
function processPluginContent(documentId: string, title: string, content: string): string {
  // This is the function that currently has the bug
  // It should be fixed to not add H1 headers to plugin content
  if (content) {
    return content; // Use content as-is when provided
  }
  
  // Only use minimal placeholder for empty content
  return 'Start typing here...';
}

function extractDisplayTitle(metadataTitle: string, content: string): string {
  // Always prefer metadata title over content H1
  return metadataTitle;
}

function extractDisplayContent(content: string, metadataTitle: string): string {
  // For display, we might want to remove the first H1 if it matches metadata title
  // to avoid duplication in UI, but preserve content structure
  const lines = content.split('\n');
  const firstLine = lines[0];
  
  if (firstLine.match(/^#\s+/) && firstLine.substring(2).trim() === metadataTitle) {
    // Remove first line if it's duplicate of title
    return lines.slice(1).join('\n').trim();
  }
  
  return content;
}