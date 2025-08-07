/**
 * Comprehensive Notes Service Tests
 * Following TDD approach - write failing tests first, then implement features
 */

import { createSharedNote, getSharedNote, updateSharedNote, deleteSharedNote } from '../notesService';
import { NotFoundError } from '../../utils/errors';

// Mock the entire notesService module's dependencies
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    document: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }))
}));

jest.mock('../../utils/html-sanitizer', () => ({
  sanitizeHtml: jest.fn((html) => html), // Return HTML as-is for tests
}));

// Get the mocked instance
const { PrismaClient } = require('@prisma/client');
const mockPrismaInstance = new PrismaClient();
const mockPrisma = mockPrismaInstance;

describe('NotesService - Comprehensive Feature Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set test environment variables
    process.env.FRONTEND_URL = 'http://localhost:3001';
  });

  describe('createSharedNote', () => {
    it('should return editUrl along with other URLs', async () => {
      // Arrange
      const mockDocument = {
        id: 'test-doc-123',
        title: 'Test Note',
        content: '# Test Content',
        htmlContent: '<h1>Test Content</h1>',
        renderMode: 'html',
        publishedAt: new Date(),
      };

      mockPrisma.document.create.mockResolvedValue(mockDocument);

      const noteData = {
        title: 'Test Note',
        content: '# Test Content',
        htmlContent: '<h1>Test Content</h1>',
      };

      // Act
      const result = await createSharedNote(noteData, 'test-doc-123');

      // Assert
      expect(result).toHaveProperty('editUrl');
      expect(result).toHaveProperty('viewUrl'); 
      expect(result).toHaveProperty('collaborativeUrl');
      expect(result.editUrl).toBe('http://localhost:3001/editor/test-doc-123');
      expect(result.viewUrl).toBe('http://localhost:3001/view/test-doc-123');
      expect(result.collaborativeUrl).toBe('http://localhost:3001/editor/test-doc-123');
    });

    it('should handle notes without HTML content', async () => {
      // Arrange
      const mockDocument = {
        id: 'markdown-doc-123',
        title: 'Markdown Note',
        content: '# Markdown Content',
        htmlContent: null,
        renderMode: 'markdown',
        publishedAt: new Date(),
      };

      mockPrisma.document.create.mockResolvedValue(mockDocument);

      const noteData = {
        title: 'Markdown Note',
        content: '# Markdown Content',
      };

      // Act
      const result = await createSharedNote(noteData);

      // Assert
      expect(result).toHaveProperty('editUrl');
      expect(result.editUrl).toContain('/editor/');
      expect(result.title).toBe('Markdown Note');
    });
  });

  describe('deleteSharedNote - Real-time notification feature', () => {
    it('should delete note and mark it as deleted for real-time notifications', async () => {
      // Arrange
      const noteId = 'test-note-to-delete';
      mockPrisma.document.delete.mockResolvedValue({
        id: noteId,
        title: 'Deleted Note',
      });

      // Act
      const result = await deleteSharedNote(noteId);

      // Assert
      expect(mockPrisma.document.delete).toHaveBeenCalledWith({
        where: { id: noteId }
      });
      expect(result).toEqual({
        success: true,
        message: 'Note deleted successfully',
        deletedNoteId: noteId,
        notifyCollaborators: true
      });
    });

    it('should throw NotFoundError for non-existent notes', async () => {
      // Arrange
      mockPrisma.document.delete.mockRejectedValue(
        new Error('Record to delete does not exist')
      );

      // Act & Assert
      await expect(deleteSharedNote('non-existent-note'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getSharedNote - Deleted note handling', () => {
    it('should return special message for deleted notes', async () => {
      // Arrange
      mockPrisma.document.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(getSharedNote('deleted-note-id'))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should return note data for existing notes', async () => {
      // Arrange
      const mockNote = {
        id: 'existing-note',
        title: 'Existing Note',
        content: '# Content',
        htmlContent: '<h1>Content</h1>',
        renderMode: 'html',
        publishedAt: new Date(),
        updatedAt: new Date(),
        permissions: 'edit',
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockNote);

      // Act
      const result = await getSharedNote('existing-note');

      // Assert
      expect(result).toMatchObject({
        shareId: 'existing-note',
        title: 'Existing Note',
        content: '# Content',
        htmlContent: '<h1>Content</h1>',
        renderMode: 'html',
        permissions: 'edit',
      });
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('collaborativeUrl');
      expect(result).toHaveProperty('viewUrl');
    });
  });

  describe('updateSharedNote - Title editing feature', () => {
    it('should update note title and return updated URLs', async () => {
      // Arrange
      const noteId = 'note-to-update';
      const updatedData = {
        title: 'Updated Title',
        content: '# Updated Content',
      };

      const mockUpdatedNote = {
        id: noteId,
        title: 'Updated Title',
        content: '# Updated Content',
        htmlContent: null,
        renderMode: 'markdown',
        publishedAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.document.update.mockResolvedValue(mockUpdatedNote);

      // Act
      const result = await updateSharedNote(noteId, updatedData);

      // Assert
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: expect.objectContaining({
          title: 'Updated Title',
          content: '# Updated Content',
        }),
      });

      expect(result).toMatchObject({
        shareId: noteId,
        title: 'Updated Title',
        content: '# Updated Content',
      });
      expect(result).toHaveProperty('collaborativeUrl');
      expect(result).toHaveProperty('viewUrl');
    });

    it('should handle partial updates (title only)', async () => {
      // Arrange
      const noteId = 'note-title-update';
      const mockOriginalNote = {
        id: noteId,
        title: 'Original Title',
        content: '# Original Content',
        htmlContent: null,
        renderMode: 'markdown',
        publishedAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedNote = {
        ...mockOriginalNote,
        title: 'New Title',
        updatedAt: new Date(),
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockOriginalNote);
      mockPrisma.document.update.mockResolvedValue(mockUpdatedNote);

      // Act
      const result = await updateSharedNote(noteId, { title: 'New Title' });

      // Assert
      expect(result.title).toBe('New Title');
      expect(result.content).toBe('# Original Content'); // Should preserve original content
    });
  });
});