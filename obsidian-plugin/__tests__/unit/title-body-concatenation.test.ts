/**
 * TDD Tests for Title/Body Concatenation Fix
 * 
 * FAILING TESTS - Will make these pass with implementation
 * 
 * Problem: Obsidian has separate title (filename) and body (content)
 * Editor expects first line to be title, rest to be body
 * Current plugin ignores filename, causes data mismatch
 * 
 * Solution: Concatenate filename + body so editor can extract title properly
 */

import { ShareManager } from '../../src/share-manager';
import { ApiClient } from '../../src/api-client';

// Mock the API client
jest.mock('../../src/api-client');

describe('Title/Body Concatenation Fix', () => {
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

  describe('Content preparation for editor compatibility', () => {
    it('should prepend filename as H1 title when content has no H1', async () => {
      // Arrange
      const filename = 'My Important Document';
      const bodyContent = `This is the body content.
More paragraphs here.
- List items
- More items`;

      const expectedContent = `# My Important Document

This is the body content.
More paragraphs here.
- List items
- More items`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/test-123',
        shareId: 'test-123',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNoteWithFilename(bodyContent, filename);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        expectedContent, // Content with title prepended
        'My Important Document', // Title extracted from filename
        expect.any(String)
      );
    });

    it('should replace existing H1 with filename when content already has H1', async () => {
      // Arrange
      const filename = 'Correct Document Title';
      const bodyContent = `# Wrong Title in Content

This is the body content.
More content here.`;

      const expectedContent = `# Correct Document Title

This is the body content.
More content here.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/test-456',
        shareId: 'test-456',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNoteWithFilename(bodyContent, filename);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        expectedContent,
        'Correct Document Title',
        expect.any(String)
      );
    });

    it('should handle filename with .md extension correctly', async () => {
      // Arrange
      const filename = 'Document.md'; // Obsidian filename with extension
      const bodyContent = `Content without title.`;

      const expectedContent = `# Document

Content without title.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/test-789',
        shareId: 'test-789',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNoteWithFilename(bodyContent, filename);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        expectedContent,
        'Document', // Extension removed
        expect.any(String)
      );
    });

    it('should handle frontmatter correctly when concatenating title', async () => {
      // Arrange
      const filename = 'Document With Frontmatter';
      const bodyContent = `---
tags: [work, important]
created: 2025-08-06
---
Content after frontmatter.`;

      const expectedContent = `---
tags: [work, important]
created: 2025-08-06
---
# Document With Frontmatter

Content after frontmatter.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/test-fm',
        shareId: 'test-fm',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNoteWithFilename(bodyContent, filename);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        expectedContent,
        'Document With Frontmatter',
        expect.any(String)
      );
    });

    it('should preserve existing H1 if it matches the filename', async () => {
      // Arrange
      const filename = 'Matching Title';
      const bodyContent = `# Matching Title

Content that already has the correct title.
This should be preserved as-is.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/test-match',
        shareId: 'test-match',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNoteWithFilename(bodyContent, filename);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        bodyContent, // Content unchanged since title matches
        'Matching Title',
        expect.any(String)
      );
    });
  });

  describe('Edge cases and special characters', () => {
    it('should handle filenames with special characters', async () => {
      // Arrange
      const filename = 'Special: Characters & Symbols!';
      const bodyContent = `Regular content here.`;

      const expectedContent = `# Special: Characters & Symbols!

Regular content here.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/test-special',
        shareId: 'test-special',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNoteWithFilename(bodyContent, filename);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        expectedContent,
        'Special: Characters & Symbols!',
        expect.any(String)
      );
    });

    it('should handle empty content gracefully', async () => {
      // Arrange
      const filename = 'Empty Note';
      const bodyContent = '';

      const expectedContent = `# Empty Note

`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/test-empty',
        shareId: 'test-empty',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNoteWithFilename(bodyContent, filename);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        expectedContent,
        'Empty Note',
        expect.any(String)
      );
    });

    it('should handle very long filenames appropriately', async () => {
      // Arrange
      const filename = 'This is a very long filename that might need to be handled specially in some cases but should generally work fine';
      const bodyContent = `Content for long filename test.`;

      const expectedContent = `# This is a very long filename that might need to be handled specially in some cases but should generally work fine

Content for long filename test.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/test-long',
        shareId: 'test-long',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      await shareManager.shareNoteWithFilename(bodyContent, filename);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(
        expectedContent,
        filename, // Full filename preserved for title
        expect.any(String)
      );
    });
  });

  describe('Integration with existing share functionality', () => {
    it('should work with existing shared notes (re-share scenario)', async () => {
      // Arrange
      const filename = 'Updated Document';
      const existingSharedContent = `---
shareUrl: https://test.example.com/editor/existing-123
sharedAt: 2025-08-05T10:00:00Z
---
# Old Title

Old content that needs updating.`;

      const expectedContent = `---
shareUrl: https://test.example.com/editor/existing-123
sharedAt: 2025-08-05T10:00:00Z
---
# Updated Document

Old content that needs updating.`;

      mockApiClient.updateNote.mockResolvedValue({
        success: true,
        shareId: 'existing-123',
        message: 'Updated successfully'
      });

      // Act
      const result = await shareManager.shareNoteWithFilename(existingSharedContent, filename);

      // Assert
      expect(mockApiClient.updateNote).toHaveBeenCalledWith(
        'existing-123',
        expectedContent // Content with corrected title
      );
      expect(result.wasUpdate).toBe(true);
    });
  });
});