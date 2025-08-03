import { renderHook } from '@testing-library/react';
import { useLinkTracking } from '../useLinkTracking';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLinkTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:8081'
      },
      writable: true,
    });
  });

  it('should track a new document when hook is initialized', () => {
    renderHook(() => useLinkTracking('test-doc-123'));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'obsidian-comments-links',
      expect.stringContaining('test-doc-123')
    );

    // Verify the saved data structure
    const savedCall = localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'obsidian-comments-links'
    );

    if (savedCall) {
      const parsedData = JSON.parse(savedCall[1]);
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0]).toEqual({
        id: 'test-doc-123',
        title: expect.stringContaining('Document'),
        url: 'http://localhost:8081/editor/test-doc-123',
        accessedAt: expect.any(String)
      });
    }
  });

  it('should update access time for existing document', () => {
    // Pre-populate localStorage with existing document
    const existingLinks = [
      {
        id: 'existing-doc',
        title: 'Existing Document',
        url: 'http://localhost:8081/editor/existing-doc',
        accessedAt: '2025-01-01T00:00:00.000Z'
      }
    ];
    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(existingLinks));

    renderHook(() => useLinkTracking('existing-doc'));

    // Should update the existing document's access time
    const updateCall = localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'obsidian-comments-links' && call !== localStorageMock.setItem.mock.calls[0]
    );

    if (updateCall) {
      const parsedData = JSON.parse(updateCall[1]);
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0].id).toBe('existing-doc');
      expect(parsedData[0].accessedAt).not.toBe('2025-01-01T00:00:00.000Z');
    }
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorageMock.setItem('obsidian-comments-links', 'invalid json');

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    renderHook(() => useLinkTracking('new-doc'));

    // Should warn about invalid JSON and start fresh
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse existing links'),
      expect.any(Error)
    );

    // Should still create the new document link
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'obsidian-comments-links',
      expect.stringContaining('new-doc')
    );

    consoleSpy.mockRestore();
  });

  it('should limit stored links to 50 most recent', () => {
    // Create 51 existing links
    const existingLinks = Array.from({ length: 51 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Document ${i}`,
      url: `http://localhost:8081/editor/doc-${i}`,
      accessedAt: new Date(Date.now() - (51 - i) * 1000).toISOString()
    }));

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(existingLinks));

    renderHook(() => useLinkTracking('new-doc'));

    // Should keep only 50 links (49 existing + 1 new)
    const finalCall = localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'obsidian-comments-links' && call !== localStorageMock.setItem.mock.calls[0]
    );

    if (finalCall) {
      const parsedData = JSON.parse(finalCall[1]);
      expect(parsedData).toHaveLength(50);
      expect(parsedData[0].id).toBe('new-doc'); // New document should be first (most recent)
    }
  });

  it('should generate appropriate titles for different document ID formats', () => {
    // Test UUID format
    renderHook(() => useLinkTracking('550e8400-e29b-41d4-a716-446655440000'));

    let savedCall = localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'obsidian-comments-links'
    );

    if (savedCall) {
      const parsedData = JSON.parse(savedCall[1]);
      expect(parsedData[0].title).toBe('Document 550e8400');
    }

    jest.clearAllMocks();
    localStorageMock.clear();

    // Test timestamp format
    renderHook(() => useLinkTracking('1642771200000-123456789'));

    savedCall = localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'obsidian-comments-links'
    );

    if (savedCall) {
      const parsedData = JSON.parse(savedCall[1]);
      expect(parsedData[0].title).toContain('Document from');
      expect(parsedData[0].title).toContain('2022'); // Year from timestamp
    }
  });

  it('should not track document with empty or undefined ID', () => {
    renderHook(() => useLinkTracking(''));
    expect(localStorageMock.setItem).not.toHaveBeenCalled();

    renderHook(() => useLinkTracking(undefined as any));
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should handle localStorage errors gracefully', () => {
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    renderHook(() => useLinkTracking('error-doc'));

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to track document link:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    localStorageMock.setItem.mockImplementation(originalSetItem);
  });

  it('should handle non-array data in localStorage', () => {
    localStorageMock.setItem('obsidian-comments-links', '{"not": "an array"}');

    renderHook(() => useLinkTracking('test-doc'));

    // Should treat invalid data as empty array and create new link
    const savedCall = localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'obsidian-comments-links' && call !== localStorageMock.setItem.mock.calls[0]
    );

    if (savedCall) {
      const parsedData = JSON.parse(savedCall[1]);
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0].id).toBe('test-doc');
    }
  });
});