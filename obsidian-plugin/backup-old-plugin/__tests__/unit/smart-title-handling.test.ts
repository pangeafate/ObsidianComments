/**
 * TDD Tests for Smart Title Handling
 * 
 * FAILING TESTS - Will make these pass with implementation
 * 
 * Requirement: Push title of note without duplicating as first line
 * Smart title algorithm should not pull first line and replace title with it
 */

import { ShareManager } from '../../src/share-manager';
import { ApiClient } from '../../src/api-client';

// Mock the API client
jest.mock('../../src/api-client');

describe('Smart Title Handling Without Duplication', () => {
  let shareManager: ShareManager;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = {
      settings: { serverUrl: 'https://test.example.com', apiKey: 'test-key' },
      updateNote: jest.fn(),
      shareNote: jest.fn(),
      deleteShare: jest.fn(),
      testConnection: jest.fn()
    } as jest.Mocked<ApiClient>;
    
    shareManager = new ShareManager(mockApiClient);
  });

  describe('Title extraction and handling', () => {
    it('should extract title from H1 without duplicating content', async () => {
      // Arrange
      const content = `# My Important Note
This is the content of my note.
More content here.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/title-test-123',
        shareId: 'title-test-123',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNote(content);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        content,
        'My Important Note', // Title extracted from H1
        expect.any(String)
      );

      // The content passed to API should NOT be modified to remove the title
      const [passedContent] = mockApiClient.shareNote.mock.calls[0];
      expect(passedContent).toBe(content);
      expect(passedContent).toContain('# My Important Note'); // H1 should remain
    });

    it('should handle notes with frontmatter and H1 title correctly', async () => {
      // Arrange
      const content = `---
tags: [important, work]
created: 2025-08-06
---
# Project Planning Document
## Overview
This is the project overview.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/frontmatter-test-456',
        shareId: 'frontmatter-test-456',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNote(content);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        content,
        'Project Planning Document',
        expect.any(String)
      );

      // Original content structure should be preserved
      const [passedContent] = mockApiClient.shareNote.mock.calls[0];
      expect(passedContent).toContain('---\ntags: [important, work]');
      expect(passedContent).toContain('# Project Planning Document');
      expect(passedContent).toContain('## Overview');
    });

    it('should not modify content structure when updating existing shared note', async () => {
      // Arrange
      const existingSharedContent = `---
shareId: existing-123
shareUrl: https://test.example.com/editor/existing-123
sharedAt: 2025-08-06T10:00:00Z
---
# Updated Title
This content has been updated.
New paragraph added.`;

      mockApiClient.updateNote.mockResolvedValue({
        success: true,
        shareId: 'existing-123',
        message: 'Updated successfully'
      });

      // Act
      const result = await shareManager.shareNote(existingSharedContent);

      // Assert
      expect(mockApiClient.updateNote).toHaveBeenCalledWith(
        'existing-123',
        existingSharedContent // Exact same content, no modifications
      );
      
      // Content structure should be preserved, only sharedAt timestamp updated and shareId removed
      expect(result.updatedContent).toContain('# Updated Title');
      expect(result.updatedContent).toContain('This content has been updated.');
      expect(result.updatedContent).toContain('shareUrl: https://test.example.com/editor/existing-123');
      expect(result.updatedContent).not.toContain('shareId: existing-123');
      expect(result.updatedContent).toContain('sharedAt:'); // New timestamp
    });

    it('should handle notes without H1 titles gracefully', async () => {
      // Arrange
      const content = `This is a note without a heading.
It starts with regular text.
More content follows.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/no-title-789',
        shareId: 'no-title-789',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNote(content);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        content,
        'This is a note without a heading.', // First line becomes title
        expect.any(String)
      );

      // Content should remain unchanged
      const [passedContent] = mockApiClient.shareNote.mock.calls[0];
      expect(passedContent).toBe(content);
    });

    it('should preserve multiple H1 headings in content', async () => {
      // Arrange
      const content = `# First Heading
Some content here.

# Second Heading
More content here.

# Third Heading
Final content.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/multi-h1-999',
        shareId: 'multi-h1-999',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNote(content);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        content,
        'First Heading', // First H1 becomes title
        expect.any(String)
      );

      // All H1 headings should remain in content
      const [passedContent] = mockApiClient.shareNote.mock.calls[0];
      expect(passedContent).toContain('# First Heading');
      expect(passedContent).toContain('# Second Heading');
      expect(passedContent).toContain('# Third Heading');
    });
  });

  describe('Title extraction edge cases', () => {
    it('should handle empty or very short content', async () => {
      // Arrange
      const content = ``;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/empty-content',
        shareId: 'empty-content',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNote(content);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        content,
        'New Document', // Default fallback title
        expect.any(String)
      );
    });

    it('should truncate very long first lines for title', async () => {
      // Arrange
      const longFirstLine = 'This is a very long first line that should be truncated because it exceeds the reasonable title length limit for display purposes';
      const content = `${longFirstLine}
More content follows.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/long-title',
        shareId: 'long-title',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNote(content);

      // Assert
      const [, extractedTitle] = mockApiClient.shareNote.mock.calls[0];
      expect(extractedTitle.length).toBeLessThanOrEqual(60); // Truncated to max 60 chars
      expect(extractedTitle.endsWith('...')).toBe(true);
      
      // But original content should be unchanged
      const [passedContent] = mockApiClient.shareNote.mock.calls[0];
      expect(passedContent).toContain(longFirstLine); // Full line preserved
    });
  });
});