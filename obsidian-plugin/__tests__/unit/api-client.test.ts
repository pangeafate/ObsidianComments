/**
 * API Client Tests - TDD Approach
 * 
 * These tests define the behavior of the ApiClient class BEFORE implementation.
 * Following strict TDD: Write test first, see it fail, implement to pass.
 */

import { ApiClient } from '../../src/api-client';
import { API_RESPONSES, createMockFetch, createMockNetworkError } from '../fixtures/mock-responses';
import { MOCK_SETTINGS } from '../fixtures/test-notes';

// Mock fetch globally
global.fetch = jest.fn();

describe('ApiClient', () => {
  let apiClient: ApiClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient(MOCK_SETTINGS.configured);
  });

  describe('constructor', () => {
    test('should initialize with provided settings', () => {
      // This test will FAIL until ApiClient is implemented
      expect(apiClient).toBeInstanceOf(ApiClient);
      expect(apiClient.settings).toEqual(MOCK_SETTINGS.configured);
    });

    test('should allow empty API key for anonymous usage', () => {
      // Our backend now supports anonymous usage, so empty API key is valid
      expect(() => {
        new ApiClient({ ...MOCK_SETTINGS.configured, apiKey: '' });
      }).not.toThrow();
    });

    test('should throw error if server URL is invalid', () => {
      // This test will FAIL until URL validation is implemented
      expect(() => {
        new ApiClient({ ...MOCK_SETTINGS.configured, serverUrl: 'invalid-url' });
      }).toThrow('Invalid server URL');
    });
  });

  describe('shareNote', () => {
    test('should create share link for note content', async () => {
      // Arrange
      const noteContent = '# Test Note\nThis is test content';
      const mockResponse = API_RESPONSES.share.success;
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse.data)
      });

      // Act - This will FAIL until shareNote method is implemented
      const result = await apiClient.shareNote(noteContent);

      // Assert
      expect(result.shareUrl).toMatch(/^https:\/\/obsidiancomments\.serverado\.app\/editor\//);
      expect(result.shareId).toHaveLength(12);
      expect(result.createdAt).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://obsidiancomments.serverado.app/api/notes/share',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-api-key-12345-abcdef-valid-length`,
            'User-Agent': expect.stringContaining('ObsidianComments')
          }),
          body: JSON.stringify({ content: noteContent, title: "Untitled Document" })
        })
      );
    });

    test('should handle invalid API key error', async () => {
      // Arrange
      const noteContent = '# Test Note';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(API_RESPONSES.share.invalidApiKey.error)
      });

      // Act & Assert - This will FAIL until error handling is implemented
      await expect(apiClient.shareNote(noteContent))
        .rejects
        .toThrow('API key is invalid or expired');
    });

    test('should handle network errors gracefully', async () => {
      // Arrange
      const noteContent = '# Test Note';
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert - This will FAIL until network error handling is implemented
      await expect(apiClient.shareNote(noteContent))
        .rejects
        .toThrow('Failed to connect to sharing service. Please check your internet connection.');
    });

    test('should handle server errors', async () => {
      // Arrange
      const noteContent = '# Test Note';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(API_RESPONSES.share.serverError.error)
      });

      // Act & Assert - This will FAIL until server error handling is implemented
      await expect(apiClient.shareNote(noteContent))
        .rejects
        .toThrow('Server error. Please try again later.');
    });

    test('should include proper headers in request', async () => {
      // Arrange
      const noteContent = '# Test Note';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(API_RESPONSES.share.success.data)
      });

      // Act - This will FAIL until proper headers are implemented
      await apiClient.shareNote(noteContent);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer test-api-key-12345-abcdef-valid-length`,
            'Content-Type': 'application/json',
            'User-Agent': expect.stringContaining('ObsidianComments')
          })
        })
      );
    });
  });

  describe('updateNote', () => {
    test('should update existing shared note', async () => {
      // Arrange
      const shareId = 'abc123def456';
      const updatedContent = '# Updated Note\nNew content';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(API_RESPONSES.update.success.data)
      });

      // Act - This will FAIL until updateNote method is implemented
      const result = await apiClient.updateNote(shareId, updatedContent);

      // Assert
      expect(result.shareId).toBe(shareId);
      expect(result.updatedAt).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        `https://obsidiancomments.serverado.app/api/notes/${shareId}`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': `Bearer test-api-key-12345-abcdef-valid-length`,
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ content: updatedContent })
        })
      );
    });

    test('should handle note not found error', async () => {
      // Arrange
      const shareId = 'nonexistent';
      const content = '# Test';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve(API_RESPONSES.update.notFound.error)
      });

      // Act & Assert - This will FAIL until error handling is implemented
      await expect(apiClient.updateNote(shareId, content))
        .rejects
        .toThrow('Shared note not found. It may have been deleted.');
    });
  });

  describe('deleteShare', () => {
    test('should delete shared note', async () => {
      // Arrange
      const shareId = 'abc123def456';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(API_RESPONSES.delete.success.data)
      });

      // Act - This will FAIL until deleteShare method is implemented
      await apiClient.deleteShare(shareId);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `https://obsidiancomments.serverado.app/api/notes/${shareId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${MOCK_SETTINGS.configured.apiKey}`
          })
        })
      );
    });
  });

  describe('listShares', () => {
    test('should retrieve list of shared notes', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(API_RESPONSES.list.success.data)
      });

      // Act - This will FAIL until listShares method is implemented
      const result = await apiClient.listShares();

      // Assert
      expect(result.shares).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.shares[0]).toHaveProperty('shareId');
      expect(result.shares[0]).toHaveProperty('title');
      expect(result.shares[0]).toHaveProperty('shareUrl');
    });

    test('should handle empty share list', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(API_RESPONSES.list.empty.data)
      });

      // Act - This will FAIL until empty list handling is implemented
      const result = await apiClient.listShares();

      // Assert
      expect(result.shares).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('testConnection', () => {
    test('should verify API connection and key validity', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(API_RESPONSES.auth.test.success.data)
      });

      // Act - This will FAIL until testConnection method is implemented
      const result = await apiClient.testConnection();

      // Assert
      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.limits).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://obsidiancomments.serverado.app/api/auth/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${MOCK_SETTINGS.configured.apiKey}`
          })
        })
      );
    });

    test('should handle invalid API key during connection test', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(API_RESPONSES.auth.test.invalid.error)
      });

      // Act & Assert - This will FAIL until error handling is implemented
      await expect(apiClient.testConnection())
        .rejects
        .toThrow('API key is invalid or expired');
    });
  });

  describe('request timeout handling', () => {
    test('should timeout long requests', async () => {
      // Arrange - simulate AbortError which is what happens on timeout
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      // Act & Assert - This will FAIL until timeout handling is implemented
      await expect(apiClient.shareNote('# Test'))
        .rejects
        .toThrow('Request timeout');
    }, 7000); // Test timeout longer than expected request timeout
  });

  describe('rate limiting', () => {
    test('should handle rate limit responses', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve(API_RESPONSES.share.rateLimited.error),
        headers: new Map([['Retry-After', '60']])
      });

      // Act & Assert - This will FAIL until rate limiting is implemented
      await expect(apiClient.shareNote('# Test'))
        .rejects
        .toThrow('Too many requests. Please wait before trying again.');
    });
  });
});