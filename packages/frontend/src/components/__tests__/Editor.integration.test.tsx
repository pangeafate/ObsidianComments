import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Editor } from '../Editor';
import { documentService } from '../../services/documentService';
import { markdownToProseMirror } from '../../utils/markdownConverter';

// Mock the document service
jest.mock('../../services/documentService');
const mockDocumentService = documentService as jest.Mocked<typeof documentService>;

// Mock the markdown converter
jest.mock('../../utils/markdownConverter');
const mockMarkdownToProseMirror = markdownToProseMirror as jest.MockedFunction<typeof markdownToProseMirror>;

// Mock all the hooks and extensions
jest.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: () => ({
    provider: null,
    ydoc: {
      getText: () => ({ toString: () => '' }),
      on: jest.fn(),
      off: jest.fn(),
    },
    users: [],
    status: 'connected',
    setUser: jest.fn(),
    reconnect: jest.fn(),
    getContent: () => '',
  }),
}));

jest.mock('../../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    addComment: jest.fn(),
    resolveComment: jest.fn(),
    deleteComment: jest.fn(),
  }),
}));

jest.mock('../../hooks/useLinkTracking', () => ({
  useLinkTracking: jest.fn(),
}));

jest.mock('@tiptap/react', () => ({
  useEditor: () => null,
  EditorContent: ({ editor }: any) => <div data-testid="editor-content">Editor {editor ? 'loaded' : 'loading'}</div>,
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Editor Integration with Obsidian Documents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should load Obsidian document from API when document exists', async () => {
    const mockDocument = {
      shareId: 'obsidian-doc-123',
      title: 'My Obsidian Note',
      content: '# My Obsidian Note\n\nThis comes from Obsidian.',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      permissions: 'edit',
      collaborativeUrl: 'http://localhost:5173/editor/obsidian-doc-123'
    };

    const mockProseMirrorDoc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'My Obsidian Note' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This comes from Obsidian.' }]
        }
      ]
    };

    mockDocumentService.checkDocumentExists.mockResolvedValue(true);
    mockDocumentService.loadDocument.mockResolvedValue(mockDocument);
    mockMarkdownToProseMirror.mockReturnValue(mockProseMirrorDoc);

    await act(async () => {
      render(
        <BrowserRouter>
          <Editor documentId="obsidian-doc-123" />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(mockDocumentService.checkDocumentExists).toHaveBeenCalledWith('obsidian-doc-123');
    });

    await waitFor(() => {
      expect(mockDocumentService.loadDocument).toHaveBeenCalledWith('obsidian-doc-123');
    });

    // Check if the document title is displayed
    await waitFor(() => {
      expect(screen.getByText('My Obsidian Note')).toBeInTheDocument();
    });
  });

  it('should use regular collaboration when document does not exist in API', async () => {
    mockDocumentService.checkDocumentExists.mockResolvedValue(false);

    await act(async () => {
      render(
        <BrowserRouter>
          <Editor documentId="regular-doc-123" />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(mockDocumentService.checkDocumentExists).toHaveBeenCalledWith('regular-doc-123');
    });

    // Should not try to load from API
    await waitFor(() => {
      expect(mockDocumentService.loadDocument).not.toHaveBeenCalled();
      expect(mockMarkdownToProseMirror).not.toHaveBeenCalled();
    });

    // Should show default title
    await waitFor(() => {
      expect(screen.getByText('Collaborative Editor')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockDocumentService.checkDocumentExists.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(
        <BrowserRouter>
          <Editor documentId="error-doc-123" />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(mockDocumentService.checkDocumentExists).toHaveBeenCalledWith('error-doc-123');
    });

    // Should fallback to regular collaboration
    await waitFor(() => {
      expect(mockDocumentService.loadDocument).not.toHaveBeenCalled();
      expect(screen.getByText('Collaborative Editor')).toBeInTheDocument();
    });
  });

  it('should show loading state while checking document existence', async () => {
    let resolveCheck: (value: boolean) => void;
    const checkPromise = new Promise<boolean>((resolve) => {
      resolveCheck = resolve;
    });

    mockDocumentService.checkDocumentExists.mockReturnValue(checkPromise);

    render(
      <BrowserRouter>
        <Editor documentId="loading-doc-123" />
      </BrowserRouter>
    );

    // Should show loading state
    expect(screen.getByText('Loading document...')).toBeInTheDocument();

    // Resolve the promise
    resolveCheck!(false);

    await waitFor(() => {
      expect(screen.queryByText('Loading document...')).not.toBeInTheDocument();
    });
  });

  it('should convert and initialize editor with Obsidian content', async () => {
    const mockDocument = {
      shareId: 'obsidian-complex-123',
      title: 'Complex Obsidian Note',
      content: `# Complex Note

This is a complex note with:

## Features
- Bullet points
- **Bold text**
- *Italic text*

\`\`\`javascript
console.log("Code block");
\`\`\`

> A blockquote

- [x] Completed task
- [ ] Pending task`,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
      permissions: 'edit',
      collaborativeUrl: 'http://localhost:5173/editor/obsidian-complex-123'
    };

    mockDocumentService.checkDocumentExists.mockResolvedValue(true);
    mockDocumentService.loadDocument.mockResolvedValue(mockDocument);
    mockMarkdownToProseMirror.mockReturnValue({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Complex Note' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'This is a complex note with:' }] }
      ]
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <Editor documentId="obsidian-complex-123" />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Complex Obsidian Note')).toBeInTheDocument();
    });
  });
});