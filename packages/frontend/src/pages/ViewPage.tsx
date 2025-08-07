import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { documentService, type DocumentData } from '../services/documentService';
import { markdownToHtml } from '../utils/markdownConverter';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  document: DocumentData | null;
}

export function ViewPage() {
  const { documentId } = useParams<{ documentId: string }>();
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
          'div', 'span'
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onfocus', 'onmouseover']
      });

      return (
        <div 
          className="prose prose-lg max-w-none"
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
        'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe']
    });

    return (
      <div 
        className="prose prose-lg max-w-none"
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
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {document.title}
              </h1>
              <p className="text-sm text-gray-500">
                Created {formatDate(document.createdAt)}
                {document.updatedAt !== document.createdAt && (
                  <span> • Updated {formatDate(document.updatedAt)}</span>
                )}
              </p>
            </div>

            {/* Edit link if collaborative editing is available */}
            {document.collaborativeUrl && (
              <Link
                to={document.collaborativeUrl}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Edit this document
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {renderContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              <Link to="/" className="text-blue-600 hover:text-blue-800">
                ← Back to Home
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {document.renderMode === 'html' ? 'HTML View' : 'Markdown View'}
              </span>
              {document.permissions && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {document.permissions} access
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}