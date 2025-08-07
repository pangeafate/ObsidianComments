import { Server as IOServer } from 'socket.io';
import { createServer } from 'http';
import { WebSocketService } from '../../src/services/websocketService';

describe('WebSocketService', () => {
  let httpServer: any;
  let io: IOServer;
  let websocketService: WebSocketService;

  beforeEach(() => {
    httpServer = createServer();
    io = new IOServer(httpServer);
    websocketService = new WebSocketService(io);
  });

  afterEach(() => {
    io.close();
    httpServer.close();
  });

  describe('notifyNoteDeleted', () => {
    it('should emit note_deleted event to note room', () => {
      // Arrange
      const noteId = 'test-note-123';
      const toSpy = jest.fn().mockReturnValue({
        emit: jest.fn()
      });
      io.to = toSpy;

      // Act
      websocketService.notifyNoteDeleted(noteId);

      // Assert
      expect(toSpy).toHaveBeenCalledWith(noteId);
      expect(toSpy().emit).toHaveBeenCalledWith('note_deleted', {
        noteId,
        message: "Note doesn't exist",
        timestamp: expect.any(String)
      });
    });

    it('should include ISO timestamp in notification', () => {
      // Arrange
      const noteId = 'test-note-456';
      const mockEmit = jest.fn();
      io.to = jest.fn().mockReturnValue({ emit: mockEmit });

      // Act
      websocketService.notifyNoteDeleted(noteId);

      // Assert
      const emitCall = mockEmit.mock.calls[0];
      const payload = emitCall[1];
      expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle invalid note IDs gracefully', () => {
      // Arrange
      const mockEmit = jest.fn();
      io.to = jest.fn().mockReturnValue({ emit: mockEmit });

      // Act & Assert - should not throw
      expect(() => websocketService.notifyNoteDeleted('')).not.toThrow();
      expect(() => websocketService.notifyNoteDeleted('null')).not.toThrow();
      expect(() => websocketService.notifyNoteDeleted('undefined')).not.toThrow();
    });
  });

  describe('joinNoteRoom', () => {
    it('should add socket to note-specific room', () => {
      // Arrange
      const noteId = 'test-note-789';
      const mockSocket = { join: jest.fn() } as any;

      // Act
      websocketService.joinNoteRoom(mockSocket, noteId);

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(noteId);
    });

    it('should handle invalid socket gracefully', () => {
      // Act & Assert - should not throw
      expect(() => websocketService.joinNoteRoom(null as any, 'note-123')).not.toThrow();
    });
  });

  describe('leaveNoteRoom', () => {
    it('should remove socket from note-specific room', () => {
      // Arrange
      const noteId = 'test-note-101112';
      const mockSocket = { leave: jest.fn() } as any;

      // Act
      websocketService.leaveNoteRoom(mockSocket, noteId);

      // Assert
      expect(mockSocket.leave).toHaveBeenCalledWith(noteId);
    });
  });

  describe('notifyTitleChanged', () => {
    it('should emit title_changed event to note room', () => {
      // Arrange
      const noteId = 'test-note-131415';
      const newTitle = 'Updated Note Title';
      const toSpy = jest.fn().mockReturnValue({
        emit: jest.fn()
      });
      io.to = toSpy;

      // Act
      websocketService.notifyTitleChanged(noteId, newTitle);

      // Assert
      expect(toSpy).toHaveBeenCalledWith(noteId);
      expect(toSpy().emit).toHaveBeenCalledWith('title_changed', {
        noteId,
        title: newTitle,
        timestamp: expect.any(String)
      });
    });

    it('should handle empty titles gracefully', () => {
      // Arrange
      const noteId = 'test-note-161718';
      const mockEmit = jest.fn();
      io.to = jest.fn().mockReturnValue({ emit: mockEmit });

      // Act
      websocketService.notifyTitleChanged(noteId, '');

      // Assert
      expect(mockEmit).toHaveBeenCalledWith('title_changed', {
        noteId,
        title: '',
        timestamp: expect.any(String)
      });
    });
  });
});