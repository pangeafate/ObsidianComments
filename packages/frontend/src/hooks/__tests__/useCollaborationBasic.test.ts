import { renderHook } from '@testing-library/react';
import { useCollaboration } from '../useCollaboration';

// Mock HocuspocusProvider
const mockProvider = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  destroy: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  status: 'disconnected',
  awareness: {
    setLocalStateField: jest.fn(),
    getStates: jest.fn(() => new Map()),
    on: jest.fn(),
    off: jest.fn()
  }
};

const mockYDoc = {
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  guid: 'test-guid'
};

jest.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: jest.fn().mockImplementation(() => mockProvider)
}));

jest.mock('yjs', () => ({
  Doc: jest.fn().mockImplementation(() => mockYDoc)
}));

describe('useCollaboration', () => {
  const mockDocumentId = 'test-document-id';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    Object.defineProperty(import.meta, 'env', {
      value: {
        VITE_WS_URL: 'ws://localhost:3001/ws'
      },
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCollaboration(mockDocumentId));

    expect(result.current.provider).toBe(mockProvider);
    expect(result.current.ydoc).toBe(mockYDoc);
    expect(result.current.users).toEqual([]);
    expect(result.current.status).toBe('disconnected');
    expect(typeof result.current.setUser).toBe('function');
  });

  it('should create provider with correct document ID', () => {
    const { HocuspocusProvider } = require('@hocuspocus/provider');
    
    renderHook(() => useCollaboration(mockDocumentId));

    expect(HocuspocusProvider).toHaveBeenCalledWith({
      url: 'ws://localhost:3001/ws',
      name: mockDocumentId,
      document: mockYDoc,
      onConnect: expect.any(Function),
      onDisconnect: expect.any(Function),
      onStatus: expect.any(Function)
    });
  });

  it('should set user information correctly', () => {
    const { result } = renderHook(() => useCollaboration(mockDocumentId));

    const testUser = { name: 'Test User', color: '#ff0000' };
    result.current.setUser(testUser);

    expect(mockProvider.awareness.setLocalStateField).toHaveBeenCalledWith('user', testUser);
  });

  it('should handle provider connection', () => {
    const { HocuspocusProvider } = require('@hocuspocus/provider');
    let onConnectCallback: Function;

    HocuspocusProvider.mockImplementation((config: any) => {
      onConnectCallback = config.onConnect;
      return mockProvider;
    });

    const { result } = renderHook(() => useCollaboration(mockDocumentId));

    // Simulate connection
    onConnectCallback();

    expect(result.current.status).toBe('connected');
  });

  it('should handle provider disconnection', () => {
    const { HocuspocusProvider } = require('@hocuspocus/provider');
    let onDisconnectCallback: Function;

    HocuspocusProvider.mockImplementation((config: any) => {
      onDisconnectCallback = config.onDisconnect;
      return mockProvider;
    });

    const { result } = renderHook(() => useCollaboration(mockDocumentId));

    // Simulate disconnection
    onDisconnectCallback();

    expect(result.current.status).toBe('disconnected');
  });

  it('should handle status updates', () => {
    const { HocuspocusProvider } = require('@hocuspocus/provider');
    let onStatusCallback: Function;

    HocuspocusProvider.mockImplementation((config: any) => {
      onStatusCallback = config.onStatus;
      return mockProvider;
    });

    const { result } = renderHook(() => useCollaboration(mockDocumentId));

    // Simulate status update
    const statusData = { status: 'connecting' };
    onStatusCallback(statusData);

    expect(result.current.status).toBe('connecting');
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useCollaboration(mockDocumentId));

    unmount();

    expect(mockProvider.destroy).toHaveBeenCalled();
    expect(mockYDoc.destroy).toHaveBeenCalled();
  });

  it('should handle awareness state changes', () => {
    const mockUsers = new Map([
      [1, { user: { name: 'User 1', color: '#ff0000' } }],
      [2, { user: { name: 'User 2', color: '#00ff00' } }]
    ]);

    mockProvider.awareness.getStates.mockReturnValue(mockUsers);

    let awarenessChangeCallback: Function;
    mockProvider.awareness.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'change') {
        awarenessChangeCallback = callback;
      }
    });

    const { result } = renderHook(() => useCollaboration(mockDocumentId));

    // Simulate awareness change
    awarenessChangeCallback();

    expect(result.current.users).toHaveLength(2);
    expect(result.current.users[0]).toEqual({ name: 'User 1', color: '#ff0000' });
    expect(result.current.users[1]).toEqual({ name: 'User 2', color: '#00ff00' });
  });

  it('should use fallback WebSocket URL when env var is not set', () => {
    // Remove the mock env variable
    Object.defineProperty(import.meta, 'env', {
      value: {},
      writable: true
    });

    const { HocuspocusProvider } = require('@hocuspocus/provider');
    
    renderHook(() => useCollaboration(mockDocumentId));

    expect(HocuspocusProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'ws://localhost:8082'
      })
    );
  });
});