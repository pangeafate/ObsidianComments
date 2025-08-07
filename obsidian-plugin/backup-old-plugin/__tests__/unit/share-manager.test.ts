/**
 * ShareManager Tests - TDD Approach
 * 
 * These tests define the behavior of the ShareManager class BEFORE implementation.
 * The ShareManager handles note frontmatter manipulation and share state management.
 */

import { ShareManager } from '../../src/share-manager';
import { TEST_NOTES, MOCK_SHARE_RESPONSES } from '../fixtures/test-notes';
import { ApiClient } from '../../src/api-client';

// Mock ApiClient
jest.mock('../../src/api-client');

describe('ShareManager', () => {
  let shareManager: ShareManager;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = {
      shareNote: jest.fn(),
      updateNote: jest.fn(),
      deleteShare: jest.fn(),
      listShares: jest.fn(),
      testConnection: jest.fn(),
      settings: {
        serverUrl: 'https://obsidiancomments.lakestrom.com',
        apiKey: 'test-key',
        timeout: 5000
      }
    } as any;
    
    // This will FAIL until ShareManager constructor is implemented
    shareManager = new ShareManager(mockApiClient);
  });

  describe('constructor', () => {
    test('should initialize with API client', () => {
      // This test will FAIL until ShareManager is implemented
      expect(shareManager).toBeInstanceOf(ShareManager);
      expect(shareManager.apiClient).toBe(mockApiClient);
    });
  });

  describe('addShareMetadata', () => {
    test('should add frontmatter to note without existing frontmatter', async () => {
      // Arrange
      const { content } = TEST_NOTES.simple;
      const shareId = 'abc123def456';
      const sharedAt = '2024-01-01T00:00:00.000Z';

      // Act - This will FAIL until addShareMetadata is implemented
      const result = await shareManager.addShareMetadata(content, shareId, sharedAt);

      // Assert
      expect(result).toContain('---');
      expect(result).toContain(`shareId: ${shareId}`);
      expect(result).toContain(`sharedAt: ${sharedAt}`);
      expect(result).toContain('# Simple Note');
      expect(result).toContain('This is a simple test note.');
    });

    test('should merge with existing frontmatter', async () => {
      // Arrange
      const { content } = TEST_NOTES.withFrontmatter;
      const shareId = 'def456ghi789';
      const sharedAt = '2024-01-01T00:00:00.000Z';

      // Act - This will FAIL until frontmatter merging is implemented
      const result = await shareManager.addShareMetadata(content, shareId, sharedAt);

      // Assert
      expect(result).toContain('title: Existing Frontmatter');
      expect(result).toContain('tags: [test, note]');
      expect(result).toContain(`shareId: ${shareId}`);
      expect(result).toContain(`sharedAt: ${sharedAt}`);
      expect(result).toContain('# Note with Frontmatter');
    });

    test('should handle note with only frontmatter', async () => {
      // Arrange
      const { content } = TEST_NOTES.onlyFrontmatter;
      const shareId = 'ghi789jkl012';
      const sharedAt = '2024-01-01T00:00:00.000Z';

      // Act - This will FAIL until edge case handling is implemented
      const result = await shareManager.addShareMetadata(content, shareId, sharedAt);

      // Assert
      expect(result).toContain('title: Only Frontmatter');
      expect(result).toContain(`shareId: ${shareId}`);
      expect(result).toContain(`sharedAt: ${sharedAt}`);
    });

    test('should handle empty note', async () => {
      // Arrange
      const { content } = TEST_NOTES.emptyNote;
      const shareId = 'jkl012mno345';
      const sharedAt = '2024-01-01T00:00:00.000Z';

      // Act - This will FAIL until empty note handling is implemented
      const result = await shareManager.addShareMetadata(content, shareId, sharedAt);

      // Assert
      expect(result).toContain('---');
      expect(result).toContain(`shareId: ${shareId}`);
      expect(result).toContain(`sharedAt: ${sharedAt}`);
      expect(result).toContain('---');
    });

    test('should preserve complex content structure', async () => {
      // Arrange
      const { content } = TEST_NOTES.complex;
      const shareId = 'complex123';
      const sharedAt = '2024-01-01T00:00:00.000Z';

      // Act - This will FAIL until complex content preservation is implemented
      const result = await shareManager.addShareMetadata(content, shareId, sharedAt);

      // Assert
      expect(result).toContain(`shareId: ${shareId}`);
      expect(result).toContain('## Section 1');
      expect(result).toContain('```typescript');
      expect(result).toContain('> This is a blockquote');
      expect(result).toContain('$$E = mc^2$$');
      expect(result).toContain('#tag1 #tag2');
      expect(result).toContain('[[Internal Link]]');
    });
  });

  describe('removeShareMetadata', () => {
    test('should remove share metadata from frontmatter', async () => {
      // Arrange
      const noteWithShare = `---
title: Test Note
shareId: abc123def456
sharedAt: 2024-01-01T00:00:00.000Z
tags: [test]
---
# Test Note
Content here`;

      // Act - This will FAIL until removeShareMetadata is implemented
      const result = await shareManager.removeShareMetadata(noteWithShare);

      // Assert
      expect(result).not.toContain('shareId:');
      expect(result).not.toContain('sharedAt:');
      expect(result).toContain('title: Test Note');
      expect(result).toContain('tags: [test]');
      expect(result).toContain('# Test Note');
      expect(result).toContain('Content here');
    });

    test('should remove entire frontmatter if only share metadata exists', async () => {
      // Arrange
      const noteWithOnlyShare = `---
shareId: abc123def456
sharedAt: 2024-01-01T00:00:00.000Z
---
# Test Note
Content here`;

      // Act - This will FAIL until complete frontmatter removal is implemented
      const result = await shareManager.removeShareMetadata(noteWithOnlyShare);

      // Assert
      expect(result).not.toContain('---');
      expect(result).not.toContain('shareId:');
      expect(result).not.toContain('sharedAt:');
      expect(result.trim()).toMatch(/^# Test Note/);
    });

    test('should handle note without share metadata', async () => {
      // Arrange
      const { content } = TEST_NOTES.simple;

      // Act - This will FAIL until non-shared note handling is implemented
      const result = await shareManager.removeShareMetadata(content);

      // Assert
      expect(result).toBe(content); // Should remain unchanged
    });
  });

  describe('isNoteShared', () => {
    test('should detect shared note by frontmatter', () => {
      // Arrange
      const sharedNote = `---
shareId: abc123def456
sharedAt: 2024-01-01T00:00:00.000Z
---
# Shared Note`;

      // Act - This will FAIL until isNoteShared is implemented
      const result = shareManager.isNoteShared(sharedNote);

      // Assert
      expect(result).toBe(true);
    });

    test('should return false for non-shared note', () => {
      // Arrange
      const { content } = TEST_NOTES.simple;

      // Act - This will FAIL until detection logic is implemented
      const result = shareManager.isNoteShared(content);

      // Assert
      expect(result).toBe(false);
    });

    test('should return false for note with other frontmatter', () => {
      // Arrange
      const { content } = TEST_NOTES.withFrontmatter;

      // Act - This will FAIL until accurate detection is implemented
      const result = shareManager.isNoteShared(content);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getShareId', () => {
    test('should extract share ID from frontmatter', () => {
      // Arrange
      const sharedNote = `---
title: Test
shareId: abc123def456
sharedAt: 2024-01-01T00:00:00.000Z
---
# Content`;

      // Act - This will FAIL until getShareId is implemented
      const shareId = shareManager.getShareId(sharedNote);

      // Assert
      expect(shareId).toBe('abc123def456');
    });

    test('should return null for non-shared note', () => {
      // Arrange
      const { content } = TEST_NOTES.simple;

      // Act - This will FAIL until null handling is implemented
      const shareId = shareManager.getShareId(content);

      // Assert
      expect(shareId).toBeNull();
    });

    test('should return null for malformed frontmatter', () => {
      // Arrange
      const malformedNote = `---
title: Test
shareId: 
---
# Content`;

      // Act - This will FAIL until malformed data handling is implemented
      const shareId = shareManager.getShareId(malformedNote);

      // Assert
      expect(shareId).toBeNull();
    });
  });

  describe('shareNote', () => {
    test('should create new share and add metadata', async () => {
      // Arrange
      const { content } = TEST_NOTES.simple;
      mockApiClient.shareNote.mockResolvedValue(MOCK_SHARE_RESPONSES.success);

      // Act - This will FAIL until shareNote workflow is implemented
      const result = await shareManager.shareNote(content);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalledWith(content);
      expect(result.shareUrl).toBe(MOCK_SHARE_RESPONSES.success.shareUrl);
      expect(result.updatedContent).toContain(`shareId: ${MOCK_SHARE_RESPONSES.success.shareId}`);
      expect(result.updatedContent).toContain('# Simple Note');
    });

    test('should update existing share', async () => {
      // Arrange
      const sharedNote = `---
shareId: abc123def456
sharedAt: 2024-01-01T00:00:00.000Z
---
# Updated Note
New content`;
      
      mockApiClient.updateNote.mockResolvedValue({
        shareId: 'abc123def456',
        updatedAt: '2024-01-01T12:00:00.000Z'
      });

      // Act - This will FAIL until update workflow is implemented
      const result = await shareManager.shareNote(sharedNote);

      // Assert
      expect(mockApiClient.updateNote).toHaveBeenCalledWith('abc123def456', sharedNote);
      expect(result.shareId).toBe('abc123def456');
      expect(result.wasUpdate).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      const { content } = TEST_NOTES.simple;
      mockApiClient.shareNote.mockRejectedValue(new Error('API Error'));

      // Act & Assert - This will FAIL until error handling is implemented
      await expect(shareManager.shareNote(content))
        .rejects
        .toThrow('API Error');
    });
  });

  describe('unshareNote', () => {
    test('should delete share and remove metadata', async () => {
      // Arrange
      const sharedNote = `---
title: Test
shareId: abc123def456
sharedAt: 2024-01-01T00:00:00.000Z
---
# Test Note`;

      mockApiClient.deleteShare.mockResolvedValue(undefined);

      // Act - This will FAIL until unshareNote is implemented
      const result = await shareManager.unshareNote(sharedNote);

      // Assert
      expect(mockApiClient.deleteShare).toHaveBeenCalledWith('abc123def456');
      expect(result).not.toContain('shareId:');
      expect(result).not.toContain('sharedAt:');
      expect(result).toContain('title: Test');
      expect(result).toContain('# Test Note');
    });

    test('should handle non-shared note gracefully', async () => {
      // Arrange
      const { content } = TEST_NOTES.simple;

      // Act - This will FAIL until non-shared handling is implemented
      const result = await shareManager.unshareNote(content);

      // Assert
      expect(mockApiClient.deleteShare).not.toHaveBeenCalled();
      expect(result).toBe(content);
    });

    test('should handle API deletion errors', async () => {
      // Arrange
      const sharedNote = `---
shareId: abc123def456
---
# Test`;
      
      mockApiClient.deleteShare.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert - This will FAIL until error handling is implemented
      await expect(shareManager.unshareNote(sharedNote))
        .rejects
        .toThrow('Delete failed');
    });
  });

  describe('frontmatter parsing edge cases', () => {
    test('should handle malformed YAML frontmatter', async () => {
      // Arrange
      const malformedNote = `---
title: Test
invalid yaml: [unclosed
shareId: abc123
---
# Content`;

      // Act - This will FAIL until robust YAML parsing is implemented
      const isShared = shareManager.isNoteShared(malformedNote);
      const shareId = shareManager.getShareId(malformedNote);

      // Assert
      expect(isShared).toBe(false); // Should fail gracefully
      expect(shareId).toBeNull();
    });

    test('should handle frontmatter without closing delimiter', async () => {
      // Arrange
      const incompleteNote = `---
shareId: abc123def456
# Content without closing frontmatter`;

      // Act - This will FAIL until incomplete frontmatter handling is implemented
      const isShared = shareManager.isNoteShared(incompleteNote);

      // Assert
      expect(isShared).toBe(false); // Should not crash
    });

    test('should preserve non-standard frontmatter formats', async () => {
      // Arrange
      const customNote = `---
title: "Test with quotes"
tags: 
  - nested
  - list
shareId: abc123def456
complex:
  nested: value
---
# Content`;

      // Act - This will FAIL until complex YAML handling is implemented
      const result = await shareManager.removeShareMetadata(customNote);

      // Assert
      expect(result).toContain('title: "Test with quotes"');
      expect(result).toContain('tags:');
      expect(result).toContain('  - nested');
      expect(result).toContain('complex:');
      expect(result).not.toContain('shareId:');
    });
  });
});