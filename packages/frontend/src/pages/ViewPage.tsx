import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { documentService, type DocumentData } from '../services/documentService';
import { markdownToHtml } from '../utils/markdownConverter';
import { renderSafeTitle } from '../utils/contentSanitizer';
import packageInfo from '../../package.json';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  document: DocumentData | null;
}

export function ViewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadingState>({
    isLoading: true,
    error: null,
    document: null
  });

  useEffect(() => {
    async function loadDocument() {
      if (!documentId) {
        setState({
          isLoading: false,
          error: 'Document not found',
          document: null
        });
        return;
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const document = await documentService.loadDocument(documentId);
        setState({
          isLoading: false,
          error: null,
          document
        });
      } catch (error) {
        setState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load document',
          document: null
        });
      }
    }

    loadDocument();
  }, [documentId]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error || !state.document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {state.error === 'Document not found' ? 'Document Not Found' : 'Error Loading Document'}
          </h1>
          <p className="text-gray-600 mb-4">
            {state.error === 'Document not found' 
              ? "The document you're looking for doesn't exist."
              : 'Failed to load the document. Please try again later.'
            }
          </p>
          <Link 
            to="/" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const { document } = state;

  // Render HTML content or fallback to markdown
  const renderContent = () => {
    // Use HTML content if available and not empty
    if (document.renderMode === 'html' && document.htmlContent && document.htmlContent.trim()) {
      const sanitizedHtml = DOMPurify.sanitize(document.htmlContent, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 's', 'del',
          'ul', 'ol', 'li',
          'blockquote', 'code', 'pre',
          'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span', 'input'
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'type', 'checked', 'disabled'],
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'iframe'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onfocus', 'onmouseover']
      });

      return (
        <div 
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }

    // Fallback to markdown rendering
    const htmlFromMarkdown = markdownToHtml(document.content);
    const sanitizedMarkdownHtml = DOMPurify.sanitize(htmlFromMarkdown, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's', 'del',
        'ul', 'ol', 'li',
        'blockquote', 'code', 'pre',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'input', 'span'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'type', 'checked', 'disabled'],
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'iframe']
    });

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: sanitizedMarkdownHtml }}
      />
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Title and Metadata */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {renderSafeTitle(document.title)}
              </h1>
              <p className="text-sm text-gray-500">
                Created {formatDate(document.createdAt)}
                {document.updatedAt !== document.createdAt && (
                  <span> • Updated {formatDate(document.updatedAt)}</span>
                )}
              </p>
            </div>

            {/* Main Header Layout */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 ml-0 sm:ml-4 mt-3 sm:mt-0 w-full sm:w-auto">
              {/* Dashboard Section - Status indicators */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6" data-testid="dashboard-section">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" data-testid="mode-indicator">
                    View Mode
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {document.renderMode === 'html' ? 'HTML' : 'Markdown'}
                  </span>
                </div>
              </div>
              
              {/* Action Button Section */}
              <div className="flex items-center gap-2" data-testid="button-section">
                {/* Edit Button */}
                <button
                  onClick={() => navigate(`/editor/${documentId}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">Edit Document</span>
                  <span className="sm:hidden">Edit</span>
                </button>

                {/* Back to Home */}
                <Link
                  to="/"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium transition-colors"
                >
                  <span className="hidden sm:inline">Home</span>
                  <span className="sm:hidden">←</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 sm:p-8 lg:p-12">
            <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 hover:prose-a:text-blue-800">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-4">
              {document.permissions && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {document.permissions} access
                </span>
              )}
              <span className="text-xs">
                Document ID: {documentId}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Read-only view • Switch to Edit mode to make changes • v{packageInfo.version}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}