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
  io: {
    engine: {
      transport: { name: 'polling' }
    }
  }
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
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    wsManager = new WebSocketManager('http://localhost:3001');
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

    it('should disconnect properly', async () => {
      // First connect to create a socket
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      
      await wsManager.connect();
      wsManager.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should prevent connection when already connecting', async () => {
      // First connection attempt
      const connectPromise1 = wsManager.connect();
      
      // Second attempt while first is in progress
      await expect(wsManager.connect()).rejects.toThrow('Connection already in progress');
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after max connection attempts', async () => {
      const error = new Error('Connection failed');
      
      // Mock connect_error for all attempts
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      // Make 3 failed connection attempts (our max)
      await expect(wsManager.connect()).rejects.toThrow();
      await expect(wsManager.connect()).rejects.toThrow();
      await expect(wsManager.connect()).rejects.toThrow();

      // Circuit breaker should now be open
      const connectionState = wsManager.getConnectionState();
      expect(connectionState.circuitBreakerOpen).toBe(true);
    });

    it('should reject connections when circuit breaker is open', async () => {
      const error = new Error('Connection failed');
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      // Trigger circuit breaker
      await expect(wsManager.connect()).rejects.toThrow();
      await expect(wsManager.connect()).rejects.toThrow();
      await expect(wsManager.connect()).rejects.toThrow();

      // Next attempt should be rejected by circuit breaker
      await expect(wsManager.connect()).rejects.toThrow(/temporarily unavailable/);
    });

    it('should allow retry to reset circuit breaker', async () => {
      const error = new Error('Connection failed');
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      // Trigger circuit breaker
      await expect(wsManager.connect()).rejects.toThrow();
      await expect(wsManager.connect()).rejects.toThrow();
      await expect(wsManager.connect()).rejects.toThrow();

      // Use retry method to reset circuit breaker
      await expect(wsManager.retry()).rejects.toThrow('Connection failed');
      
      // Circuit breaker should be reset
      const connectionState = wsManager.getConnectionState();
      expect(connectionState.connectionAttempts).toBe(1);
    });

    it('should reset circuit breaker on successful connection', async () => {
      const error = new Error('Connection failed');
      
      // First few attempts fail
      let attemptCount = 0;
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          if (attemptCount < 2) {
            attemptCount++;
            setTimeout(() => handler(error), 0);
          }
        } else if (event === 'connect') {
          if (attemptCount >= 2) {
            setTimeout(() => handler(), 0);
          }
        }
      });

      // Two failed attempts
      await expect(wsManager.connect()).rejects.toThrow();
      await expect(wsManager.connect()).rejects.toThrow();

      // Third attempt succeeds
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });

      await wsManager.connect();
      
      // Circuit breaker should be reset
      const connectionState = wsManager.getConnectionState();
      expect(connectionState.connectionAttempts).toBe(0);
      expect(connectionState.circuitBreakerOpen).toBe(false);
    });
  });

  describe('Connection State', () => {
    it('should return correct connection state', () => {
      const state = wsManager.getConnectionState();
      
      expect(state).toHaveProperty('isConnecting');
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('connectionAttempts');
      expect(state).toHaveProperty('maxAttempts');
      expect(state).toHaveProperty('circuitBreakerOpen');
      
      expect(typeof state.isConnecting).toBe('boolean');
      expect(typeof state.isConnected).toBe('boolean');
      expect(typeof state.connectionAttempts).toBe('number');
      expect(typeof state.maxAttempts).toBe('number');
      expect(typeof state.circuitBreakerOpen).toBe('boolean');
    });
  });

  describe('Error Message Handling', () => {
    it('should provide user-friendly error message for transport errors', async () => {
      const error = { type: 'TransportError', message: 'Transport error occurred' };
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      await expect(wsManager.connect()).rejects.toThrow('Server temporarily unavailable');
    });

    it('should provide user-friendly error message for ERR_INSUFFICIENT_RESOURCES', async () => {
      const error = { message: 'ERR_INSUFFICIENT_RESOURCES: Resource exhausted' };
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      await expect(wsManager.connect()).rejects.toThrow('Server temporarily unavailable');
    });

    it('should provide user-friendly error message for ECONNREFUSED', async () => {
      const error = { message: 'ECONNREFUSED: Connection refused' };
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      await expect(wsManager.connect()).rejects.toThrow('Cannot reach collaboration server');
    });

    it('should provide user-friendly error message for timeout', async () => {
      const error = { message: 'timeout: Connection timed out' };
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      await expect(wsManager.connect()).rejects.toThrow('Connection timed out');
    });

    it('should provide fallback error message for unknown errors', async () => {
      const error = { description: 'Unknown error occurred' };
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(error), 0);
        }
      });

      await expect(wsManager.connect()).rejects.toThrow('Connection failed: Unknown error occurred');
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
    beforeEach(async () => {
      // Set up successful connection
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      
      await wsManager.connect();
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
    it('should return connection status', async () => {
      // First connect to create a socket
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      
      await wsManager.connect();
      mockSocket.connected = true;
      expect(wsManager.isConnected()).toBe(true);
      
      mockSocket.connected = false;
      expect(wsManager.isConnected()).toBe(false);
    });

    it('should return connection ID', async () => {
      // First connect to create a socket
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
      });
      
      await wsManager.connect();
      mockSocket.id = 'test-socket-id';
      expect(wsManager.getConnectionId()).toBe('test-socket-id');
    });
  });
});