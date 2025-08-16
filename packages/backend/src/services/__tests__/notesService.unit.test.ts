/**
 * Pure unit tests for notesService with comprehensive coverage
 * Tests all functions and edge cases with proper mocks
 */

import { NotFoundError, ValidationError } from '../../utils/errors';

// Create mock objects that will be hoisted
const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    document: {
      create: mockCreate,
      findUnique: mockFindUnique,
      update: mockUpdate,
      delete: mockDelete,
      findMany: mockFindMany,
      count: mockCount,
    },
  })),
}));

jest.mock('../../utils/html-sanitizer', () => ({
  sanitizeHtml: jest.fn((html) => `sanitized-${html}`),
  cleanMarkdownContent: jest.fn((content) => `clean-${content}`),
}));

jest.mock('yjs', () => ({
  Doc: jest.fn(() => ({
    getXmlFragment: jest.fn(() => ({
      insert: jest.fn(),
    })),
  })),
  XmlElement: jest.fn(() => ({
    insert: jest.fn(),
  })),
  XmlText: jest.fn(() => ({
    insert: jest.fn(),
  })),
  encodeStateAsUpdate: jest.fn(() => new Uint8Array([1, 2, 3, 4])),
}));

// Import after mocks
import { createSharedNote, getSharedNote, updateSharedNote, deleteSharedNote } from '../notesService';

// Import mocked functions
const { sanitizeHtml, cleanMarkdownContent } = require('../../utils/html-sanitizer');

describe('NotesService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  describe('createSharedNote', () => {
    const mockCreatedDocument = {
      id: 'test-doc-123',
      title: 'Test Note',
      content: '# Test Content',
      htmlContent: '<h1>Test Content</h1>',
      renderMode: 'html',
      publishedAt: new Date('2024-01-01T00:00:00Z'),
    };

    it('should create a note with basic data', async () => {
      mockCreate.mockResolvedValue(mockCreatedDocument);

      const result = await createSharedNote({
        title: 'Test Note',
        content: '# Test Content',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Note',
          content: 'clean-# Test Content',
          yjsState: expect.any(Buffer),
          htmlContent: null,
          renderMode: 'markdown',
          metadata: expect.objectContaining({
            source: 'obsidian-plugin',
            createdVia: 'api'
          }),
        }),
      });

      expect(result).toEqual({
        shareId: 'test-doc-123',
        shareUrl: 'http://localhost:3001/editor/test-doc-123',
        viewUrl: 'http://localhost:3001/view/test-doc-123',
        editUrl: 'http://localhost:3001/editor/test-doc-123',
        title: 'Test Note',
        createdAt: expect.any(String),
        permissions: 'edit',
        version: 1,
      });
    });

    it('should create a note with HTML content', async () => {
      mockCreate.mockResolvedValue(mockCreatedDocument);

      const result = await createSharedNote({
        title: 'HTML Note',
        htmlContent: '<p>HTML content</p>',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'HTML Note',
          htmlContent: 'sanitized-<p>HTML content</p>',
          renderMode: 'html',
          yjsState: expect.any(Buffer),
        }),
      });

      expect(result.shareId).toBe('test-doc-123');
    });

    it('should handle metadata', async () => {
      mockCreate.mockResolvedValue(mockCreatedDocument);

      const metadata = { source: 'obsidian', tags: ['note', 'test'] };
      await createSharedNote({
        title: 'Note with metadata',
        content: 'Content',
        metadata,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            ...metadata,
            source: 'obsidian-plugin',
            createdVia: 'api'
          }),
        }),
      });
    });

    it('should use default frontend URL when env var not set', async () => {
      delete process.env.FRONTEND_URL;
      mockCreate.mockResolvedValue(mockCreatedDocument);

      const result = await createSharedNote({
        title: 'Test',
        content: 'Content',
      });

      expect(result.viewUrl).toBe('http://localhost:5173/view/test-doc-123');
      expect(result.editUrl).toBe('http://localhost:5173/editor/test-doc-123');
      expect(result.shareUrl).toBe('http://localhost:5173/editor/test-doc-123');
    });

    it('should handle database creation errors', async () => {
      mockCreate.mockRejectedValue(new Error('Database connection failed'));

      await expect(createSharedNote({
        title: 'Test',
        content: 'Content',
      })).rejects.toThrow('Database connection failed');
    });

    it('should sanitize content appropriately', async () => {
      mockCreate.mockResolvedValue(mockCreatedDocument);

      await createSharedNote({
        title: 'Test',
        content: 'Markdown content',
        htmlContent: '<script>alert("xss")</script>',
      });

      expect(cleanMarkdownContent).toHaveBeenCalledWith('Markdown content');
      expect(sanitizeHtml).toHaveBeenCalledWith('<script>alert("xss")</script>');
    });
  });

  describe('getSharedNote', () => {
    const mockDocument = {
      id: 'test-doc-123',
      title: 'Test Note',
      content: '# Test Content',
      htmlContent: '<h1>Test Content</h1>',
      renderMode: 'html',
      publishedAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      metadata: { source: 'test' },
    };

    it('should retrieve an existing note', async () => {
      mockFindUnique.mockResolvedValue(mockDocument);

      const result = await getSharedNote('test-doc-123');

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'test-doc-123' },
      });

      expect(result).toEqual({
        shareId: 'test-doc-123',
        title: 'Test Note',
        content: '# Test Content',
        htmlContent: '<h1>Test Content</h1>',
        renderMode: 'html',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        permissions: 'edit',
        shareUrl: 'http://localhost:3001/editor/test-doc-123',
        viewUrl: 'http://localhost:3001/view/test-doc-123',
        version: 1,
      });
    });

    it('should throw NotFoundError for non-existent note', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(getSharedNote('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(getSharedNote('nonexistent')).rejects.toThrow('Shared note not found. It may have been deleted.');
    });

    it('should handle database query errors', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database error'));

      await expect(getSharedNote('test-doc-123')).rejects.toThrow('Database error');
    });

    it('should handle missing or invalid shareId', async () => {
      mockFindUnique.mockResolvedValue(null);
      
      await expect(getSharedNote('')).rejects.toThrow(NotFoundError);
      await expect(getSharedNote(null as any)).rejects.toThrow(NotFoundError);
      await expect(getSharedNote(undefined as any)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateSharedNote', () => {
    const mockUpdatedDocument = {
      id: 'test-doc-123',
      title: 'Updated Note',
      content: '# Updated Content',
      htmlContent: '<h1>Updated Content</h1>',
      renderMode: 'html',
      publishedAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    };

    it('should update note title and content', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'test-doc-123',
        title: 'Original Note',
        content: '# Original Content',
      });
      mockUpdate.mockResolvedValue(mockUpdatedDocument);

      const result = await updateSharedNote('test-doc-123', {
        title: 'Updated Note',
        content: '# Updated Content',
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-doc-123' },
        data: expect.objectContaining({
          title: 'Updated Note',
          content: '# Updated Content',
          updatedAt: expect.any(Date),
        }),
      });

      expect(result).toEqual({
        shareId: 'test-doc-123',
        title: 'Updated Note',
        content: '# Updated Content',
        htmlContent: '<h1>Updated Content</h1>',
        renderMode: 'html',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        permissions: 'edit',
        shareUrl: 'http://localhost:3001/editor/test-doc-123',
        viewUrl: 'http://localhost:3001/view/test-doc-123',
      });
    });

    it('should update HTML content', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'test-doc-123',
        title: 'Test Note',
        content: '# Test Content',
      });
      mockUpdate.mockResolvedValue(mockUpdatedDocument);

      await updateSharedNote('test-doc-123', {
        htmlContent: '<p>New HTML content</p>',
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-doc-123' },
        data: expect.objectContaining({
          htmlContent: 'sanitized-<p>New HTML content</p>',
          renderMode: 'html',
        }),
      });
    });

    it('should throw NotFoundError for non-existent note', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(updateSharedNote('nonexistent', { title: 'New Title' }))
        .rejects.toThrow(NotFoundError);
    });

    it('should handle validation errors', async () => {
      await expect(updateSharedNote('', { title: 'New Title' }))
        .rejects.toThrow(NotFoundError);
    });

    it('should handle database update errors', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'test-doc-123',
        title: 'Test Note',
        content: '# Test Content',
      });
      mockUpdate.mockRejectedValue(new Error('Database update failed'));

      await expect(updateSharedNote('test-doc-123', { title: 'New Title' }))
        .rejects.toThrow('Database update failed');
    });

    it('should update metadata', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'test-doc-123',
        title: 'Test Note',
        content: '# Test Content',
      });
      mockUpdate.mockResolvedValue(mockUpdatedDocument);

      const newMetadata = { updated: true, version: 2 };
      await updateSharedNote('test-doc-123', {
        metadata: newMetadata,
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-doc-123' },
        data: expect.objectContaining({
          metadata: newMetadata,
        }),
      });
    });

    it('should handle partial updates', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'test-doc-123',
        title: 'Original Title',
        content: '# Original Content',
      });
      mockUpdate.mockResolvedValue(mockUpdatedDocument);

      await updateSharedNote('test-doc-123', {
        title: 'Only title update',
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-doc-123' },
        data: expect.objectContaining({
          title: 'Only title update',
          updatedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('deleteSharedNote', () => {
    it('should delete an existing note', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'test-doc-123',
        title: 'Deleted Note',
      });
      mockDelete.mockResolvedValue({
        id: 'test-doc-123',
        title: 'Deleted Note',
      });

      const result = await deleteSharedNote('test-doc-123');

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'test-doc-123' },
        select: { id: true, title: true }
      });
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: 'test-doc-123' },
      });

      expect(result).toEqual({
        success: true,
        message: 'Note deleted successfully',
        deletedNoteId: 'test-doc-123',
        title: 'Deleted Note',
        notifyCollaborators: true
      });
    });

    it('should throw NotFoundError for non-existent note', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(deleteSharedNote('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(deleteSharedNote('nonexistent')).rejects.toThrow('Shared note not found. It may have already been deleted.');
    });

    it('should handle validation errors', async () => {
      await expect(deleteSharedNote('')).rejects.toThrow(NotFoundError);
      await expect(deleteSharedNote(null as any)).rejects.toThrow(NotFoundError);
      await expect(deleteSharedNote(undefined as any)).rejects.toThrow(NotFoundError);
    });

    it('should handle database deletion errors', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'test-doc-123',
        title: 'Test Note',
      });
      mockDelete.mockRejectedValue(new Error('Database deletion failed'));

      await expect(deleteSharedNote('test-doc-123')).rejects.toThrow('Database deletion failed');
    });
  });

  describe('URL Generation Functions', () => {
    it('should generate correct URLs with default base URL', () => {
      delete process.env.FRONTEND_URL;
      mockFindUnique.mockResolvedValue({
        id: 'test-123',
        title: 'Test',
        content: 'Content',
        publishedAt: new Date(),
        updatedAt: new Date(),
      });

      return getSharedNote('test-123').then(result => {
        expect(result.viewUrl).toBe('http://localhost:5173/view/test-123');
        expect(result.shareUrl).toBe('http://localhost:5173/editor/test-123');
      });
    });

    it('should generate correct URLs with custom base URL', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      mockFindUnique.mockResolvedValue({
        id: 'test-123',
        title: 'Test',
        content: 'Content',
        publishedAt: new Date(),
        updatedAt: new Date(),
      });

      return getSharedNote('test-123').then(result => {
        expect(result.viewUrl).toBe('https://example.com/view/test-123');
        expect(result.shareUrl).toBe('https://example.com/editor/test-123');
      });
    });
  });

  describe('Content Sanitization Integration', () => {
    it('should call sanitization functions with correct parameters', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-123',
        title: 'Test',
        content: 'Clean Content',
        htmlContent: 'Clean HTML',
        publishedAt: new Date(),
      });

      await createSharedNote({
        title: 'Test',
        content: 'Raw markdown',
        htmlContent: '<script>alert()</script>',
      });

      expect(cleanMarkdownContent).toHaveBeenCalledWith('Raw markdown');
      expect(sanitizeHtml).toHaveBeenCalledWith('<script>alert()</script>');
    });
  });

  describe('Yjs Document Initialization', () => {
    it('should initialize Yjs document for collaborative editing', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-123',
        title: 'Test',
        content: 'Content',
        publishedAt: new Date(),
      });

      await createSharedNote({
        title: 'Test',
        content: 'Test content for yjs',
      });

      // The Yjs mocks should have been called during the yjsState initialization
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          yjsState: expect.any(Buffer),
        }),
      });
    });

    it('should handle empty content for Yjs initialization', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-123',
        title: 'Empty Note',
        content: '',
        publishedAt: new Date(),
      });

      await createSharedNote({
        title: 'Empty Note',
        content: '',
      });

      // Should still create Yjs document even with empty content
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          yjsState: expect.any(Buffer),
        }),
      });
    });
  });
});