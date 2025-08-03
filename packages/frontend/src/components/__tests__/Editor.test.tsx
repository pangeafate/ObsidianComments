import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Editor } from '../Editor';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

// Mock Hocuspocus provider
jest.mock('@hocuspocus/provider');
const MockedHocuspocusProvider = HocuspocusProvider as jest.MockedClass<typeof HocuspocusProvider>;

describe('Editor Component', () => {
  let mockProvider: jest.Mocked<HocuspocusProvider>;
  let mockDoc: Y.Doc;

  beforeEach(() => {
    mockDoc = new Y.Doc();
    mockProvider = {
      document: mockDoc,
      awareness: {
        setLocalState: jest.fn(),
        getLocalState: jest.fn(),
        getStates: jest.fn(() => new Map()),
        on: jest.fn(),
        off: jest.fn(),
      },
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      destroy: jest.fn(),
    } as any;

    MockedHocuspocusProvider.mockImplementation(() => mockProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render editor with document ID', () => {
    render(<Editor documentId="test-doc-123" />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(MockedHocuspocusProvider).toHaveBeenCalledWith({
      url: 'ws://localhost:8082',
      name: 'test-doc-123',
      document: expect.any(Y.Doc),
      awareness: expect.any(Object),
    });
  });

  it('should initialize Tiptap editor with collaboration extensions', () => {
    render(<Editor documentId="test-doc-123" />);
    
    const editor = screen.getByRole('textbox');
    expect(editor).toHaveClass('ProseMirror');
  });

  it('should handle typing in the editor', async () => {
    render(<Editor documentId="test-doc-123" />);
    
    const editor = screen.getByRole('textbox');
    fireEvent.input(editor, {
      target: { textContent: 'Hello World' }
    });

    await waitFor(() => {
      expect(editor.textContent).toContain('Hello World');
    });
  });

  it('should show user presence indicators', () => {
    // Mock awareness with multiple users
    const mockStates = new Map([
      [1, { user: { name: 'Alice', color: '#ff0000' } }],
      [2, { user: { name: 'Bob', color: '#00ff00' } }]
    ]);
    
    mockProvider.awareness.getStates.mockReturnValue(mockStates);
    
    render(<Editor documentId="test-doc-123" />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should handle markdown content initialization', () => {
    const text = mockDoc.getText('content');
    text.insert(0, '# Test Heading\n\nThis is test content.');
    
    render(<Editor documentId="test-doc-123" />);
    
    expect(screen.getByText('Test Heading')).toBeInTheDocument();
    expect(screen.getByText('This is test content.')).toBeInTheDocument();
  });

  it('should show connection status', () => {
    render(<Editor documentId="test-doc-123" />);
    
    expect(screen.getByText(/connected|connecting|disconnected/i)).toBeInTheDocument();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = render(<Editor documentId="test-doc-123" />);
    
    unmount();
    
    expect(mockProvider.destroy).toHaveBeenCalled();
  });
});