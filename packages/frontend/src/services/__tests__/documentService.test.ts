import { documentService } from '../documentService';

// Mock fetch globally
global.fetch = jest.fn();

describe('DocumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadDocument', () => {
    it('should load document from backend API', async () => {
      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'Test Document',
        content: '# Test Document\n\nThis is test content.',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        permissions: 'edit',
        collaborativeUrl: 'http://localhost:5173/editor/test-doc-123'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument
      });

      const result = await documentService.loadDocument('test-doc-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/api/notes/test-doc-123',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result).toEqual(mockDocument);
    });

    it('should throw error when document not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Shared note not found. It may have deleted.',
          code: 'NOT_FOUND'
        })
      });

      await expect(documentService.loadDocument('non-existent')).rejects.toThrow('Document not found');
    });

    it('should throw error when server returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      });

      await expect(documentService.loadDocument('test-doc')).rejects.toThrow('Failed to load document');
    });

    it('should throw error when network request fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(documentService.loadDocument('test-doc')).rejects.toThrow('Network error');
    });
  });

  describe('checkDocumentExists', () => {
    it('should return true when document exists in API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shareId: 'test-doc' })
      });

      const exists = await documentService.checkDocumentExists('test-doc');

      expect(exists).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8081/api/notes/test-doc',
        expect.any(Object)
      );
    });

    it('should return false when document does not exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const exists = await documentService.checkDocumentExists('non-existent');

      expect(exists).toBe(false);
    });

    it('should return false when network error occurs', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const exists = await documentService.checkDocumentExists('test-doc');

      expect(exists).toBe(false);
    });
  });
});