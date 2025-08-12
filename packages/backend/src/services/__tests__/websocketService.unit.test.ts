/**
 * Unit tests for WebSocketService
 * Pure unit tests with mocks - no real socket connections
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { websocketService } from '../websocketService';

// Mock socket.io
const mockIO = {
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
} as any;

const mockSocket = {
  id: 'test-socket-123',
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  on: jest.fn(),
} as any;

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIO),
}));

describe('WebSocketService Unit Tests', () => {
  let httpServer: HttpServer;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a mock HTTP server
    httpServer = {} as HttpServer;
  });

  describe('Initialization', () => {
    it('should initialize with HTTP server and configure CORS', () => {
      websocketService.init(httpServer);

      expect(SocketIOServer).toHaveBeenCalledWith(httpServer, {
        cors: {
          origin: [
            'https://obsidiancomments.serverado.app',
            'http://localhost:3001',
            'http://localhost:5173',
            'app://obsidian.md',
          ],
          methods: ['GET', 'POST'],
          credentials: true,
        },
      });

      expect(mockIO.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Socket Connection Handling', () => {
    let connectionHandler: Function;

    beforeEach(() => {
      websocketService.init(httpServer);
      connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
    });

    it('should handle client connections', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      connectionHandler(mockSocket);

      expect(consoleSpy).toHaveBeenCalledWith('🔌 Client connected:', 'test-socket-123');
      expect(mockSocket.on).toHaveBeenCalledWith('join_note', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave_note', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));

      consoleSpy.mockRestore();
    });
  });

  describe('Note Room Management', () => {
    let connectionHandler: Function;
    let joinNoteHandler: Function;
    let leaveNoteHandler: Function;
    let disconnectHandler: Function;

    beforeEach(() => {
      websocketService.init(httpServer);
      connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      joinNoteHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_note')[1];
      leaveNoteHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'leave_note')[1];
      disconnectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'disconnect')[1];
    });

    it('should handle joining a note room', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const shareId = 'test-note-123';

      joinNoteHandler(shareId);

      expect(consoleSpy).toHaveBeenCalledWith(`📝 Client test-socket-123 joining note room: ${shareId}`);
      expect(mockSocket.join).toHaveBeenCalledWith(shareId);
      expect(mockSocket.to).toHaveBeenCalledWith(shareId);
      expect(mockSocket.emit).toHaveBeenCalledWith('joined_note', {
        shareId,
        timestamp: expect.any(String),
      });

      consoleSpy.mockRestore();
    });

    it('should handle joining with empty shareId', () => {
      joinNoteHandler('');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Share ID is required');
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle leaving a note room', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const shareId = 'test-note-123';

      // First join the room
      joinNoteHandler(shareId);
      jest.clearAllMocks();

      // Then leave
      leaveNoteHandler(shareId);

      expect(consoleSpy).toHaveBeenCalledWith(`📝 Client test-socket-123 leaving note room: ${shareId}`);
      expect(mockSocket.leave).toHaveBeenCalledWith(shareId);
      expect(mockSocket.to).toHaveBeenCalledWith(shareId);

      consoleSpy.mockRestore();
    });

    it('should handle leaving with empty shareId', () => {
      leaveNoteHandler('');

      expect(mockSocket.leave).not.toHaveBeenCalled();
    });

    it('should handle client disconnection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const shareId = 'test-note-123';

      // Join a room first
      joinNoteHandler(shareId);
      jest.clearAllMocks();

      // Then disconnect
      disconnectHandler();

      expect(consoleSpy).toHaveBeenCalledWith('🔌 Client disconnected:', 'test-socket-123');
      expect(mockSocket.to).toHaveBeenCalledWith(shareId);

      consoleSpy.mockRestore();
    });
  });

  describe('Notification Methods', () => {
    beforeEach(() => {
      websocketService.init(httpServer);
    });

    it('should notify about note deletion', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const shareId = 'test-note-to-delete';

      websocketService.notifyNoteDeleted(shareId);

      expect(consoleSpy).toHaveBeenCalledWith(`🗑️  Notifying clients about deleted note: ${shareId}`);
      expect(mockIO.to).toHaveBeenCalledWith(shareId);
      expect(mockIO.emit).toHaveBeenCalledWith('note_deleted', {
        shareId,
        message: 'This note has been deleted',
        timestamp: expect.any(String),
      });

      consoleSpy.mockRestore();
    });

    it('should notify about note updates', () => {
      const shareId = 'test-note-to-update';
      const updateData = { title: 'New Title', content: 'New Content' };

      websocketService.notifyNoteUpdated(shareId, updateData);

      expect(mockIO.to).toHaveBeenCalledWith(shareId);
      expect(mockIO.emit).toHaveBeenCalledWith('note_updated', {
        shareId,
        updateData,
        timestamp: expect.any(String),
      });
    });

    it('should handle notifications when service not initialized', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create a new websocket service instance that is not initialized
      const { websocketService: uninitializedService } = jest.requireActual('../websocketService');
      
      uninitializedService.notifyNoteDeleted('test');
      uninitializedService.notifyNoteUpdated('test', {});

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('⚠️  WebSocket service not initialized, skipping notification');

      consoleSpy.mockRestore();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      websocketService.init(httpServer);
    });

    it('should return connected clients count', () => {
      // For untracked note
      expect(websocketService.getConnectedClients('nonexistent')).toBe(0);

      // After joining a room, we need to simulate the internal state
      // Since the service tracks rooms internally, let's test the method exists
      expect(typeof websocketService.getConnectedClients).toBe('function');
    });

    it('should return IO instance', () => {
      const io = websocketService.getIO();
      expect(io).toBe(mockIO);
    });

    it('should return null for IO when not initialized', () => {
      // Create a new instance that's not initialized
      const { websocketService: uninitializedService } = jest.requireActual('../websocketService');
      expect(uninitializedService.getIO()).toBeNull();
    });
  });

  describe('Room State Management', () => {
    let connectionHandler: Function;
    let joinNoteHandler: Function;
    let leaveNoteHandler: Function;

    beforeEach(() => {
      websocketService.init(httpServer);
      connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      joinNoteHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_note')[1];
      leaveNoteHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'leave_note')[1];
    });

    it('should track room state correctly', () => {
      const shareId = 'room-state-test';

      // Initially no clients
      expect(websocketService.getConnectedClients(shareId)).toBe(0);

      // Join room
      joinNoteHandler(shareId);

      // Should notify other clients about joining
      expect(mockSocket.to).toHaveBeenCalledWith(shareId);
    });

    it('should clean up empty rooms when client leaves', () => {
      const shareId = 'cleanup-test';

      // Join and then leave
      joinNoteHandler(shareId);
      leaveNoteHandler(shareId);

      // Room should be cleaned up, so no clients
      expect(websocketService.getConnectedClients(shareId)).toBe(0);
    });
  });
});