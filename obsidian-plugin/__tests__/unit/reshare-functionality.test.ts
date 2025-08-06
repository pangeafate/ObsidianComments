/**
 * TDD Tests for Re-share Button Functionality
 * 
 * FAILING TESTS - Will make these pass with implementation
 * 
 * Requirement: When clicking "Re-share" button, update the node in database
 */

import { ShareManager } from '../../src/share-manager';
import { ApiClient } from '../../src/api-client';

// Mock the API client
jest.mock('../../src/api-client');

describe('Re-share Button Functionality', () => {
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

  describe('When re-sharing an existing shared note', () => {
    it('should call updateNote API with the current content', async () => {
      // Arrange
      const existingSharedContent = `---
shareId: test-share-123
shareUrl: https://test.example.com/editor/test-share-123  
sharedAt: 2025-08-06T10:00:00Z
---
# Updated Note Title
This is the updated content of the note.`;

      mockApiClient.updateNote.mockResolvedValue({
        success: true,
        shareId: 'test-share-123',
        message: 'Note updated successfully'
      });

      // Act
      const result = await shareManager.reshareNote(existingSharedContent);

      // Assert
      expect(mockApiClient.updateNote).toHaveBeenCalledWith('test-share-123', existingSharedContent);
      expect(result.wasUpdate).toBe(true);
      expect(result.shareId).toBe('test-share-123');
    });

    it('should preserve existing share metadata when re-sharing', async () => {
      // Arrange
      const existingSharedContent = `---
shareId: test-share-456
shareUrl: https://test.example.com/editor/test-share-456
sharedAt: 2025-08-06T10:00:00Z
---
# My Note
Updated content here.`;

      mockApiClient.updateNote.mockResolvedValue({
        success: true,
        shareId: 'test-share-456',
        message: 'Note updated successfully'
      });

      // Act
      const result = await shareManager.reshareNote(existingSharedContent);

      // Assert
      expect(result.updatedContent).not.toContain('shareId: test-share-456'); // shareId removed
      expect(result.updatedContent).toContain('shareUrl: https://test.example.com/editor/test-share-456');
      expect(result.updatedContent).toContain('sharedAt:'); // Updated timestamp
    });

    it('should update sharedAt timestamp when re-sharing', async () => {
      // Arrange
      const existingSharedContent = `---
shareId: test-share-789
shareUrl: https://test.example.com/editor/test-share-789
sharedAt: 2025-08-05T10:00:00Z
---
# Another Note
Some content.`;

      const currentTime = '2025-08-06T15:30:00Z';
      jest.spyOn(global, 'Date').mockImplementation(() => ({
        toISOString: () => currentTime
      } as any));

      mockApiClient.updateNote.mockResolvedValue({
        success: true,
        shareId: 'test-share-789',
        message: 'Note updated successfully'
      });

      // Act
      const result = await shareManager.reshareNote(existingSharedContent);

      // Assert
      expect(result.updatedContent).toContain(`sharedAt: ${currentTime}`);
      expect(result.updatedContent).not.toContain('sharedAt: 2025-08-05T10:00:00Z');
    });

    it('should handle API errors gracefully during re-share', async () => {
      // Arrange
      const existingSharedContent = `---
shareId: test-share-error
shareUrl: https://test.example.com/editor/test-share-error
sharedAt: 2025-08-06T10:00:00Z
---
# Error Test Note
This will fail to update.`;

      mockApiClient.updateNote.mockRejectedValue(new Error('Server error'));

      // Act & Assert
      await expect(shareManager.reshareNote(existingSharedContent))
        .rejects
        .toThrow('Server error');
    });
  });

  describe('When trying to re-share a non-shared note', () => {
    it('should treat it as a new share', async () => {
      // Arrange
      const nonSharedContent = `# New Note
This note has never been shared before.`;

      mockApiClient.shareNote.mockResolvedValue({
        shareUrl: 'https://test.example.com/editor/new-share-123',
        shareId: 'new-share-123',
        createdAt: '2025-08-06T15:30:00Z'
      });

      // Act
      const result = await shareManager.reshareNote(nonSharedContent);

      // Assert
      expect(mockApiClient.shareNote).toHaveBeenCalled();
      expect(result.wasUpdate).toBe(false);
      expect(result.shareId).toBe('new-share-123');
    });
  });
});