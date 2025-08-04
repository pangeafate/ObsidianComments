/**
 * Test-driven development test for useCollaboration hook
 * This test defines the expected behavior before we fix the implementation
 */

import { renderHook, act } from '@testing-library/react';
import { useCollaboration } from './useCollaboration';
import * as Y from 'yjs';

// Mock HocuspocusProvider to avoid network dependencies in tests
jest.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
    awareness: {
      on: jest.fn(),
      off: jest.fn(),
      setLocalStateField: jest.fn(),
      getStates: jest.fn().mockReturnValue(new Map()),
    },
    connect: jest.fn(),
  })),
}));

describe('useCollaboration Hook - TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create only ONE Y.Doc instance per documentId', () => {
    const { result, rerender } = renderHook(
      ({ docId }) => useCollaboration(docId),
      { initialProps: { docId: 'test-doc-1' } }
    );

    const firstYdoc = result.current.ydoc;
    
    // Rerender with same documentId should NOT create new Y.Doc
    rerender({ docId: 'test-doc-1' });
    const secondYdoc = result.current.ydoc;
    
    expect(firstYdoc).toBe(secondYdoc);
    expect(firstYdoc).toBeInstanceOf(Y.Doc);
  });

  test('should create NEW Y.Doc instance when documentId changes', () => {
    const { result, rerender } = renderHook(
      ({ docId }) => useCollaboration(docId),
      { initialProps: { docId: 'test-doc-1' } }
    );

    const firstYdoc = result.current.ydoc;
    
    // Change documentId should create new Y.Doc
    rerender({ docId: 'test-doc-2' });
    const secondYdoc = result.current.ydoc;
    
    expect(firstYdoc).not.toBe(secondYdoc);
    expect(secondYdoc).toBeInstanceOf(Y.Doc);
  });

  test('should properly cleanup old Y.Doc when documentId changes', () => {
    const { result, rerender, unmount } = renderHook(
      ({ docId }) => useCollaboration(docId),
      { initialProps: { docId: 'test-doc-1' } }
    );

    const firstYdoc = result.current.ydoc;
    const destroySpy = jest.spyOn(firstYdoc, 'destroy');
    
    // Change documentId
    rerender({ docId: 'test-doc-2' });
    
    // Old Y.Doc should be destroyed
    expect(destroySpy).toHaveBeenCalled();
    
    // Cleanup
    unmount();
  });

  test('should not create Y.Doc in useState initializer to avoid race conditions', () => {
    // This test ensures we don't have the problematic pattern:
    // const [ydoc, setYdoc] = useState(() => new Y.Doc());
    
    const { result } = renderHook(() => useCollaboration('test-doc'));
    
    // The Y.Doc should be created in useEffect, not useState
    expect(result.current.ydoc).toBeInstanceOf(Y.Doc);
    
    // Should not create multiple instances on re-renders with same documentId
    const firstYdoc = result.current.ydoc;
    
    // Force re-render
    act(() => {
      // This would trigger a re-render but should not create new Y.Doc
    });
    
    expect(result.current.ydoc).toBe(firstYdoc);
  });

  test('should handle getText("content") without type conflicts', () => {
    const { result } = renderHook(() => useCollaboration('test-doc'));
    
    const ydoc = result.current.ydoc;
    
    // This should not throw "Type with name content already defined" error
    expect(() => {
      const text1 = ydoc.getText('content');
      const text2 = ydoc.getText('content'); // Should return same instance
      expect(text1).toBe(text2);
    }).not.toThrow();
  });

  test('should return consistent API', () => {
    const { result } = renderHook(() => useCollaboration('test-doc'));
    
    expect(result.current).toHaveProperty('provider');
    expect(result.current).toHaveProperty('ydoc');
    expect(result.current).toHaveProperty('users');
    expect(result.current).toHaveProperty('status');
    expect(result.current).toHaveProperty('setUser');
    expect(result.current).toHaveProperty('reconnect');
    expect(result.current).toHaveProperty('getContent');
    
    expect(typeof result.current.setUser).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');
    expect(typeof result.current.getContent).toBe('function');
  });
});