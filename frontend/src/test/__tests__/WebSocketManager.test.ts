import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from '../../utils/WebSocketManager';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  id: 'mock-socket-id',
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
  Socket: vi.fn(),
}));

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock socket state
    mockSocket.connected = false;
    mockSocket.id = 'mock-socket-id';
    wsManager = new WebSocketManager('http://localhost:3001');
    // Simulate socket connection for manager
    wsManager['socket'] = mockSocket;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should initialize with correct default URL', () => {
      const defaultManager = new WebSocketManager();
      expect(defaultManager).toBeInstanceOf(WebSocketManager);
    });


    it('should connect to WebSocket server', async () => {
      // Set up the connect handler to be called immediately
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });

      const connectPromise = wsManager.connect();
      await expect(connectPromise).resolves.toBeUndefined();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      await expect(wsManager.connect()).rejects.toThrow('Connection failed');
    });

    it('should disconnect properly', () => {
      wsManager.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should register and emit event handlers', () => {
      const handler = vi.fn();
      wsManager.on('test-event', handler);
      
      // Simulate internal event emission
      wsManager['emit']('test-event', { data: 'test' });
      
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event handlers', () => {
      const handler = vi.fn();
      wsManager.on('test-event', handler);
      wsManager.off('test-event', handler);
      
      wsManager['emit']('test-event', { data: 'test' });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Collaboration Methods', () => {
    beforeEach(() => {
      mockSocket.connected = true;
    });

    it('should join a share', () => {
      wsManager.joinShare('test-share-id', 'Test User');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('join-share', {
        shareId: 'test-share-id',
        contributorName: 'Test User'
      });
    });

    it('should throw error when joining share without connection', () => {
      mockSocket.connected = false;
      
      expect(() => {
        wsManager.joinShare('test-share-id', 'Test User');
      }).toThrow('WebSocket not connected');
    });

    it('should send text changes', () => {
      const operation = [{ retain: 0, insert: 'Hello' }];
      
      wsManager.sendTextChange('test-share-id', operation, 'op-123', 1);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('text-change', {
        shareId: 'test-share-id',
        operation,
        operationId: 'op-123',
        baseVersion: 1
      });
    });

    it('should send cursor moves', () => {
      wsManager.sendCursorMove('Test User', 42, { start: 10, end: 20 });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('cursor-move', {
        contributorName: 'Test User',
        position: 42,
        selection: { start: 10, end: 20 }
      });
    });

    it('should add comments', () => {
      wsManager.addComment('test-share-id', 'Test User', 'Great point!', 10, 20, 5);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('comment-add', {
        type: 'add',
        shareId: 'test-share-id',
        contributorName: 'Test User',
        content: 'Great point!',
        positionStart: 10,
        positionEnd: 20,
        parentCommentId: 5
      });
    });
  });

  describe('Utility Methods', () => {
    it('should return connection status', () => {
      mockSocket.connected = true;
      expect(wsManager.isConnected()).toBe(true);
      
      mockSocket.connected = false;
      expect(wsManager.isConnected()).toBe(false);
    });

    it('should return connection ID', () => {
      mockSocket.id = 'test-socket-id';
      expect(wsManager.getConnectionId()).toBe('test-socket-id');
    });
  });
});