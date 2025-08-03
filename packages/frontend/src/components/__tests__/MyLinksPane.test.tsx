import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyLinksPane } from '../MyLinksPane';

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

// Mock clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

interface Link {
  id: string;
  title: string;
  url: string;
  accessedAt: string;
}

describe('MyLinksPane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render empty state when no links are stored', () => {
    render(<MyLinksPane />);
    
    expect(screen.getByText('My Links')).toBeInTheDocument();
    expect(screen.getByText('No links yet')).toBeInTheDocument();
    expect(screen.getByText('Links to documents you visit will appear here')).toBeInTheDocument();
  });

  it('should display stored links from localStorage', () => {
    const mockLinks: Link[] = [
      {
        id: 'doc1',
        title: 'First Document',
        url: 'http://localhost:8081/editor/doc1',
        accessedAt: '2025-01-15T10:00:00.000Z'
      },
      {
        id: 'doc2', 
        title: 'Second Document',
        url: 'http://localhost:8081/editor/doc2',
        accessedAt: '2025-01-15T11:00:00.000Z'
      }
    ];

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(mockLinks));
    
    render(<MyLinksPane />);
    
    expect(screen.getByText('First Document')).toBeInTheDocument();
    expect(screen.getByText('Second Document')).toBeInTheDocument();
    expect(screen.getByText('Copy All Links')).toBeInTheDocument();
  });

  it('should show links ordered by most recently accessed', () => {
    const mockLinks: Link[] = [
      {
        id: 'doc1',
        title: 'Older Document',
        url: 'http://localhost:8081/editor/doc1',
        accessedAt: '2025-01-15T10:00:00.000Z'
      },
      {
        id: 'doc2',
        title: 'Newer Document', 
        url: 'http://localhost:8081/editor/doc2',
        accessedAt: '2025-01-15T12:00:00.000Z'
      }
    ];

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(mockLinks));
    
    render(<MyLinksPane />);
    
    const linkElements = screen.getAllByRole('link');
    expect(linkElements[0]).toHaveTextContent('Newer Document');
    expect(linkElements[1]).toHaveTextContent('Older Document');
  });

  it('should copy all links to clipboard when Copy All Links is clicked', async () => {
    const mockLinks: Link[] = [
      {
        id: 'doc1',
        title: 'First Document',
        url: 'http://localhost:8081/editor/doc1',
        accessedAt: '2025-01-15T10:00:00.000Z'
      },
      {
        id: 'doc2',
        title: 'Second Document',
        url: 'http://localhost:8081/editor/doc2', 
        accessedAt: '2025-01-15T11:00:00.000Z'
      }
    ];

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(mockLinks));
    
    render(<MyLinksPane />);
    
    const copyButton = screen.getByText('Copy All Links');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        'http://localhost:8081/editor/doc2\nhttp://localhost:8081/editor/doc1'
      );
    });
  });

  it('should show success message after copying links', async () => {
    const mockLinks: Link[] = [
      {
        id: 'doc1',
        title: 'Test Document',
        url: 'http://localhost:8081/editor/doc1',
        accessedAt: '2025-01-15T10:00:00.000Z'
      }
    ];

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(mockLinks));
    
    render(<MyLinksPane />);
    
    const copyButton = screen.getByText('Copy All Links');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Links copied to clipboard!')).toBeInTheDocument();
    });

    // Success message should disappear after a few seconds
    await waitFor(() => {
      expect(screen.queryByText('Links copied to clipboard!')).not.toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('should handle clipboard API failure gracefully', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard access denied'));
    
    const mockLinks: Link[] = [
      {
        id: 'doc1',
        title: 'Test Document',
        url: 'http://localhost:8081/editor/doc1',
        accessedAt: '2025-01-15T10:00:00.000Z'
      }
    ];

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(mockLinks));
    
    render(<MyLinksPane />);
    
    const copyButton = screen.getByText('Copy All Links');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to copy links')).toBeInTheDocument();
    });
  });

  it('should handle empty or invalid localStorage data', () => {
    localStorageMock.setItem('obsidian-comments-links', 'invalid json');
    
    render(<MyLinksPane />);
    
    expect(screen.getByText('No links yet')).toBeInTheDocument();
  });

  it('should format relative timestamps for recent links', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const mockLinks: Link[] = [
      {
        id: 'doc1',
        title: 'Recent Document',
        url: 'http://localhost:8081/editor/doc1',
        accessedAt: oneHourAgo.toISOString()
      }
    ];

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(mockLinks));
    
    render(<MyLinksPane />);
    
    expect(screen.getByText(/1 hour ago|an hour ago/i)).toBeInTheDocument();
  });

  it('should show individual copy link buttons for each link', async () => {
    const mockLinks: Link[] = [
      {
        id: 'doc1',
        title: 'Test Document',
        url: 'http://localhost:8081/editor/doc1',
        accessedAt: '2025-01-15T10:00:00.000Z'
      }
    ];

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(mockLinks));
    
    render(<MyLinksPane />);
    
    const copyLinkButton = screen.getByTitle('Copy link');
    fireEvent.click(copyLinkButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('http://localhost:8081/editor/doc1');
    });
  });

  it('should open links in current tab when clicked', () => {
    const mockLinks: Link[] = [
      {
        id: 'doc1',
        title: 'Test Document',
        url: 'http://localhost:8081/editor/doc1',
        accessedAt: '2025-01-15T10:00:00.000Z'
      }
    ];

    localStorageMock.setItem('obsidian-comments-links', JSON.stringify(mockLinks));
    
    render(<MyLinksPane />);
    
    const linkElement = screen.getByRole('link', { name: 'Test Document' });
    expect(linkElement).toHaveAttribute('href', 'http://localhost:8081/editor/doc1');
    expect(linkElement).not.toHaveAttribute('target', '_blank');
  });
});