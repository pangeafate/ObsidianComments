import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { CollaborationProvider, useCollaboration } from '../../contexts/CollaborationContext';

// Mock WebSocketManager
const mockWebSocketManager = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  joinShare: vi.fn(),
  leaveShare: vi.fn(),
  sendTextChange: vi.fn(),
  sendCursorMove: vi.fn(),
  addComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
  requestSync: vi.fn(),
  requestHighlights: vi.fn(),
}));

vi.mock('../../utils/WebSocketManager', () => ({
  webSocketManager: mockWebSocketManager
}));

describe('CollaborationContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CollaborationProvider>{children}</CollaborationProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide initial state', () => {
    const { result } = renderHook(() => useCollaboration(), { wrapper });
    
    expect(result.current.state).toEqual({
      shareId: null,
      contributorName: '',
      contributors: [],
      highlights: [],
      comments: [],
      documentState: null,
      isConnected: false,
      isConnecting: false,
      error: null
    });
  });

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useCollaboration());
    }).toThrow('useCollaboration must be used within a CollaborationProvider');
  });

  describe('Actions', () => {
    it('should connect to WebSocket', async () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      
      await act(async () => {
        await result.current.actions.connect();
      });
      
      expect(mockWebSocketManager.connect).toHaveBeenCalled();
    });

    it('should set connecting state during connection', async () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      
      act(() => {
        result.current.actions.connect();
      });
      
      expect(result.current.state.isConnecting).toBe(true);
    });

    it('should join a share', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      
      act(() => {
        result.current.actions.joinShare('test-share-id', 'Test User');
      });
      
      expect(result.current.state.shareId).toBe('test-share-id');
      expect(result.current.state.contributorName).toBe('Test User');
      expect(mockWebSocketManager.joinShare).toHaveBeenCalledWith('test-share-id', 'Test User');
    });

    it('should send text changes', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      
      // First join a share
      act(() => {
        result.current.actions.joinShare('test-share-id', 'Test User');
      });
      
      const operation = [{ retain: 0, insert: 'Hello' }];
      
      act(() => {
        result.current.actions.sendTextChange(operation, 'op-123', 1);
      });
      
      expect(mockWebSocketManager.sendTextChange).toHaveBeenCalledWith(
        'test-share-id', 
        operation, 
        'op-123', 
        1
      );
    });

    it('should add comments', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      
      // First join a share
      act(() => {
        result.current.actions.joinShare('test-share-id', 'Test User');
      });
      
      act(() => {
        result.current.actions.addComment('Great point!', 10, 20, 5);
      });
      
      expect(mockWebSocketManager.addComment).toHaveBeenCalledWith(
        'test-share-id',
        'Test User',
        'Great point!',
        10,
        20,
        5
      );
    });

    it('should disconnect and reset state', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      
      // First set some state
      act(() => {
        result.current.actions.joinShare('test-share-id', 'Test User');
      });
      
      act(() => {
        result.current.actions.disconnect();
      });
      
      expect(mockWebSocketManager.disconnect).toHaveBeenCalled();
      expect(result.current.state.shareId).toBeNull();
      expect(result.current.state.contributorName).toBe('');
    });
  });

  describe('State Updates', () => {
    it('should update contributors list', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      
      const contributors = [
        { name: 'User 1', color: '#ff0000', isOnline: true },
        { name: 'User 2', color: '#00ff00', isOnline: true }
      ];
      
      // Simulate WebSocket event
      act(() => {
        result.current.state.contributors = contributors;
      });
      
      expect(result.current.state.contributors).toHaveLength(2);
    });

    it('should update comments', () => {
      const { result } = renderHook(() => useCollaboration(), { wrapper });
      
      const comment = {
        id: 1,
        contributorName: 'Test User',
        content: 'Great point!',
        positionStart: 10,
        positionEnd: 20,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      // Simulate adding a comment
      act(() => {
        result.current.state.comments = [comment];
      });
      
      expect(result.current.state.comments).toHaveLength(1);
      expect(result.current.state.comments[0]).toEqual(comment);
    });
  });
});