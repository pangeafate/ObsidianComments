import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewNoteButton } from '../components/NewNoteButton';
import { EditorPage } from '../pages/EditorPage';

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

// Mock window.open to capture the URL instead of actually opening a new tab
const mockWindowOpen = jest.fn(() => ({ focus: jest.fn() }));
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

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:8081'
  },
  writable: true,
});

// Mock the Editor component to avoid complex dependencies
jest.mock('../components/Editor', () => ({
  Editor: ({ documentId }: { documentId: string }) => (
    <div data-testid="editor-component">
      <div data-testid="editor-interface">Collaborative Editor Interface</div>
      <div data-testid="document-id">Document ID: {documentId}</div>
      <div data-testid="editor-content">Editor content area</div>
    </div>
  ),
}));

describe('New Note Workflow End-to-End', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should complete the full New Note workflow successfully', () => {
    // Step 1: Render the NewNoteButton
    render(<NewNoteButton />);
    
    const newNoteButton = screen.getByText('New Note');
    expect(newNoteButton).toBeInTheDocument();
    
    // Step 2: Click the New Note button
    fireEvent.click(newNoteButton);
    
    // Step 3: Verify that window.open was called with correct URL format
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    const mockCall = mockWindowOpen.mock.calls[0];
    expect(mockCall).toBeDefined();
    expect(mockCall.length).toBeGreaterThan(0);
    const [openedUrl, target] = mockCall;
    expect(target).toBe('_blank');
    expect(openedUrl).toMatch(/^\/editor\/.+/);
    
    // Extract the document ID from the opened URL
    const documentId = openedUrl.replace('/editor/', '');
    expect(documentId).toBe('test-uuid-12345'); // From our mock
    
    // Step 4: Simulate what happens when the new tab loads the /editor/:documentId route
    // This simulates the user navigating to the URL that was opened
    // We need to render it with proper Route structure so useParams works
    render(
      <MemoryRouter initialEntries={[openedUrl]}>
        <Routes>
          <Route path="/editor/:documentId" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Step 5: Verify that the Editor interface loads correctly (no more blank page!)
    expect(screen.getByTestId('editor-component')).toBeInTheDocument();
    expect(screen.getByTestId('editor-interface')).toBeInTheDocument();
    expect(screen.getByText('Collaborative Editor Interface')).toBeInTheDocument();
    expect(screen.getByText(`Document ID: ${documentId}`)).toBeInTheDocument();
  });

  it('should work with different document ID formats', () => {
    // Test with UUID format
    const mockUuid = '550e8400-e29b-41d4-a716-446655440000';
    (global.crypto.randomUUID as jest.Mock).mockReturnValueOnce(mockUuid);
    
    render(<NewNoteButton />);
    fireEvent.click(screen.getByText('New Note'));
    
    const mockCall = mockWindowOpen.mock.calls[0];
    expect(mockCall).toBeDefined();
    const [uuidUrl] = mockCall;
    expect(uuidUrl).toBe(`/editor/${mockUuid}`);
    
    // Test that the editor page works with UUID
    render(
      <MemoryRouter initialEntries={[uuidUrl]}>
        <Routes>
          <Route path="/editor/:documentId" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText(`Document ID: ${mockUuid}`)).toBeInTheDocument();
  });

  it('should work with timestamp-based document IDs', () => {
    // Clear previous mock calls
    mockWindowOpen.mockClear();
    
    // Mock crypto to be undefined, forcing timestamp fallback
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: undefined },
      writable: true,
    });
    
    // Mock Date.now and Math.random for predictable timestamp ID
    const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1642771200000);
    const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    
    render(<NewNoteButton />);
    fireEvent.click(screen.getByText('New Note'));
    
    const mockCall = mockWindowOpen.mock.calls[0]; // Use [0] since we cleared previous calls
    expect(mockCall).toBeDefined();
    const [timestampUrl] = mockCall;
    expect(timestampUrl).toBe('/editor/1642771200000-123456789');
    
    // Test that the editor page works with timestamp ID
    render(
      <MemoryRouter initialEntries={[timestampUrl]}>
        <Routes>
          <Route path="/editor/:documentId" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Document ID: 1642771200000-123456789')).toBeInTheDocument();
    
    mockDateNow.mockRestore();
    mockMathRandom.mockRestore();
  });

  it('should handle the scenario that was previously failing (blank page)', () => {
    // This test specifically addresses the original issue
    render(<NewNoteButton />);
    
    // Click the button
    const newNoteButton = screen.getByText('New Note');
    fireEvent.click(newNoteButton);
    
    // Get the URL that would be opened
    const [openedUrl] = mockWindowOpen.mock.calls[0];
    
    // Before our fix, this URL would show a blank page
    // Now it should render the editor interface
    render(
      <MemoryRouter initialEntries={[openedUrl]}>
        <Routes>
          <Route path="/editor/:documentId" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    );
    
    // The page should NOT be blank - it should show the editor
    expect(screen.getByTestId('editor-component')).toBeInTheDocument();
    expect(screen.getByText('Collaborative Editor Interface')).toBeInTheDocument();
    
    // Verify we're not seeing the "Document Not Found" error
    expect(screen.queryByText('Document Not Found')).not.toBeInTheDocument();
  });

  it('should create unique document IDs for multiple clicks', () => {
    // Clear previous mock calls and restore crypto
    mockWindowOpen.mockClear();
    
    // Restore crypto.randomUUID mock
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: jest.fn(),
      },
      writable: true,
    });
    
    const mockUuids = ['uuid-1', 'uuid-2', 'uuid-3'];
    (global.crypto.randomUUID as jest.Mock)
      .mockReturnValueOnce(mockUuids[0])
      .mockReturnValueOnce(mockUuids[1])
      .mockReturnValueOnce(mockUuids[2]);
    
    render(<NewNoteButton />);
    
    const newNoteButton = screen.getByText('New Note');
    
    // Click multiple times
    fireEvent.click(newNoteButton);
    fireEvent.click(newNoteButton);
    fireEvent.click(newNoteButton);
    
    expect(mockWindowOpen).toHaveBeenCalledTimes(3);
    
    // Each call should have a different document ID
    const urls = mockWindowOpen.mock.calls.map(call => call[0]);
    expect(urls[0]).toBe('/editor/uuid-1');
    expect(urls[1]).toBe('/editor/uuid-2');
    expect(urls[2]).toBe('/editor/uuid-3');
    
    // Each URL should work with the EditorPage
    urls.forEach((url, index) => {
      const { unmount } = render(
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/editor/:documentId" element={<EditorPage />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText(`Document ID: uuid-${index + 1}`)).toBeInTheDocument();
      unmount();
    });
  });
});