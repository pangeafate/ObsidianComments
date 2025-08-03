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

// Mock the collaboration hook
const mockSetUser = jest.fn();
const mockUsers = [
  { name: 'Alice Smith', color: '#EF4444' },
  { name: 'Bob Wilson', color: '#10B981' },
];

jest.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: jest.fn(() => ({
    provider: {
      awareness: {
        setLocalStateField: mockSetUser,
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
    users: mockUsers,
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

describe('User Collaboration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should set user in awareness when username is provided', async () => {
    // Pre-set username in localStorage
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
    
    render(<Editor documentId="test-doc" />);
    
    // Should call setUser with proper user object
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'TestUser',
        color: expect.any(String), // Pastel color
      });
    });
  });

  it('should show username popup when no username stored', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Should show the popup
    expect(screen.getByText('Welcome! Please enter your name')).toBeInTheDocument();
    
    // Enter a name
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: 'NewUser' } });
    
    // Submit the form
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    // Should call setUser with the new name
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'NewUser',
        color: expect.any(String),
      });
    });
    
    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('obsidian-comments-username', 'NewUser');
  });

  it('should update user when name changes', async () => {
    // Start with no name
    render(<Editor documentId="test-doc" />);
    
    // Enter a name
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: 'FirstName' } });
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'FirstName',
        color: expect.any(String),
      });
    });
  });

  it('should display proper user initials in presence component', async () => {
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
    
    render(<Editor documentId="test-doc" />);
    
    // Should show proper initials for mocked users
    expect(screen.getByText('A')).toBeInTheDocument(); // Alice
    expect(screen.getByText('B')).toBeInTheDocument(); // Bob
    
    // Check colors are applied
    const aliceAvatar = screen.getByText('A');
    const bobAvatar = screen.getByText('B');
    
    expect(aliceAvatar).toHaveStyle('background-color: #EF4444');
    expect(bobAvatar).toHaveStyle('background-color: #10B981');
  });

  it('should not call setUser with empty name', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Try to submit empty name
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    // Should show error and not call setUser
    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('should handle whitespace-only names correctly', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Enter whitespace-only name
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Continue'));
    
    // Should show error and not call setUser
    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it('should generate consistent pastel colors', async () => {
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
    
    // Mock Math.random to ensure consistent color generation
    const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    
    render(<Editor documentId="test-doc" />);
    
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({
        name: 'TestUser',
        color: 'hsl(180, 70%, 85%)', // 0.5 * 360 = 180
      });
    });
    
    mockRandom.mockRestore();
  });
});