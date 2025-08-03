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

// Mock the collaboration hook with minimal implementation
const mockSetUser = jest.fn();

jest.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: jest.fn(() => ({
    provider: {
      awareness: {
        setLocalStateField: jest.fn(),
        getStates: jest.fn(() => {
          const map = new Map();
          map.entries = jest.fn(() => []);
          return map;
        }),
        on: jest.fn(),
        off: jest.fn(),
        getLocalState: jest.fn(() => ({})),
        setLocalState: jest.fn(),
        destroy: jest.fn(),
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
    setUser: mockSetUser,
    users: [
      { name: 'Alice Smith', color: '#EF4444' },
      { name: 'Bob Wilson', color: '#10B981' },
    ],
    status: 'connected'
  }))
}));

// Mock the comments hook
jest.mock('../../hooks/useComments', () => ({
  useComments: jest.fn(() => ({
    comments: [],
    addComment: jest.fn(),
    resolveComment: jest.fn(),
    deleteComment: jest.fn()
  }))
}));

describe('User Awareness Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should call setUser with proper user info when username is available', async () => {
    // Pre-set username in localStorage
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
    
    render(<Editor documentId="test-doc" />);
    
    // Should call setUser with the stored username and a color
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'TestUser',
        color: expect.stringMatching(/^hsl\(\d+, 70%, 85%\)$/), // Pastel color format
      });
    });
  });

  it('should not call setUser when no username is set initially', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Should show the popup
    expect(screen.getByText('Welcome! Please enter your name')).toBeInTheDocument();
    
    // Should not call setUser yet
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('should call setUser when username is set via popup', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Enter a name in the popup
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: 'NewUser' } });
    
    // Submit the form
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    // Should call setUser with the new name
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'NewUser',
        color: expect.stringMatching(/^hsl\(\d+, 70%, 85%\)$/),
      });
    });
    
    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('obsidian-comments-username', 'NewUser');
  });

  it('should show proper user initials in UserPresence component', async () => {
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
    
    render(<Editor documentId="test-doc" />);
    
    // Should show proper initials for the mocked users
    expect(screen.getByText('A')).toBeInTheDocument(); // Alice
    expect(screen.getByText('B')).toBeInTheDocument(); // Bob
    
    // Check that colors are applied correctly
    const aliceAvatar = screen.getByText('A');
    const bobAvatar = screen.getByText('B');
    
    expect(aliceAvatar).toHaveStyle('background-color: #EF4444');
    expect(bobAvatar).toHaveStyle('background-color: #10B981');
  });

  it('should use consistent color for the same user across sessions', async () => {
    // Mock Math.random to ensure consistent color generation
    const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    
    localStorageMock.setItem('obsidian-comments-username', 'ConsistentUser');
    
    render(<Editor documentId="test-doc" />);
    
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'ConsistentUser',
        color: 'hsl(180, 70%, 85%)', // 0.5 * 360 = 180
      });
    });
    
    mockRandom.mockRestore();
  });

  it('should handle empty name submission correctly', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Try to submit empty name
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    // Should show error and not call setUser
    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('should trim whitespace from usernames', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Enter name with extra whitespace
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: '  TrimmedUser  ' } });
    fireEvent.click(screen.getByText('Continue'));
    
    // Should call setUser with trimmed name
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'TrimmedUser',
        color: expect.stringMatching(/^hsl\(\d+, 70%, 85%\)$/),
      });
    });
    
    // Should save trimmed name to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('obsidian-comments-username', 'TrimmedUser');
  });
});