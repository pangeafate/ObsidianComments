import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Editor } from '../Editor';

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

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock hooks
jest.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: jest.fn(() => ({
    provider: {
      awareness: {
        setLocalStateField: jest.fn(),
        getStates: jest.fn(() => new Map()),
        on: jest.fn(),
        off: jest.fn(),
        getLocalState: jest.fn(() => ({})),
        setLocalState: jest.fn(),
        destroy: jest.fn(),
        entries: jest.fn(() => []), // Add entries method
      },
    },
    ydoc: {
      on: jest.fn(),
      off: jest.fn(),
      getXmlFragment: jest.fn(() => ({
        getAttribute: jest.fn(),
        getXmlElement: jest.fn(),
        get: jest.fn(() => []),
      })),
    },
    setUser: jest.fn(),
    users: [
      { name: 'Alice Smith', color: '#EF4444' },
      { name: 'Bob Wilson', color: '#10B981' },
    ],
    status: 'connected'
  }))
}));

jest.mock('../../hooks/useComments', () => ({
  useComments: jest.fn(() => ({
    comments: [],
    addComment: jest.fn(),
    resolveComment: jest.fn(),
    deleteComment: jest.fn()
  }))
}));

describe('Editor Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Set username to avoid popup during testing
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
  });

  it('should render all three buttons: My Links, New Note, and Comments', () => {
    render(<Editor documentId="test-doc" />);
    
    expect(screen.getByText('My Links')).toBeInTheDocument();
    expect(screen.getByText('New Note')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('should open My Links pane when My Links button is clicked', async () => {
    render(<Editor documentId="test-doc" />);
    
    const myLinksButton = screen.getByText('My Links');
    fireEvent.click(myLinksButton);
    
    // Should show the My Links pane
    const myLinksPane = screen.getByTestId('my-links-pane');
    expect(myLinksPane).toHaveClass('translate-x-0');
    
    // Button should be highlighted
    expect(myLinksButton).toHaveClass('bg-purple-600', 'text-white');
  });

  it('should open Comments pane when Comments button is clicked', async () => {
    render(<Editor documentId="test-doc" />);
    
    const commentsButton = screen.getByText('Comments');
    fireEvent.click(commentsButton);
    
    // Should show the Comments pane
    const commentsPane = screen.getByTestId('comments-pane');
    expect(commentsPane).toHaveClass('translate-x-0');
    
    // Button should be highlighted
    expect(commentsButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should close other panes when opening a new pane', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Open My Links pane first
    const myLinksButton = screen.getByText('My Links');
    fireEvent.click(myLinksButton);
    
    const myLinksPane = screen.getByTestId('my-links-pane');
    const commentsPane = screen.getByTestId('comments-pane');
    
    expect(myLinksPane).toHaveClass('translate-x-0');
    expect(commentsPane).toHaveClass('translate-x-full');
    
    // Now open Comments pane
    const commentsButton = screen.getByText('Comments');
    fireEvent.click(commentsButton);
    
    // My Links should be closed, Comments should be open
    expect(myLinksPane).toHaveClass('translate-x-full');
    expect(commentsPane).toHaveClass('translate-x-0');
    
    // Button states should update
    expect(myLinksButton).toHaveClass('bg-gray-200');
    expect(commentsButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should create new document when New Note button is clicked', () => {
    render(<Editor documentId="test-doc" />);
    
    const newNoteButton = screen.getByText('New Note');
    fireEvent.click(newNoteButton);
    
    // Should call window.open with new document URL
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    const [url, target] = mockWindowOpen.mock.calls[0];
    expect(url).toMatch(/^\/editor\/.+/);
    expect(target).toBe('_blank');
  });

  it('should track current document in links when component mounts', async () => {
    render(<Editor documentId="test-doc-123" />);
    
    // Should save document link to localStorage
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'obsidian-comments-links',
        expect.stringContaining('test-doc-123')
      );
    });
    
    // Verify the saved data structure
    const savedData = localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'obsidian-comments-links'
    );
    
    if (savedData) {
      const parsedData = JSON.parse(savedData[1]);
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0]).toEqual({
        id: 'test-doc-123',
        title: expect.stringContaining('Document'),
        url: `${window.location.origin}/editor/test-doc-123`,
        accessedAt: expect.any(String)
      });
    }
  });

  it('should show user presence and connection status', () => {
    render(<Editor documentId="test-doc" />);
    
    // Should show user presence
    expect(screen.getByText('Active users:')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument(); // Alice
    expect(screen.getByText('B')).toBeInTheDocument(); // Bob
    
    // Should show connection status (this would depend on the ConnectionStatus component)
    // The exact text would depend on the mocked status value
  });

  it('should show track changes toolbar', () => {
    render(<Editor documentId="test-doc" />);
    
    // Should show track changes button
    expect(screen.getByText('Track Changes')).toBeInTheDocument();
    expect(screen.getByText('Accept All Changes')).toBeInTheDocument();
  });

  it('should toggle panes closed when clicking the same button twice', () => {
    render(<Editor documentId="test-doc" />);
    
    const myLinksButton = screen.getByText('My Links');
    const myLinksPane = screen.getByTestId('my-links-pane');
    
    // Open the pane
    fireEvent.click(myLinksButton);
    expect(myLinksPane).toHaveClass('translate-x-0');
    expect(myLinksButton).toHaveClass('bg-purple-600');
    
    // Close the pane
    fireEvent.click(myLinksButton);
    expect(myLinksPane).toHaveClass('translate-x-full');
    expect(myLinksButton).toHaveClass('bg-gray-200');
  });

  it('should handle multiple document visits correctly', async () => {
    // First document
    const { rerender } = render(<Editor documentId="doc-1" />);
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'obsidian-comments-links',
        expect.stringContaining('doc-1')
      );
    });
    
    // Second document
    rerender(<Editor documentId="doc-2" />);
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'obsidian-comments-links',
        expect.stringContaining('doc-2')
      );
    });
    
    // Should have both documents in the final saved data
    const latestCall = localStorageMock.setItem.mock.calls
      .filter(call => call[0] === 'obsidian-comments-links')
      .pop();
    
    if (latestCall) {
      const parsedData = JSON.parse(latestCall[1]);
      expect(parsedData).toHaveLength(2);
      expect(parsedData.map((link: any) => link.id)).toContain('doc-1');
      expect(parsedData.map((link: any) => link.id)).toContain('doc-2');
    }
  });
});