/**
 * Delete Database Integration Tests - TDD Approach
 * 
 * These tests define the expected behavior for deleting notes from the database.
 * Following strict TDD: Write test first, see it fail, implement to pass.
 * 
 * CRITICAL: Delete button should remove note from database, not just local frontmatter!
 */

import { ApiClient } from '../../src/api-client';
import { ShareManager } from '../../src/share-manager';

// Mock fetch globally
global.fetch = jest.fn();

describe('Database Delete Integration', () => {
  let apiClient: ApiClient;
  let shareManager: ShareManager;
  
  const PRODUCTION_DOMAIN = 'https://obsidiancomments.serverado.app';
  const TEST_SETTINGS = {
    apiKey: '',
    serverUrl: PRODUCTION_DOMAIN,
    copyToClipboard: true,
    showNotifications: true,
    defaultPermissions: 'edit' as const,
    timeout: 10000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient(TEST_SETTINGS);
    shareManager = new ShareManager(apiClient);
  });

  describe('Database Delete via API', () => {
    test('should delete note from database when unsharing', async () => {
      // Arrange - Note with share metadata
      const noteWithShare = `---
shareId: test-delete-123
shareUrl: ${PRODUCTION_DOMAIN}/editor/test-delete-123
sharedAt: 2024-01-01T00:00:00.000Z
---
# Test Note to Delete
This note should be deleted from database when unshared.`;

      // Mock successful deletion
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      // Act - This will FAIL until unshareNote calls API delete
      const result = await shareManager.unshareNote(noteWithShare);

      // Assert - Should call DELETE API endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        `${PRODUCTION_DOMAIN}/api/notes/test-delete-123`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      // Assert - Should remove frontmatter from content
      expect(result).toBe('# Test Note to Delete\nThis note should be deleted from database when unshared.');
    });

    test('should handle API delete errors gracefully', async () => {
      // Arrange - Note with share metadata
      const noteWithShare = `---
shareId: non-existent-note
shareUrl: ${PRODUCTION_DOMAIN}/editor/non-existent-note
sharedAt: 2024-01-01T00:00:00.000Z
---
# Test Note
Content here.`;

      // Mock API error (note not found)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Note not found' })
      });

      // Act & Assert - Should handle error but still remove frontmatter
      const result = await shareManager.unshareNote(noteWithShare);

      // Should still remove frontmatter locally even if API call fails
      expect(result).toBe('# Test Note\nContent here.');
      
      // Should have attempted API call
      expect(global.fetch).toHaveBeenCalledWith(
        `${PRODUCTION_DOMAIN}/api/notes/non-existent-note`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    test('should handle network errors during delete', async () => {
      // Arrange
      const noteWithShare = `---
shareId: network-error-test
shareUrl: ${PRODUCTION_DOMAIN}/editor/network-error-test
sharedAt: 2024-01-01T00:00:00.000Z
---
# Network Test
Content here.`;

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert - Should handle network error gracefully
      const result = await shareManager.unshareNote(noteWithShare);

      // Should still remove frontmatter even with network error
      expect(result).toBe('# Network Test\nContent here.');
    });

    test('should not call API if note is not shared', async () => {
      // Arrange - Note without share metadata
      const regularNote = `# Regular Note
This is not a shared note.`;

      // Act - This should PASS without API call
      const result = await shareManager.unshareNote(regularNote);

      // Assert - Should not make any API calls
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Should return content unchanged
      expect(result).toBe(regularNote);
    });
  });

  describe('ShareManager Delete Integration', () => {
    test('should extract shareId and call deleteShare API', async () => {
      // Arrange
      const sharedNote = `---
shareId: api-delete-test
shareUrl: ${PRODUCTION_DOMAIN}/editor/api-delete-test
sharedAt: 2024-01-01T00:00:00.000Z
---
# API Delete Test
Testing API integration.`;

      // Mock API success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      // Act - This will FAIL until shareManager properly calls API
      await shareManager.unshareNote(sharedNote);

      // Assert - Should extract shareId and call API
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${PRODUCTION_DOMAIN}/api/notes/api-delete-test`,
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    test('should handle malformed frontmatter during delete', async () => {
      // Arrange - Note with malformed frontmatter
      const malformedNote = `---
shareUrl: [unclosed array
shareId: malformed-test
invalid yaml: content
---
# Malformed Test
This has bad frontmatter.`;

      // Act - Should handle gracefully
      const result = await shareManager.unshareNote(malformedNote);

      // Assert - Should not crash, should attempt cleanup
      expect(result).toContain('# Malformed Test');
      // Should still call API if shareId can be extracted from malformed YAML
      // (Our shareId extraction is robust enough to handle some malformation)
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling and User Experience', () => {
    test('should log appropriate messages during delete process', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const noteToDelete = `---
shareId: logging-test
shareUrl: ${PRODUCTION_DOMAIN}/editor/logging-test
sharedAt: 2024-01-01T00:00:00.000Z
---
# Logging Test
Test logging during delete.`;

      // Mock API success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      // Act
      await shareManager.unshareNote(noteToDelete);

      // Assert - Should log successful deletion  
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Successfully deleted note logging-test from database')
      );

      // Cleanup
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should retry delete on temporary failures', async () => {
      // Arrange - Note to delete
      const noteToDelete = `---
shareId: retry-test
shareUrl: ${PRODUCTION_DOMAIN}/editor/retry-test
sharedAt: 2024-01-01T00:00:00.000Z
---
# Retry Test
Testing retry logic.`;

      // Mock temporary failure then success
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        });

      // Act - This will FAIL until retry logic is implemented
      const result = await shareManager.unshareNote(noteToDelete);

      // Assert - Should retry and succeed
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toBe('# Retry Test\nTesting retry logic.');
    });
  });

  describe('Integration with Obsidian UI', () => {
    test('should provide proper feedback for delete operations', () => {
      // This test defines the expected behavior for UI integration
      // Will be implemented when UI integration is added
      
      // Expected behavior:
      // - Show progress indicator during delete
      // - Show success message when delete completes
      // - Show error message if delete fails
      // - Allow user to retry on failure
      
      expect(true).toBe(true); // Placeholder for future UI integration
    });

    test('should handle concurrent delete operations', async () => {
      // Arrange - Multiple notes to delete
      const note1 = `---
shareId: concurrent-1
shareUrl: ${PRODUCTION_DOMAIN}/editor/concurrent-1
---
# Concurrent Test 1`;

      const note2 = `---
shareId: concurrent-2  
shareUrl: ${PRODUCTION_DOMAIN}/editor/concurrent-2
---
# Concurrent Test 2`;

      // Mock API responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      // Act - Delete multiple notes concurrently
      const [result1, result2] = await Promise.all([
        shareManager.unshareNote(note1),
        shareManager.unshareNote(note2)
      ]);

      // Assert - Both should succeed
      expect(result1).toContain('# Concurrent Test 1');
      expect(result2).toContain('# Concurrent Test 2');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});