import { extendedDocumentService } from '../documentServiceExtensions';

// Mock fetch globally
global.fetch = jest.fn();

describe('extendedDocumentService', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const mockDocument = {
        id: 'new-doc-id',
        title: 'New Document',
        content: '# New Document\n\nContent here.',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument,
      } as Response);

      const result = await extendedDocumentService.createDocument(
        'new-doc-id',
        'New Document',
        '# New Document\n\nContent here.'
      );

      expect(result).toEqual(mockDocument);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/notes',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: 'new-doc-id',
            title: 'New Document',
            content: '# New Document\n\nContent here.'
          })
        })
      );
    });

    it('should handle creation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid data' }),
      } as Response);

      await expect(
        extendedDocumentService.createDocument('invalid-id', 'Title', 'Content')
      ).rejects.toThrow('Failed to create document');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        extendedDocumentService.createDocument('doc-id', 'Title', 'Content')
      ).rejects.toThrow('Network error');
    });
  });

  describe('saveDocument', () => {
    it('should save document content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await extendedDocumentService.saveDocument('doc-id', 'Updated content');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/notes/doc-id',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: 'Updated content'
          })
        })
      );
    });

    it('should handle save errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Document not found' }),
      } as Response);

      await expect(
        extendedDocumentService.saveDocument('nonexistent-id', 'Content')
      ).rejects.toThrow('Failed to save document');
    });

    it('should handle network errors during save', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        extendedDocumentService.saveDocument('doc-id', 'Content')
      ).rejects.toThrow('Network error');
    });
  });

  describe('updateDocumentTitle', () => {
    it('should update document title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await extendedDocumentService.updateDocumentTitle('doc-id', 'New Title');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/notes/doc-id',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'New Title'
          })
        })
      );
    });

    it('should handle title update errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(
        extendedDocumentService.updateDocumentTitle('nonexistent-id', 'Title')
      ).rejects.toThrow('Failed to update document title');
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await extendedDocumentService.deleteDocument('doc-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/notes/doc-id',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should handle delete errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(
        extendedDocumentService.deleteDocument('nonexistent-id')
      ).rejects.toThrow('Failed to delete document');
    });
  });
});