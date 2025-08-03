import { renderHook, act, waitFor } from '@testing-library/react';
import { useVersionHistory } from '../useVersionHistory';
import * as Y from 'yjs';

describe('useVersionHistory hook', () => {
  let ydoc: Y.Doc;

  beforeEach(() => {
    ydoc = new Y.Doc();
  });

  afterEach(() => {
    ydoc.destroy();
  });

  it('should initialize with empty version history', () => {
    const { result } = renderHook(() => useVersionHistory(ydoc, 'test-doc'));

    expect(result.current.versions).toEqual([]);
    expect(result.current.currentVersion).toBeNull();
  });

  it('should create a version snapshot', async () => {
    const { result } = renderHook(() => useVersionHistory(ydoc, 'test-doc'));

    // Add some content to the document
    const text = ydoc.getText('content');
    text.insert(0, 'Initial content');

    act(() => {
      result.current.createSnapshot('Initial version', 'User1');
    });

    await waitFor(() => {
      expect(result.current.versions).toHaveLength(1);
      expect(result.current.versions[0]).toMatchObject({
        id: expect.any(String),
        message: 'Initial version',
        author: 'User1',
        timestamp: expect.any(Date),
        content: 'Initial content',
      });
    });
  });

  it('should track multiple versions in chronological order', async () => {
    const { result } = renderHook(() => useVersionHistory(ydoc, 'test-doc'));

    const text = ydoc.getText('content');

    // Create first version
    text.insert(0, 'Version 1');
    act(() => {
      result.current.createSnapshot('First version', 'User1');
    });

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second version
    text.delete(0, text.length);
    text.insert(0, 'Version 2');
    act(() => {
      result.current.createSnapshot('Second version', 'User2');
    });

    await waitFor(() => {
      expect(result.current.versions).toHaveLength(2);
      expect(result.current.versions[0].message).toBe('First version');
      expect(result.current.versions[1].message).toBe('Second version');
      expect(result.current.versions[0].timestamp.getTime()).toBeLessThan(
        result.current.versions[1].timestamp.getTime()
      );
    });
  });

  it('should restore to a previous version', async () => {
    const { result } = renderHook(() => useVersionHistory(ydoc, 'test-doc'));

    const text = ydoc.getText('content');

    // Create initial version
    text.insert(0, 'Initial content');
    act(() => {
      result.current.createSnapshot('Initial', 'User1');
    });

    // Modify content
    text.delete(0, text.length);
    text.insert(0, 'Modified content');

    expect(text.toString()).toBe('Modified content');

    // Restore to previous version
    await waitFor(() => {
      expect(result.current.versions).toHaveLength(1);
    });

    act(() => {
      result.current.restoreVersion(result.current.versions[0].id);
    });

    await waitFor(() => {
      expect(text.toString()).toBe('Initial content');
    });
  });

  it('should get version differences', async () => {
    const { result } = renderHook(() => useVersionHistory(ydoc, 'test-doc'));

    const text = ydoc.getText('content');

    // Create first version
    text.insert(0, 'Hello world');
    act(() => {
      result.current.createSnapshot('First', 'User1');
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second version
    text.delete(6, 5); // Remove "world"
    text.insert(6, 'there');
    act(() => {
      result.current.createSnapshot('Second', 'User2');
    });

    await waitFor(() => {
      expect(result.current.versions).toHaveLength(2);
    });

    const diff = result.current.getVersionDiff(
      result.current.versions[0].id,
      result.current.versions[1].id
    );

    expect(diff).toEqual({
      from: { content: 'Hello world', message: 'First' },
      to: { content: 'Hello there', message: 'Second' },
      changes: expect.any(Array),
    });
  });

  it('should delete a version', async () => {
    const { result } = renderHook(() => useVersionHistory(ydoc, 'test-doc'));

    const text = ydoc.getText('content');
    text.insert(0, 'Content');

    act(() => {
      result.current.createSnapshot('To be deleted', 'User1');
    });

    await waitFor(() => {
      expect(result.current.versions).toHaveLength(1);
    });

    const versionId = result.current.versions[0].id;

    act(() => {
      result.current.deleteVersion(versionId);
    });

    await waitFor(() => {
      expect(result.current.versions).toHaveLength(0);
    });
  });

  it('should auto-create snapshots at intervals', async () => {
    const { result } = renderHook(() => 
      useVersionHistory(ydoc, 'test-doc', { autoSnapshotInterval: 100 })
    );

    const text = ydoc.getText('content');

    // Make multiple changes quickly
    text.insert(0, 'Change 1');
    text.insert(8, ' Change 2');
    text.insert(17, ' Change 3');

    // Wait for auto-snapshot
    await new Promise(resolve => setTimeout(resolve, 150));

    await waitFor(() => {
      expect(result.current.versions.length).toBeGreaterThan(0);
      expect(result.current.versions[0].message).toBe('Auto-save');
    });
  });

  it('should limit version history size', async () => {
    const { result } = renderHook(() => 
      useVersionHistory(ydoc, 'test-doc', { maxVersions: 2 })
    );

    const text = ydoc.getText('content');

    // Create 3 versions
    for (let i = 1; i <= 3; i++) {
      text.delete(0, text.length);
      text.insert(0, `Version ${i}`);
      act(() => {
        result.current.createSnapshot(`Version ${i}`, 'User1');
      });
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    await waitFor(() => {
      expect(result.current.versions).toHaveLength(2);
      expect(result.current.versions[0].message).toBe('Version 2'); // Oldest kept
      expect(result.current.versions[1].message).toBe('Version 3'); // Latest
    });
  });
});