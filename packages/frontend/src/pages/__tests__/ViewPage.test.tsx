/**
 * ViewPage Component Tests - TDD Implementation
 * 
 * Tests for read-only HTML viewing of shared notes from ShareNote plugin
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ViewPage } from '../ViewPage';
import { documentService } from '../../services/documentService';

// Mock document service
jest.mock('../../services/documentService');
const mockDocumentService = documentService as jest.Mocked<typeof documentService>;

// Mock router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ documentId: 'test-doc-123' })
}));

// Mock DOMPurify for security testing
jest.mock('dompurify', () => ({
  default: {
    sanitize: jest.fn((dirty: string) => dirty) // Pass through in tests
  }
}));

const renderViewPage = () => {
  return render(
    <BrowserRouter>
      <ViewPage />
    </BrowserRouter>
  );
};

describe('ViewPage Component - TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HTML Content Rendering', () => {
    it('should render HTML content when renderMode is "html"', async () => {
      // Arrange - Mock HTML document
      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'HTML Test Document',
        content: '# HTML Test\n\nMarkdown content',
        htmlContent: '<h1>HTML Test</h1><p>HTML content</p>',
        renderMode: 'html',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        permissions: 'view',
        collaborativeUrl: '/editor/test-doc-123',
        viewUrl: '/view/test-doc-123'
      };

      mockDocumentService.loadDocument.mockResolvedValue(mockDocument);

      // Act
      renderViewPage();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('HTML Test')).toBeInTheDocument();
        expect(screen.getByText('HTML content')).toBeInTheDocument();
      });

      // Verify HTML is rendered, not markdown
      expect(screen.queryByText('# HTML Test')).not.toBeInTheDocument();
    });

    it('should sanitize HTML content for security', async () => {
      const DOMPurify = await import('dompurify');
      const mockSanitize = DOMPurify.default.sanitize as jest.MockedFunction<any>;

      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'Security Test',
        content: '# Security Test',
        htmlContent: '<h1>Safe Content</h1><script>alert("xss")</script>',
        renderMode: 'html',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        permissions: 'view',
        collaborativeUrl: '/editor/test-doc-123',
        viewUrl: '/view/test-doc-123'
      };

      mockDocumentService.loadDocument.mockResolvedValue(mockDocument);

      renderViewPage();

      await waitFor(() => {
        expect(mockSanitize).toHaveBeenCalledWith(
          '<h1>Safe Content</h1><script>alert("xss")</script>',
          expect.any(Object)
        );
      });
    });
  });

  describe('Markdown Fallback Rendering', () => {
    it('should render markdown content when renderMode is "markdown"', async () => {
      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'Markdown Test Document',
        content: '# Markdown Test\n\n**Bold text** and *italic*',
        htmlContent: null,
        renderMode: 'markdown',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        permissions: 'view',
        collaborativeUrl: '/editor/test-doc-123',
        viewUrl: '/view/test-doc-123'
      };

      mockDocumentService.loadDocument.mockResolvedValue(mockDocument);

      renderViewPage();

      await waitFor(() => {
        expect(screen.getByText('Markdown Test Document')).toBeInTheDocument();
        // Should render processed markdown as HTML - get all headings and check content area
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.some(h => h.textContent === 'Markdown Test')).toBe(true);
      });
    });

    it('should fallback to markdown when HTML content is empty', async () => {
      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'Fallback Test',
        content: '# Fallback Content\n\nThis should render as markdown',
        htmlContent: '',
        renderMode: 'html',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        permissions: 'view',
        collaborativeUrl: '/editor/test-doc-123',
        viewUrl: '/view/test-doc-123'
      };

      mockDocumentService.loadDocument.mockResolvedValue(mockDocument);

      renderViewPage();

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.some(h => h.textContent === 'Fallback Content')).toBe(true);
      });
    });
  });

  describe('Document Loading States', () => {
    it('should show loading state while document loads', async () => {
      mockDocumentService.loadDocument.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderViewPage();

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show error state when document not found', async () => {
      mockDocumentService.loadDocument.mockRejectedValue(new Error('Document not found'));

      renderViewPage();

      await waitFor(() => {
        expect(screen.getByText(/document not found/i)).toBeInTheDocument();
      });
    });

    it('should show error state on network failure', async () => {
      mockDocumentService.loadDocument.mockRejectedValue(new Error('Network error'));

      renderViewPage();

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Read-Only Features', () => {
    it('should not show editing controls', async () => {
      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'Read Only Test',
        content: '# Read Only\n\nThis is read-only content',
        htmlContent: '<h1>Read Only</h1><p>This is read-only content</p>',
        renderMode: 'html',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        permissions: 'view',
        collaborativeUrl: '/editor/test-doc-123',
        viewUrl: '/view/test-doc-123'
      };

      mockDocumentService.loadDocument.mockResolvedValue(mockDocument);

      renderViewPage();

      await waitFor(() => {
        expect(screen.getByText('Read Only')).toBeInTheDocument();
      });

      // Should not have editing controls (like text inputs for editing)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      // Note: We have an "Edit this document" link, so we can't check for all "edit" text
    });

    it('should show link to edit page if collaborative URL exists', async () => {
      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'Editable Test',
        content: '# Editable Content',
        htmlContent: '<h1>Editable Content</h1>',
        renderMode: 'html',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        permissions: 'edit',
        collaborativeUrl: '/editor/test-doc-123',
        viewUrl: '/view/test-doc-123'
      };

      mockDocumentService.loadDocument.mockResolvedValue(mockDocument);

      renderViewPage();

      await waitFor(() => {
        const editLink = screen.getByText(/edit this document/i);
        expect(editLink).toBeInTheDocument();
        expect(editLink.closest('a')).toHaveAttribute('href', '/editor/test-doc-123');
      });
    });
  });

  describe('Document Metadata', () => {
    it('should display document title', async () => {
      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'Custom Document Title',
        content: '# Different Header',
        htmlContent: '<h1>Different Header</h1>',
        renderMode: 'html',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        permissions: 'view',
        collaborativeUrl: '/editor/test-doc-123',
        viewUrl: '/view/test-doc-123'
      };

      mockDocumentService.loadDocument.mockResolvedValue(mockDocument);

      renderViewPage();

      await waitFor(() => {
        // Title should be shown as document title, not from content
        expect(screen.getByText('Custom Document Title')).toBeInTheDocument();
      });
    });

    it('should show creation date', async () => {
      const mockDocument = {
        shareId: 'test-doc-123',
        title: 'Date Test',
        content: '# Content',
        htmlContent: '<h1>Content</h1>',
        renderMode: 'html',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-16T15:45:00.000Z',
        permissions: 'view',
        collaborativeUrl: '/editor/test-doc-123',
        viewUrl: '/view/test-doc-123'
      };

      mockDocumentService.loadDocument.mockResolvedValue(mockDocument);

      renderViewPage();

      await waitFor(() => {
        // Should show formatted creation date
        expect(screen.getByText(/created/i)).toBeInTheDocument();
        expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
      });
    });
  });

  describe('URL Handling', () => {
    it('should handle missing document ID', () => {
      // Temporarily override the mock for this test
      const originalMock = jest.requireMock('react-router-dom').useParams;
      jest.requireMock('react-router-dom').useParams = jest.fn(() => ({ documentId: undefined }));

      renderViewPage();

      expect(screen.getByText(/document not found/i)).toBeInTheDocument();
      
      // Restore the original mock
      jest.requireMock('react-router-dom').useParams = originalMock;
    });
  });
});