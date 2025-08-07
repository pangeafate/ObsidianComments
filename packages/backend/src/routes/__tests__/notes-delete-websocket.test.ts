import request from 'supertest';
import express from 'express';
import { notesRouter } from '../notes';
import { websocketService } from '../../services/websocketService';
import { errorHandler } from '../../middleware/errorHandler';

// Mock the notes service
jest.mock('../../services/notesService', () => {
  const mockNoteData = {
    id: 'test-note-123',
    title: 'Test Note for Deletion',
    content: '# Test content to be deleted'
  };

  return {
    deleteSharedNote: jest.fn(),
    createSharedNote: jest.fn().mockResolvedValue({
      shareId: mockNoteData.id,
      collaborativeUrl: `http://localhost:5173/editor/${mockNoteData.id}`,
      viewUrl: `http://localhost:5173/view/${mockNoteData.id}`,
      title: mockNoteData.title
    }),
    getSharedNote: jest.fn()
  };
});

// Mock the websocket service
jest.mock('../../services/websocketService', () => ({
  websocketService: {
    notifyNoteDeleted: jest.fn(),
    init: jest.fn(),
    getConnectedClients: jest.fn().mockReturnValue(2)
  }
}));

describe('DELETE /api/notes/:shareId - Enhanced with WebSocket', () => {
  let app: express.Application;
  const mockDeleteSharedNote = require('../../services/notesService').deleteSharedNote;
  const mockWebSocketService = websocketService as jest.Mocked<typeof websocketService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/notes', notesRouter);
    app.use(errorHandler);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Successful deletion', () => {
    it('should delete a note and send WebSocket notification', async () => {
      const shareId = 'test-note-123';
      const mockResult = {
        success: true,
        message: 'Note deleted successfully',
        deletedNoteId: shareId,
        title: 'Test Note for Deletion',
        notifyCollaborators: true
      };

      mockDeleteSharedNote.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete(`/api/notes/${shareId}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toEqual({
        success: true,
        message: 'Note deleted successfully',
        deletedNoteId: shareId,
        title: 'Test Note for Deletion'
      });

      // Verify service was called correctly
      expect(mockDeleteSharedNote).toHaveBeenCalledWith(shareId);
      expect(mockDeleteSharedNote).toHaveBeenCalledTimes(1);

      // Verify WebSocket notification was sent
      expect(mockWebSocketService.notifyNoteDeleted).toHaveBeenCalledWith(shareId);
      expect(mockWebSocketService.notifyNoteDeleted).toHaveBeenCalledTimes(1);
    });

    it('should handle successful deletion without WebSocket notification when disabled', async () => {
      const shareId = 'test-note-456';
      const mockResult = {
        success: true,
        message: 'Note deleted successfully',
        deletedNoteId: shareId,
        title: 'Another Test Note',
        notifyCollaborators: false // WebSocket notification disabled
      };

      mockDeleteSharedNote.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete(`/api/notes/${shareId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify WebSocket notification was NOT sent
      expect(mockWebSocketService.notifyNoteDeleted).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should return 404 when note does not exist', async () => {
      const shareId = 'nonexistent-note';
      const notFoundError = new Error('Shared note not found. It may have already been deleted.');
      notFoundError.name = 'NotFoundError';

      // Mock the service to throw NotFoundError
      const { NotFoundError } = require('../../utils/errors');
      mockDeleteSharedNote.mockRejectedValue(new NotFoundError('Shared note not found. It may have already been deleted.'));

      const response = await request(app)
        .delete(`/api/notes/${shareId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Shared note not found. It may have already been deleted.',
        code: 'NOT_FOUND'
      });

      // Verify WebSocket notification was NOT sent for non-existent note
      expect(mockWebSocketService.notifyNoteDeleted).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid shareId format', async () => {
      const invalidShareId = 'invalid-id-with-special-chars!@#';

      const response = await request(app)
        .delete(`/api/notes/${invalidShareId}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');

      // Service should not be called with invalid ID
      expect(mockDeleteSharedNote).not.toHaveBeenCalled();
      expect(mockWebSocketService.notifyNoteDeleted).not.toHaveBeenCalled();
    });

    it('should handle internal server errors gracefully', async () => {
      const shareId = 'test-note-error';
      const internalError = new Error('Database connection failed');

      mockDeleteSharedNote.mockRejectedValue(internalError);

      const response = await request(app)
        .delete(`/api/notes/${shareId}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });

      // WebSocket notification should not be sent on error
      expect(mockWebSocketService.notifyNoteDeleted).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket integration', () => {
    it('should handle WebSocket service initialization errors gracefully', async () => {
      const shareId = 'test-note-ws-error';
      const mockResult = {
        success: true,
        message: 'Note deleted successfully',
        deletedNoteId: shareId,
        title: 'Test Note',
        notifyCollaborators: true
      };

      mockDeleteSharedNote.mockResolvedValue(mockResult);
      
      // Mock WebSocket service to throw an error
      mockWebSocketService.notifyNoteDeleted.mockImplementation(() => {
        throw new Error('WebSocket notification failed');
      });

      // The deletion should still succeed even if WebSocket fails
      const response = await request(app)
        .delete(`/api/notes/${shareId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify that the service attempted to send notification
      expect(mockWebSocketService.notifyNoteDeleted).toHaveBeenCalledWith(shareId);
    });

    it('should provide correct response format for client integration', async () => {
      const shareId = 'integration-test-note';
      const mockResult = {
        success: true,
        message: 'Note deleted successfully',
        deletedNoteId: shareId,
        title: 'Integration Test Note',
        notifyCollaborators: true
      };

      mockDeleteSharedNote.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete(`/api/notes/${shareId}`)
        .expect(200);

      // Verify all required fields for client integration
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deletedNoteId', shareId);
      expect(response.body).toHaveProperty('title');
      
      // Should NOT include internal fields
      expect(response.body).not.toHaveProperty('notifyCollaborators');
    });
  });

  describe('Multiple concurrent deletions', () => {
    it('should handle multiple concurrent deletion requests', async () => {
      const shareIds = ['note-1', 'note-2', 'note-3'];
      const mockResults = shareIds.map(id => ({
        success: true,
        message: 'Note deleted successfully',
        deletedNoteId: id,
        title: `Test Note ${id}`,
        notifyCollaborators: true
      }));

      mockDeleteSharedNote
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      // Send concurrent requests
      const promises = shareIds.map(shareId =>
        request(app)
          .delete(`/api/notes/${shareId}`)
          .expect(200)
      );

      const responses = await Promise.all(promises);

      // Verify all deletions succeeded
      responses.forEach((response, index) => {
        expect(response.body.success).toBe(true);
        expect(response.body.deletedNoteId).toBe(shareIds[index]);
      });

      // Verify all WebSocket notifications were sent
      expect(mockWebSocketService.notifyNoteDeleted).toHaveBeenCalledTimes(3);
      shareIds.forEach(shareId => {
        expect(mockWebSocketService.notifyNoteDeleted).toHaveBeenCalledWith(shareId);
      });
    });
  });
});