import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyLinksPane } from '../MyLinksPane';
import { NewNoteButton } from '../NewNoteButton';

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
const mockWindowOpen = jest.fn(() => ({ focus: jest.fn() })); // Return mock window object
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-12345'),
  },
  writable: true,
});

describe('Editor Integration Components', () => {
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

  describe('MyLinksPane', () => {
    it('should render My Links pane with no links initially', () => {
      render(<MyLinksPane />);
      
      expect(screen.getByText('My Links')).toBeInTheDocument();
      expect(screen.getByText('No links yet')).toBeInTheDocument();
      expect(screen.queryByText('Copy All Links')).not.toBeInTheDocument();
    });

    it('should display links when they exist in localStorage', () => {
      const testLinks = [
        {
          id: 'test-doc-1',
          title: 'Test Document 1',
          url: 'http://localhost:8081/editor/test-doc-1',
          accessedAt: new Date().toISOString()
        },
        {
          id: 'test-doc-2',
          title: 'Test Document 2',
          url: 'http://localhost:8081/editor/test-doc-2',
          accessedAt: new Date(Date.now() - 60000).toISOString()
        }
      ];
      
      localStorageMock.setItem('obsidian-comments-links', JSON.stringify(testLinks));
      
      render(<MyLinksPane />);
      
      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
      expect(screen.getByText('Test Document 2')).toBeInTheDocument();
      expect(screen.getByText('Copy All Links')).toBeInTheDocument();
    });
  });

  describe('NewNoteButton', () => {
    it('should render New Note button', () => {
      render(<NewNoteButton />);
      
      expect(screen.getByText('New Note')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'New Note' })).toBeInTheDocument();
    });

    it('should open new document when clicked', () => {
      render(<NewNoteButton />);
      
      const newNoteButton = screen.getByText('New Note');
      fireEvent.click(newNoteButton);
      
      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
      expect(mockWindowOpen).toHaveBeenCalledWith(
        '/editor/test-uuid-12345',
        '_blank'
      );
    });
  });

  describe('Component Integration', () => {
    it('should render both MyLinksPane and NewNoteButton together', () => {
      render(
        <div>
          <NewNoteButton />
          <MyLinksPane />
        </div>
      );
      
      expect(screen.getByText('New Note')).toBeInTheDocument();
      expect(screen.getByText('My Links')).toBeInTheDocument();
      expect(screen.getByText('No links yet')).toBeInTheDocument();
    });

    it('should handle multiple new note creations', () => {
      // Mock multiple UUID generations
      const mockRandomUUID = global.crypto.randomUUID as jest.Mock;
      mockRandomUUID
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2')
        .mockReturnValueOnce('uuid-3');
      
      render(<NewNoteButton />);
      
      const newNoteButton = screen.getByText('New Note');
      
      fireEvent.click(newNoteButton);
      fireEvent.click(newNoteButton);
      fireEvent.click(newNoteButton);
      
      expect(mockWindowOpen).toHaveBeenCalledTimes(3);
      expect(mockWindowOpen).toHaveBeenCalledWith('/editor/uuid-1', '_blank');
      expect(mockWindowOpen).toHaveBeenCalledWith('/editor/uuid-2', '_blank');
      expect(mockWindowOpen).toHaveBeenCalledWith('/editor/uuid-3', '_blank');
    });
  });
});