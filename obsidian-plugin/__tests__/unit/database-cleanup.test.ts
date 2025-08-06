/**
 * TDD Tests for Database Cleanup Functionality
 * 
 * FAILING TESTS - Will make these pass with implementation
 * 
 * Requirement: Clean the node from database when clicking Un-Share or Delete button
 */

import { ShareManager } from '../../src/share-manager';
import { ApiClient } from '../../src/api-client';

// Mock the API client
jest.mock('../../src/api-client');

describe('Database Cleanup on Un-share/Delete', () => {
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

  describe('When unsharing a note', () => {
    it('should call deleteShare API to remove from database', async () => {
      // Arrange
      const sharedContent = `---
shareId: test-delete-123
shareUrl: https://test.example.com/editor/test-delete-123
sharedAt: 2025-08-06T10:00:00Z
---
# Note to Delete
This note will be unshared and removed from database.`;

      mockApiClient.deleteShare.mockResolvedValue({
        success: true,
        message: 'Note deleted from database'
      });

      // Act
      await shareManager.unshareNote(sharedContent);

      // Assert
      expect(mockApiClient.deleteShare).toHaveBeenCalledWith('test-delete-123');
      expect(mockApiClient.deleteShare).toHaveBeenCalledTimes(1);
    });

    it('should remove frontmatter even if database deletion fails', async () => {
      // Arrange
      const sharedContent = `---
shareId: test-delete-fail
shareUrl: https://test.example.com/editor/test-delete-fail
sharedAt: 2025-08-06T10:00:00Z
---
# Note with DB Error
This note deletion will fail but frontmatter should be removed.`;

      mockApiClient.deleteShare.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await shareManager.unshareNote(sharedContent);

      // Assert
      expect(mockApiClient.deleteShare).toHaveBeenCalledWith('test-delete-fail');
      expect(result).not.toContain('shareId:');
      expect(result).not.toContain('shareUrl:');
      expect(result).not.toContain('sharedAt:');
      expect(result).toBe('# Note with DB Error\nThis note deletion will fail but frontmatter should be removed.');
    });

    it('should handle 404 errors gracefully (note already deleted)', async () => {
      // Arrange
      const sharedContent = `---
shareId: already-deleted-456
shareUrl: https://test.example.com/editor/already-deleted-456
sharedAt: 2025-08-06T10:00:00Z
---
# Already Deleted Note
This note was already deleted from database.`;

      const notFoundError = new Error('Note not found');
      notFoundError.message = '404: Note not found';
      mockApiClient.deleteShare.mockRejectedValue(notFoundError);

      // Act
      const result = await shareManager.unshareNote(sharedContent);

      // Assert
      expect(mockApiClient.deleteShare).toHaveBeenCalledWith('already-deleted-456');
      expect(result).not.toContain('shareId:');
      expect(result).toBe('# Already Deleted Note\nThis note was already deleted from database.');
    });

    it('should retry database deletion on temporary failures', async () => {
      // Arrange
      const sharedContent = `---
shareId: retry-test-789
shareUrl: https://test.example.com/editor/retry-test-789
sharedAt: 2025-08-06T10:00:00Z
---
# Retry Test Note
This will fail once then succeed.`;

      mockApiClient.deleteShare
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          success: true,
          message: 'Note deleted successfully'
        });

      // Act
      const result = await shareManager.unshareNote(sharedContent);

      // Assert
      expect(mockApiClient.deleteShare).toHaveBeenCalledTimes(2);
      expect(mockApiClient.deleteShare).toHaveBeenCalledWith('retry-test-789');
      expect(result).not.toContain('shareId:');
    });
  });

  describe('Database cleanup verification', () => {
    it('should confirm note is actually deleted from database', async () => {
      // Arrange
      const shareId = 'verify-deletion-123';
      const sharedContent = `---
shareId: ${shareId}
shareUrl: https://test.example.com/editor/${shareId}
sharedAt: 2025-08-06T10:00:00Z
---
# Verification Test
Content to verify deletion.`;

      mockApiClient.deleteShare.mockResolvedValue({
        success: true,
        message: 'Note successfully deleted',
        deletedId: shareId
      });

      // Act
      await shareManager.unshareNote(sharedContent);

      // Assert - Verify the delete call was made with correct parameters
      expect(mockApiClient.deleteShare).toHaveBeenCalledWith(shareId);
      
      // Additional verification could be added here in real implementation
      // to check that the note no longer exists in database
    });

    it('should log deletion attempts for debugging', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const shareId = 'logging-test-456';
      const sharedContent = `---
shareId: ${shareId}
shareUrl: https://test.example.com/editor/${shareId}
sharedAt: 2025-08-06T10:00:00Z
---
# Logging Test
Content for logging test.`;

      mockApiClient.deleteShare.mockResolvedValue({
        success: true,
        message: 'Deleted successfully'
      });

      // Act
      await shareManager.unshareNote(sharedContent);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`🗑️ Attempting to delete note ${shareId}`)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`✅ Successfully deleted note ${shareId}`)
      );

      consoleSpy.mockRestore();
    });
  });
});