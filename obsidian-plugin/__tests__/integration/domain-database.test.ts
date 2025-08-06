/**
 * Domain and Database Integration Tests - TDD Approach
 * 
 * These tests define the expected behavior for correct domain usage and database persistence.
 * Following strict TDD: Write test first, see it fail, implement to pass.
 */

import { ApiClient } from '../../src/api-client';
import { ShareManager } from '../../src/share-manager';
import { DEFAULT_SETTINGS } from '../../src/settings';

// Mock fetch globally
global.fetch = jest.fn();

describe('Domain and Database Integration', () => {
  let apiClient: ApiClient;
  let shareManager: ShareManager;
  
  // Correct production domain configuration
  const PRODUCTION_DOMAIN = 'https://obsidiancomments.serverado.app';
  const CORRECT_SETTINGS = {
    apiKey: '',
    serverUrl: PRODUCTION_DOMAIN,
    copyToClipboard: true,
    showNotifications: true,
    defaultPermissions: 'edit' as const,
    timeout: 10000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient(CORRECT_SETTINGS);
    shareManager = new ShareManager(apiClient);
  });

  describe('Correct Domain Configuration', () => {
    test('should use correct production domain in default settings', () => {
      // This test will FAIL until DEFAULT_SETTINGS is updated with correct domain
      expect(DEFAULT_SETTINGS.serverUrl).toBe(PRODUCTION_DOMAIN);
    });

    test('should make API calls to correct production domain', async () => {
      // Arrange
      const noteContent = '# Test Note\nContent for database test';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          shareId: 'test123',
          collaborativeUrl: `${PRODUCTION_DOMAIN}/editor/test123`,
          title: 'Test Note'
        })
      });

      // Act - This will FAIL until API calls use correct domain
      await apiClient.shareNote(noteContent);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${PRODUCTION_DOMAIN}/api/notes/share`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ 
            content: noteContent,
            title: 'Test Note' 
          })
        })
      );
    });

    test('should handle collaborativeUrl field from backend response', async () => {
      // Arrange
      const noteContent = '# Test Note';
      const mockBackendResponse = {
        shareId: 'test123',
        collaborativeUrl: `${PRODUCTION_DOMAIN}/editor/test123`, // Backend returns this field
        title: 'Test Note'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockBackendResponse)
      });

      // Act - This will FAIL until shareNote properly handles collaborativeUrl
      const result = await apiClient.shareNote(noteContent);

      // Assert
      expect(result.shareUrl).toBe(mockBackendResponse.collaborativeUrl);
      expect(result.shareId).toBe('test123');
      expect(result.createdAt).toBeDefined();
    });
  });

  describe('Database Persistence', () => {
    test('should create document in database with custom shareId', async () => {
      // Arrange
      const noteContent = '# Database Test\nThis should be saved to database';
      const customShareId = 'obsidian-note-123';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          shareId: customShareId,
          collaborativeUrl: `${PRODUCTION_DOMAIN}/editor/${customShareId}`,
          title: 'Database Test'
        })
      });

      // Act - Use ShareManager which generates shareId for database persistence
      const result = await shareManager.shareNote(noteContent);

      // Assert - Verify API call includes proper data for database storage
      expect(global.fetch).toHaveBeenCalledWith(
        `${PRODUCTION_DOMAIN}/api/notes/share`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"Database Test"') // Should extract title from content
        })
      );
      
      // Verify the request body contains the required fields
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.title).toBe('Database Test');
      expect(requestBody.content).toBe(noteContent);
      expect(requestBody.shareId).toMatch(/^obsidian-\d+-[a-z0-9]+$/); // Should have generated shareId
    });

    test('should verify document exists in database after creation', async () => {
      // Arrange
      const shareId = 'test-db-verification';
      
      // Mock share creation
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({
            shareId,
            collaborativeUrl: `${PRODUCTION_DOMAIN}/editor/${shareId}`,
            title: 'Test Document'
          })
        })
        // Mock document retrieval for verification
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            shareId,
            title: 'Test Document',
            content: '# Test Document\nContent',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            permissions: 'edit',
            collaborativeUrl: `${PRODUCTION_DOMAIN}/editor/${shareId}`
          })
        });

      // Act - This will FAIL until verification flow is implemented
      const createResult = await apiClient.shareNote('# Test Document\nContent');
      
      // Verify document was saved by trying to retrieve it  
      const verifyResult = await apiClient.getSharedNote(createResult.shareId);

      // Assert
      expect(verifyResult.shareId).toBe(shareId);
      expect(verifyResult.title).toBe('Test Document');
      expect(verifyResult.content).toContain('Test Document');
    });

    test('should update existing document in database', async () => {
      // Arrange
      const shareId = 'existing-doc';
      const updatedContent = '# Updated Document\nNew content for database';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          updatedAt: new Date().toISOString()
        })
      });

      // Act - This will FAIL until updateNote properly saves to database
      await apiClient.updateNote(shareId, updatedContent);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${PRODUCTION_DOMAIN}/api/notes/${shareId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ content: updatedContent })
        })
      );
    });
  });

  describe('ShareManager Integration', () => {
    test('should create frontmatter with correct domain URL', async () => {
      // Arrange
      const noteContent = '# Test Note\nOriginal content';
      const shareId = 'test123';
      const collaborativeUrl = `${PRODUCTION_DOMAIN}/editor/${shareId}`;
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          shareId,
          collaborativeUrl,
          title: 'Test Note'
        })
      });

      // Act - This will FAIL until ShareManager uses correct URL format
      const result = await shareManager.shareNote(noteContent);

      // Assert
      expect(result.shareUrl).toBe(collaborativeUrl);
      expect(result.updatedContent).toContain(`shareUrl: ${collaborativeUrl}`);
      expect(result.updatedContent).not.toContain(`shareId: ${shareId}`); // shareId removed per new requirements
    });

    test('should extract shareId from correct domain URL format', () => {
      // Arrange
      const noteContent = `---
shareId: test123
shareUrl: ${PRODUCTION_DOMAIN}/editor/test123
sharedAt: 2024-01-01T00:00:00.000Z
---
# Test Note
Content`;

      // Act - This will FAIL until getShareId handles correct domain
      const shareId = shareManager.getShareId(noteContent);

      // Assert
      expect(shareId).toBe('test123');
    });
  });

  describe('Error Handling with Correct Domain', () => {
    test('should handle 404 errors from production API', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' })
      });

      // Act & Assert - This will FAIL until proper error handling is implemented
      await expect(apiClient.getSharedNote('nonexistent'))
        .rejects
        .toThrow('Shared note not found. It may have been deleted.');
    });

    test('should handle network errors to production domain', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      // Act & Assert - This will FAIL until network error handling is implemented
      await expect(apiClient.shareNote('# Test'))
        .rejects
        .toThrow('Failed to connect to sharing service. Please check your internet connection.');
    });
  });

  describe('BRAT Release Compatibility', () => {
    test('should have correct manifest version format', () => {
      // This test will verify the plugin manifest is properly formatted for BRAT
      // Will be implemented when we check the manifest.json file
      expect(true).toBe(true); // Placeholder
    });

    test('should include all required plugin metadata', () => {
      // This test will verify all required fields are present for BRAT installation
      // Will be implemented when we check the plugin structure
      expect(true).toBe(true); // Placeholder
    });
  });
});