import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Editor } from '../Editor';
import { useEditor } from '@tiptap/react';

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

// Mock hooks
const mockSetUser = jest.fn();
const mockProvider = {
  awareness: {
    setLocalStateField: mockSetUser,
  },
};

jest.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: jest.fn(() => ({
    provider: mockProvider,
    ydoc: {
      on: jest.fn(),
      off: jest.fn(),
      getXmlFragment: jest.fn(() => ({
        getAttribute: jest.fn(),
        getXmlElement: jest.fn(),
        get: jest.fn(() => []),
      })),
    },
    setUser: mockSetUser,
    users: [],
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

// Mock useEditor to capture the configuration
const mockEditor = {
  commands: {
    setTextSelection: jest.fn(),
    addTrackChanges: jest.fn(),
    addCommentHighlight: jest.fn(),
    removeCommentHighlight: jest.fn(),
  },
};

const mockUseEditor = jest.fn(() => mockEditor);
jest.mock('@tiptap/react', () => ({
  useEditor: (...args: any[]) => mockUseEditor(...args),
  EditorContent: ({ editor }: { editor: any }) => <div data-testid="editor-content">Editor</div>,
}));

describe('CollaborationCursor Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockUseEditor.mockReturnValue(mockEditor);
  });

  it('should configure CollaborationCursor with user information when user is set', async () => {
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
    
    render(<Editor documentId="test-doc" />);
    
    // Wait for the editor to be configured
    await waitFor(() => {
      expect(mockUseEditor).toHaveBeenCalled();
    });
    
    // Get the editor configuration that was passed to useEditor
    const editorConfig = mockUseEditor.mock.calls[0][0];
    
    // Find the CollaborationCursor extension
    const collaborationCursor = editorConfig.extensions.find((ext: any) => 
      ext.name === 'collaborationCursor' || 
      (ext.options && ext.options.provider === mockProvider)
    );
    
    expect(collaborationCursor).toBeDefined();
    
    // Check if user configuration is properly set
    if (collaborationCursor && collaborationCursor.options) {
      expect(collaborationCursor.options.user).toEqual({
        name: 'TestUser',
        color: expect.any(String),
      });
    }
  });

  it('should not configure CollaborationCursor user when no username is set', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Should show popup since no username is stored
    expect(screen.getByText('Welcome! Please enter your name')).toBeInTheDocument();
    
    // Editor should be configured but without user info initially
    await waitFor(() => {
      expect(mockUseEditor).toHaveBeenCalled();
    });
    
    const editorConfig = mockUseEditor.mock.calls[0][0];
    
    // Initially, CollaborationCursor should not have user config or should have empty user
    const collaborationCursor = editorConfig.extensions.find((ext: any) => 
      ext.name === 'collaborationCursor' || 
      (ext.options && ext.options.provider === mockProvider)
    );
    
    if (collaborationCursor && collaborationCursor.options) {
      // User should be undefined or have empty name initially
      expect(collaborationCursor.options.user).toBeUndefined();
    }
  });

  it('should reconfigure editor when user name is set via popup', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Enter username in popup
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: 'NewUser' } });
    fireEvent.click(screen.getByText('Continue'));
    
    // Should update awareness with user info
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'NewUser',
        color: expect.any(String),
      });
    });
    
    // Editor should be reconfigured with the new user
    // Note: The editor is recreated when currentUser changes (dependency array)
    expect(mockUseEditor).toHaveBeenCalledTimes(2); // Once initially, once after user is set
  });

  it('should use consistent color generation for the same user', async () => {
    // Mock Math.random to ensure consistent colors
    const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.75);
    
    localStorageMock.setItem('obsidian-comments-username', 'ConsistentUser');
    
    render(<Editor documentId="test-doc" />);
    
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'ConsistentUser',
        color: 'hsl(270, 70%, 85%)', // 0.75 * 360 = 270
      });
    });
    
    mockRandom.mockRestore();
  });

  it('should handle provider being null gracefully', async () => {
    // Mock collaboration hook to return null provider
    const useCollaboration = require('../../hooks/useCollaboration').useCollaboration;
    useCollaboration.mockReturnValue({
      provider: null,
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
      users: [],
      status: 'disconnected'
    });
    
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
    
    // Should not crash when provider is null
    expect(() => {
      render(<Editor documentId="test-doc" />);
    }).not.toThrow();
    
    // Editor should still be configured, but without CollaborationCursor
    await waitFor(() => {
      expect(mockUseEditor).toHaveBeenCalled();
    });
    
    const editorConfig = mockUseEditor.mock.calls[0][0];
    
    // CollaborationCursor should not be present when provider is null
    const collaborationCursor = editorConfig.extensions.find((ext: any) => 
      ext.name === 'collaborationCursor'
    );
    
    expect(collaborationCursor).toBeUndefined();
  });
});