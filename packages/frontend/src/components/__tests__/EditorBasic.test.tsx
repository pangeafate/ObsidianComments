import { render, screen } from '@testing-library/react';
import { Editor } from '../Editor';

// Mock all the complex dependencies
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => null),
  EditorContent: ({ editor }: { editor: any }) => <div data-testid="editor-content">Editor Content</div>,
}));

jest.mock('../hooks/useCollaboration', () => ({
  useCollaboration: jest.fn(() => ({
    provider: null,
    ydoc: null,
    setUser: jest.fn(),
    users: [],
    status: 'disconnected'
  }))
}));

jest.mock('../hooks/useComments', () => ({
  useComments: jest.fn(() => ({
    comments: [],
    addComment: jest.fn(),
    resolveComment: jest.fn(),
    deleteComment: jest.fn()
  }))
}));

jest.mock('../hooks/useLinkTracking', () => ({
  useLinkTracking: jest.fn()
}));

jest.mock('../services/documentService', () => ({
  documentService: {
    checkDocumentExists: jest.fn().mockResolvedValue(false),
    loadDocument: jest.fn().mockResolvedValue({
      id: 'test-doc',
      title: 'Test Document',
      content: 'Test content',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    })
  }
}));

jest.mock('../services/documentServiceExtensions', () => ({
  extendedDocumentService: {
    createDocument: jest.fn(),
    saveDocument: jest.fn(),
    updateDocumentTitle: jest.fn()
  }
}));

// Mock all utility functions
jest.mock('../utils/markdownConverter', () => ({
  markdownToProseMirror: jest.fn((content) => ({ content }))
}));

jest.mock('../utils/contentSanitizer', () => ({
  stripTrackChangesMarkup: jest.fn((content) => content)
}));

jest.mock('../utils/contentDeduplication', () => ({
  initializeContentSafely: jest.fn(),
  deduplicateContent: jest.fn((content) => content)
}));

jest.mock('../utils/smartTitle', () => ({
  extractSmartTitle: jest.fn(() => 'Test Title')
}));

jest.mock('../utils/userColors', () => ({
  generateUserColor: jest.fn(() => '#ff0000')
}));

describe('Editor Component', () => {
  const mockDocumentId = 'test-document-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    render(<Editor documentId={mockDocumentId} />);
    
    expect(screen.getByText('Loading document...')).toBeInTheDocument();
  });

  it('should render main editor interface after loading', async () => {
    const { useEditor } = require('@tiptap/react');
    const mockEditor = {
      commands: { setContent: jest.fn() },
      getHTML: jest.fn(() => '<p>Test content</p>'),
      on: jest.fn(),
      off: jest.fn()
    };
    useEditor.mockReturnValue(mockEditor);

    // Wait for loading to complete
    render(<Editor documentId={mockDocumentId} />);
    
    // Wait for the component to finish loading
    await screen.findByText('Collaborative Editor');
  });

  it('should handle document title correctly', async () => {
    const { useEditor } = require('@tiptap/react');
    const mockEditor = {
      commands: { setContent: jest.fn() },
      getHTML: jest.fn(() => '<p>Test content</p>'),
      on: jest.fn(),
      off: jest.fn()
    };
    useEditor.mockReturnValue(mockEditor);

    render(<Editor documentId={mockDocumentId} />);
    
    await screen.findByText('Collaborative Editor');
    expect(screen.getByText('Collaborative Editor')).toBeInTheDocument();
  });

  it('should render toolbar buttons', async () => {
    const { useEditor } = require('@tiptap/react');
    const mockEditor = {
      commands: { setContent: jest.fn() },
      getHTML: jest.fn(() => '<p>Test content</p>'),
      on: jest.fn(),
      off: jest.fn()
    };
    useEditor.mockReturnValue(mockEditor);

    render(<Editor documentId={mockDocumentId} />);
    
    await screen.findByText('My Links');
    expect(screen.getByText('My Links')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('should handle document loading from API', async () => {
    const { documentService } = require('../services/documentService');
    documentService.checkDocumentExists.mockResolvedValue(true);
    documentService.loadDocument.mockResolvedValue({
      id: 'test-doc',
      title: 'API Document',
      content: 'Content from API',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    });

    const { useEditor } = require('@tiptap/react');
    const mockEditor = {
      commands: { setContent: jest.fn() },
      getHTML: jest.fn(() => '<p>Test content</p>'),
      on: jest.fn(),
      off: jest.fn()
    };
    useEditor.mockReturnValue(mockEditor);

    render(<Editor documentId={mockDocumentId} />);
    
    await screen.findByText('API Document');
    expect(screen.getByText('API Document')).toBeInTheDocument();
  });

  it('should handle document loading error gracefully', async () => {
    const { documentService } = require('../services/documentService');
    documentService.checkDocumentExists.mockRejectedValue(new Error('Network error'));

    const { useEditor } = require('@tiptap/react');
    const mockEditor = {
      commands: { setContent: jest.fn() },
      getHTML: jest.fn(() => '<p>Test content</p>'),
      on: jest.fn(),
      off: jest.fn()
    };
    useEditor.mockReturnValue(mockEditor);

    render(<Editor documentId={mockDocumentId} />);
    
    // Should fall back to default title
    await screen.findByText('Collaborative Editor');
    expect(screen.getByText('Collaborative Editor')).toBeInTheDocument();
  });
});