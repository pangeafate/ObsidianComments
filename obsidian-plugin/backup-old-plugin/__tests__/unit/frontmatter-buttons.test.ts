/**
 * TDD Tests for Front Matter Button Visibility
 * 
 * FAILING TESTS - Will make these pass with implementation
 * 
 * Requirements:
 * 1. Buttons should be visible in frontmatter (not need to unfold)
 * 2. Remove shareId property from frontmatter (only keep shareUrl)
 */

import { ShareManager } from '../../src/share-manager';
import { ApiClient } from '../../src/api-client';

// Mock the API client
jest.mock('../../src/api-client');

describe('Front Matter Button Visibility and Cleanup', () => {
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

  describe('ShareId property removal from frontmatter', () => {
    it('should not add shareId to frontmatter when sharing new note', async () => {
      // Arrange
      const content = `# Test Note
This is a test note for sharing.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/no-shareid-123',
        shareId: 'no-shareid-123',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      const result = await shareManager.shareNote(content);

      // Assert
      expect(result.updatedContent).not.toContain('shareId:');
      expect(result.updatedContent).toContain('shareUrl: https://test.example.com/editor/no-shareid-123');
      expect(result.updatedContent).toContain('sharedAt: 2025-08-06T10:00:00Z');
    });

    it('should remove existing shareId from frontmatter when re-sharing', async () => {
      // Arrange
      const contentWithShareId = `---
shareId: old-share-456
shareUrl: https://test.example.com/editor/old-share-456
sharedAt: 2025-08-05T10:00:00Z
---
# Updated Note
This note has been updated.`;

      mockApiClient.updateNote.mockResolvedValue({
        success: true,
        shareId: 'old-share-456',
        message: 'Updated successfully'
      });

      // Act
      const result = await shareManager.shareNote(contentWithShareId);

      // Assert
      expect(result.updatedContent).not.toContain('shareId:');
      expect(result.updatedContent).toContain('shareUrl: https://test.example.com/editor/old-share-456');
      
      // Should have updated timestamp but no shareId
      const lines = result.updatedContent.split('\n');
      const frontmatterLines = lines.slice(1, -1).filter(line => line.trim() !== '---');
      const hasShareId = frontmatterLines.some(line => line.trim().startsWith('shareId:'));
      const hasShareUrl = frontmatterLines.some(line => line.trim().startsWith('shareUrl:'));
      const hasSharedAt = frontmatterLines.some(line => line.trim().startsWith('sharedAt:'));
      
      expect(hasShareId).toBe(false);
      expect(hasShareUrl).toBe(true);
      expect(hasSharedAt).toBe(true);
    });

    it('should clean up shareId when unsharing notes', async () => {
      // Arrange
      const contentWithShareId = `---
title: My Note
shareId: cleanup-test-789
shareUrl: https://test.example.com/editor/cleanup-test-789
sharedAt: 2025-08-06T10:00:00Z
tags: [work, important]
---
# My Note
Content to be unshared.`;

      mockApiClient.deleteShare.mockResolvedValue({
        success: true,
        message: 'Deleted successfully'
      });

      // Act
      const result = await shareManager.unshareNote(contentWithShareId);

      // Assert
      expect(result).not.toContain('shareId:');
      expect(result).not.toContain('shareUrl:');
      expect(result).not.toContain('sharedAt:');
      
      // Should preserve other frontmatter
      expect(result).toContain('title: My Note');
      expect(result).toContain('tags: [work, important]');
    });
  });

  describe('Frontmatter structure for button visibility', () => {
    it('should create clean frontmatter structure for better button visibility', async () => {
      // Arrange
      const content = `---
title: Existing Note
tags: [test]
---
# Existing Note
Content with existing frontmatter.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/clean-fm-123',
        shareId: 'clean-fm-123',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      const result = await shareManager.shareNote(content);

      // Assert
      const lines = result.updatedContent.split('\n');
      
      // Check frontmatter structure
      expect(lines[0]).toBe('---');
      expect(lines).toContain('title: Existing Note');
      expect(lines).toContain('tags: [test]');
      expect(lines).toContain('shareUrl: https://test.example.com/editor/clean-fm-123');
      expect(lines).toContain('sharedAt: 2025-08-06T10:00:00Z');
      
      // Should NOT contain shareId
      expect(result.updatedContent).not.toContain('shareId:');
      
      // Should have proper frontmatter end
      const frontmatterEndIndex = lines.findIndex((line, index) => 
        index > 0 && line === '---'
      );
      expect(frontmatterEndIndex).toBeGreaterThan(0);
    });

    it('should maintain frontmatter organization for plugin button integration', async () => {
      // Arrange
      const content = `# Simple Note
No existing frontmatter here.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/simple-fm-456',
        shareId: 'simple-fm-456',
        createdAt: '2025-08-06T10:00:00Z'
      });

      // Act
      const result = await shareManager.shareNote(content);

      // Assert
      const lines = result.updatedContent.split('\n');
      
      // Should create proper frontmatter block
      expect(lines[0]).toBe('---');
      expect(lines[1]).toBe('shareUrl: https://test.example.com/editor/simple-fm-456');
      expect(lines[2]).toBe('sharedAt: 2025-08-06T10:00:00Z');
      expect(lines[3]).toBe('---');
      expect(lines[4]).toBe('# Simple Note');
      
      // Verify no shareId is added
      expect(result.updatedContent).not.toContain('shareId:');
    });
  });

  describe('Backward compatibility with existing shareId', () => {
    it('should still be able to extract shareId from existing notes for operations', async () => {
      // Arrange
      const legacyContent = `---
shareId: legacy-123
shareUrl: https://test.example.com/editor/legacy-123
sharedAt: 2025-08-01T10:00:00Z
---
# Legacy Note
This note has old shareId format.`;

      // Act
      const shareId = shareManager.getShareId(legacyContent);
      const isShared = shareManager.isNoteShared(legacyContent);

      // Assert
      expect(shareId).toBe('legacy-123');
      expect(isShared).toBe(true);
    });

    it('should prefer shareUrl over shareId when both exist', async () => {
      // Arrange
      const mixedContent = `---
shareId: old-id-456
shareUrl: https://test.example.com/editor/new-id-789
sharedAt: 2025-08-06T10:00:00Z
---
# Mixed Format Note
Has both old and new format.`;

      // Act
      const shareId = shareManager.getShareId(mixedContent);

      // Assert
      expect(shareId).toBe('new-id-789'); // Should extract from URL, not old shareId field
    });

    it('should clean up both shareId and shareUrl when unsharing mixed format', async () => {
      // Arrange
      const mixedContent = `---
title: Mixed Note
shareId: mixed-cleanup-999
shareUrl: https://test.example.com/editor/mixed-cleanup-999
sharedAt: 2025-08-06T10:00:00Z
author: John Doe
---
# Mixed Note
Content with mixed sharing format.`;

      mockApiClient.deleteShare.mockResolvedValue({
        success: true,
        message: 'Deleted successfully'
      });

      // Act
      const result = await shareManager.unshareNote(mixedContent);

      // Assert
      expect(result).not.toContain('shareId:');
      expect(result).not.toContain('shareUrl:');
      expect(result).not.toContain('sharedAt:');
      
      // Should preserve non-sharing metadata
      expect(result).toContain('title: Mixed Note');
      expect(result).toContain('author: John Doe');
    });
  });
});