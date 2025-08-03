import { renderHook, waitFor } from '@testing-library/react';
import { useCollaboration } from '../useCollaboration';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

// Mock Hocuspocus provider
jest.mock('@hocuspocus/provider');
const MockedHocuspocusProvider = HocuspocusProvider as jest.MockedClass<typeof HocuspocusProvider>;

describe('useCollaboration hook', () => {
  let mockProvider: jest.Mocked<HocuspocusProvider>;
  let mockDoc: Y.Doc;

  beforeEach(() => {
    mockDoc = new Y.Doc();
    mockProvider = {
      document: mockDoc,
      awareness: {
        setLocalState: jest.fn(),
        getLocalState: jest.fn(),
        getStates: jest.fn(() => new Map()),
        on: jest.fn(),
        off: jest.fn(),
        setLocalStateField: jest.fn(),
      },
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      destroy: jest.fn(),
      status: 'connected',
    } as any;

    MockedHocuspocusProvider.mockImplementation(() => mockProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize provider with correct document ID', () => {
    const { result } = renderHook(() => useCollaboration('test-doc-123'));

    expect(MockedHocuspocusProvider).toHaveBeenCalledWith({
      url: 'ws://localhost:8082',
      name: 'test-doc-123',
      document: expect.any(Y.Doc),
    });

    expect(result.current.provider).toBe(mockProvider);
    expect(result.current.ydoc).toBeInstanceOf(Y.Doc);
  });

  it('should set user awareness state', () => {
    const { result } = renderHook(() => useCollaboration('test-doc-123'));

    result.current.setUser({
      name: 'Alice',
      color: '#ff0000',
    });

    expect(mockProvider.awareness.setLocalStateField).toHaveBeenCalledWith('user', {
      name: 'Alice',
      color: '#ff0000',
    });
  });

  it('should track connected users', async () => {
    const { result } = renderHook(() => useCollaboration('test-doc-123'));

    const mockStates = new Map([
      [1, { user: { name: 'Alice', color: '#ff0000' } }],
      [2, { user: { name: 'Bob', color: '#00ff00' } }],
    ]);

    mockProvider.awareness.getStates.mockReturnValue(mockStates);

    // Simulate awareness change
    const changeHandler = mockProvider.awareness.on.mock.calls.find(
      call => call[0] === 'change'
    )?.[1];

    if (changeHandler) {
      changeHandler();
    }

    await waitFor(() => {
      expect(result.current.users).toHaveLength(2);
      expect(result.current.users).toContainEqual({
        name: 'Alice',
        color: '#ff0000',
      });
      expect(result.current.users).toContainEqual({
        name: 'Bob',
        color: '#00ff00',
      });
    });
  });

  it('should track connection status', async () => {
    const { result } = renderHook(() => useCollaboration('test-doc-123'));

    expect(result.current.status).toBe('connecting');

    // Simulate status change
    const statusHandler = mockProvider.on.mock.calls.find(
      call => call[0] === 'status'
    )?.[1];

    if (statusHandler) {
      statusHandler({ status: 'disconnected' });
    }

    await waitFor(() => {
      expect(result.current.status).toBe('disconnected');
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useCollaboration('test-doc-123'));

    unmount();

    expect(mockProvider.destroy).toHaveBeenCalled();
  });

  it('should handle reconnection', () => {
    const { result } = renderHook(() => useCollaboration('test-doc-123'));

    result.current.reconnect();

    expect(mockProvider.connect).toHaveBeenCalled();
  });

  it('should get document content', () => {
    const { result } = renderHook(() => useCollaboration('test-doc-123'));

    const text = result.current.ydoc.getText('content');
    text.insert(0, '# Test Document\n\nContent here');

    const content = result.current.getContent();
    expect(content).toBe('# Test Document\n\nContent here');
  });
});