import { BackendAPI } from '../api';

// Mock fetch globally
global.fetch = jest.fn();

describe('BackendAPI', () => {
  let api: BackendAPI;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    api = new BackendAPI('http://localhost:3001');
    jest.clearAllMocks();
  });

  describe('shareNote', () => {
    it('should make correct API call with HTML content', async () => {
      const mockResponse = {
        shareId: 'test-123',
        viewUrl: 'http://localhost:3001/view/test-123',
        editUrl: 'http://localhost:3001/editor/test-123',
        title: 'Test Note'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const shareData = {
        title: 'Test Note',
        content: '# Test\n\nContent',
        htmlContent: '<h1>Test</h1><p>Content</p>'
      };

      const result = await api.shareNote(shareData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/notes/share',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(shareData)
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Validation failed' })
      } as any);

      const shareData = {
        title: 'Test',
        content: 'Content',
        htmlContent: '<p>Content</p>'
      };

      await expect(api.shareNote(shareData)).rejects.toThrow('Validation failed');
    });

    it('should validate response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          // Missing required fields
          shareId: 'test-123'
          // viewUrl is missing
        })
      } as any);

      const shareData = {
        title: 'Test',
        content: 'Content',
        htmlContent: '<p>Content</p>'
      };

      await expect(api.shareNote(shareData)).rejects.toThrow('Invalid response from backend');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const shareData = {
        title: 'Test',
        content: 'Content',
        htmlContent: '<p>Content</p>'
      };

      await expect(api.shareNote(shareData)).rejects.toThrow('Network error');
    });
  });

  describe('deleteShare', () => {
    it('should make correct DELETE request', async () => {
      mockFetch.mockResolvedValue({
        ok: true
      } as any);

      await api.deleteShare('test-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/notes/test-123',
        {
          method: 'DELETE'
        }
      );
    });

    it('should handle delete errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      await expect(api.deleteShare('test-123')).rejects.toThrow('Failed to delete: Not Found');
    });
  });
});