import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Editor } from '../Editor';

// Mock the collaboration hook to test user presence behavior
const mockUsers = [
  { name: '', color: '#3B82F6' }, // User without name (should show ?)
  { name: 'Alice Smith', color: '#EF4444' }, // User with name (should show A)
  { name: 'Bob Wilson', color: '#10B981' }, // User with name (should show B)
];

jest.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: jest.fn(() => ({
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

describe('UserPresence Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Set username to avoid showing the popup during testing
    localStorageMock.setItem('obsidian-comments-username', 'TestUser');
  });

  it('should show proper initials and colors for users with names', async () => {
    render(<Editor documentId="test-doc" />);
    
    // Should show user initials for users with names
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    
    // Should show question mark for user without name
    expect(screen.getByText('?')).toBeInTheDocument();
    
    // Check that colors are applied correctly
    const aliceAvatar = screen.getByText('A');
    const bobAvatar = screen.getByText('B');
    const unknownAvatar = screen.getByText('?');
    
    expect(aliceAvatar).toHaveStyle('background-color: #EF4444');
    expect(bobAvatar).toHaveStyle('background-color: #10B981');
    expect(unknownAvatar).toHaveStyle('background-color: #3B82F6');
  });

  it('should show tooltips with user names on hover', async () => {
    render(<Editor documentId="test-doc" />);
    
    const aliceAvatar = screen.getByText('A');
    const bobAvatar = screen.getByText('B');
    
    expect(aliceAvatar).toHaveAttribute('title', 'Alice Smith');
    expect(bobAvatar).toHaveAttribute('title', 'Bob Wilson');
  });

  it('should handle users with only spaces in names', async () => {
    // Update mock to include user with whitespace-only name
    const usersWithWhitespace = [
      { name: '   ', color: '#6B7280' }, // Whitespace only
      { name: 'Valid User', color: '#10B981' }
    ];
    
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
      users: usersWithWhitespace,
      status: 'connected'
    });
    
    render(<Editor documentId="test-doc" />);
    
    // Should show question mark for whitespace-only name
    expect(screen.getByText('?')).toBeInTheDocument();
    // Should show proper initial for valid user
    expect(screen.getByText('V')).toBeInTheDocument();
  });
});