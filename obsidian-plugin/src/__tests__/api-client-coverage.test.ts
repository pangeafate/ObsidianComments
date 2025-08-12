/**
 * Additional tests for api-client.ts to achieve 100% coverage
 */

import { ApiClient } from '../api-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ApiClient - 100% Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Constructor Edge Cases', () => {
    it('should handle empty string API key by setting to empty', () => {
      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: '   ', // Whitespace only
        timeout: 5000
      });
      
      expect(client.settings.apiKey).toBe('');
    });

    it('should handle API key with only whitespace', () => {
      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: '\t\n  \r', // Various whitespace
        timeout: 5000
      });
      
      expect(client.settings.apiKey).toBe('');
    });

    it('should throw error for invalid server URL', () => {
      expect(() => {
        new ApiClient({
          serverUrl: 'not-a-valid-url',
          apiKey: 'test',
          timeout: 5000
        });
      }).toThrow('Invalid server URL');
    });

    it('should use default timeout when not provided', () => {
      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test'
      } as any);
      
      expect(client['timeout']).toBe(5000);
    });
  });

  describe('Error Handling Coverage', () => {
    it('should handle fetch returning null response', async () => {
      mockFetch.mockResolvedValue(null);
      
      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await expect(client.shareNote('content')).rejects.toThrow(
        'Failed to connect to sharing service. Please check your internet connection.'
      );
    });

    it('should handle non-JSON error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await expect(client.shareNote('content')).rejects.toThrow(
        'Server error (500): Internal Server Error'
      );
    });

    it('should handle rate limit response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: jest.fn().mockResolvedValue({ message: 'Rate limit exceeded' })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await expect(client.updateNote('123', 'content')).rejects.toThrow(
        'Too many requests. Please wait a moment and try again.'
      );
    });

    it('should handle authentication error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({})
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'invalid',
        timeout: 5000
      });

      await expect(client.deleteShare('123')).rejects.toThrow(
        'Invalid API key. Please check your settings.'
      );
    });

    it('should handle forbidden error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: jest.fn().mockResolvedValue({})
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await expect(client.listShares()).rejects.toThrow(
        'You do not have permission to perform this action.'
      );
    });

    it('should handle generic client error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Custom error message' })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await expect(client.shareNote('content')).rejects.toThrow('Custom error message');
    });

    it('should handle network error during JSON parsing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Network interrupted'))
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await expect(client.shareNote('content')).rejects.toThrow(
        'Failed to parse server response. The server may be experiencing issues.'
      );
    });
  });

  describe('Request Building Coverage', () => {
    it('should include shareId when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          shareId: 'custom-123',
          shareUrl: 'https://example.com/share/custom-123',
          createdAt: new Date().toISOString()
        })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await client.shareNote('content', 'Title', 'custom-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"shareId":"custom-123"')
        })
      );
    });

    it('should handle undefined title', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          shareId: '123',
          shareUrl: 'https://example.com/share/123',
          createdAt: new Date().toISOString()
        })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await client.shareNote('content', undefined);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"title":"Untitled Document"')
        })
      );
    });
  });

  describe('Delete Share Coverage', () => {
    it('should handle successful delete', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await expect(client.deleteShare('123')).resolves.toBeUndefined();
    });

    it('should handle delete with no response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(null)
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await expect(client.deleteShare('123')).resolves.toBeUndefined();
    });
  });

  describe('Update Note Coverage', () => {
    it('should handle update with only content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          shareId: '123',
          updatedAt: new Date().toISOString(),
          version: 2
        })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      const result = await client.updateNote('123', 'new content');
      
      expect(result.shareId).toBe('123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"content":"new content"')
        })
      );
    });

    it('should handle update with title', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          shareId: '123',
          updatedAt: new Date().toISOString(),
          version: 2
        })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await client.updateNote('123', 'content', 'New Title');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"title":"New Title"')
        })
      );
    });
  });

  describe('List Shares Coverage', () => {
    it('should handle empty list response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          shares: [],
          total: 0
        })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      const result = await client.listShares();
      
      expect(result.shares).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle list with pagination parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          shares: [{ shareId: '1' }, { shareId: '2' }],
          total: 10
        })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      await client.listShares(5, 10);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/notes?limit=5&offset=10',
        expect.any(Object)
      );
    });
  });

  describe('Test Connection Coverage', () => {
    it('should successfully test connection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ status: 'healthy' })
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      const result = await client.testConnection();
      
      expect(result).toBe(true);
    });

    it('should handle connection test failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      const result = await client.testConnection();
      
      expect(result).toBe(false);
    });

    it('should handle connection test with invalid response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503
      });

      const client = new ApiClient({
        serverUrl: 'https://example.com',
        apiKey: 'test',
        timeout: 5000
      });

      const result = await client.testConnection();
      
      expect(result).toBe(false);
    });
  });
});