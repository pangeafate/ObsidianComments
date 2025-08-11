/**
 * TDD Tests for Collaborative Editor Body Display Issue
 * 
 * Problem: Content is not displayed in collaborative editing mode, but visible in HTML view
 * Expected: Content should be loaded and displayed in collaborative editor
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Editor } from '../Editor';
import * as Y from 'yjs';

// Mock the collaboration hooks and services
jest.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: () => ({
    isInitialSyncComplete: true,
    yXmlFragment: new Y.XmlFragment(),
    provider: {
      connect: jest.fn(),
      disconnect: jest.fn()
    }
  })
}));

jest.mock('../../services/documentService', () => ({
  documentService: {
    loadDocument: jest.fn(),
    saveDocument: jest.fn(),
    createDocument: jest.fn()
  }
}));

jest.mock('../../hooks/useDocument', () => ({
  useDocument: (documentId: string) => ({
    document: {
      shareId: documentId,
      title: 'Test Document',
      content: `# Test Document

This is test content with multiple paragraphs.

## Section 1

Content under section 1.

- List item 1
- List item 2

## Section 2

More content here.`,
      htmlContent: '<h1>Test Document</h1><p>This is test content...</p>',
      permissions: 'edit',
      collaborativeUrl: `https://example.com/editor/${documentId}`
    },
    loading: false,
    error: null,
    refetch: jest.fn()
  })
}));

describe('Collaborative Editor Content Display', () => {
  let mockYDoc: Y.Doc;
  let mockXmlFragment: Y.XmlFragment;

  beforeEach(() => {
    mockYDoc = new Y.Doc();
    mockXmlFragment = mockYDoc.getXmlFragment('document');
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockYDoc.destroy();
  });

  describe('Content Loading on Editor Mount', () => {
    it('should load and display content when collaborative editor mounts', async () => {
      // Arrange: Document with existing content
      const documentId = 'test-doc-123';
      const expectedContent = `# Test Document

This is test content with multiple paragraphs.`;

      // Act: Render collaborative editor
      render(
        <Editor 
          documentId={documentId}
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
        />
      );

      // Assert: Content should be visible in editor
      await waitFor(() => {
        // Should find the content text
        expect(screen.getByText(/This is test content with multiple paragraphs/)).toBeInTheDocument();
        
        // Should find the title in content
        expect(screen.getByText('Test Document')).toBeInTheDocument();
        
        // Should find list items
        expect(screen.getByText(/List item 1/)).toBeInTheDocument();
        expect(screen.getByText(/List item 2/)).toBeInTheDocument();
      });
    });

    it('should handle content loading even when Yjs sync is delayed', async () => {
      // Arrange: Simulate delayed Yjs sync
      const mockUseCollaboration = jest.requireMock('../../hooks/useCollaboration').useCollaboration;
      mockUseCollaboration.mockReturnValue({
        isInitialSyncComplete: false, // Sync not complete yet
        yXmlFragment: new Y.XmlFragment(),
        provider: { connect: jest.fn(), disconnect: jest.fn() }
      });

      const documentId = 'test-doc-delayed';

      // Act: Render editor before sync completes
      render(
        <Editor 
          documentId={documentId}
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
        />
      );

      // Assert: Should show loading state initially
      expect(screen.getByTestId('editor-loading') || screen.getByText(/Loading/i)).toBeInTheDocument();

      // Act: Complete the sync
      await act(async () => {
        mockUseCollaboration.mockReturnValue({
          isInitialSyncComplete: true,
          yXmlFragment: mockXmlFragment,
          provider: { connect: jest.fn(), disconnect: jest.fn() }
        });
      });

      // Assert: Content should appear after sync
      await waitFor(() => {
        expect(screen.getByText(/This is test content with multiple paragraphs/)).toBeInTheDocument();
      });
    });

    it('should load content even when Yjs fragment starts empty', async () => {
      // Arrange: Empty Yjs fragment (new document state)
      const emptyFragment = new Y.XmlFragment();
      expect(emptyFragment.length).toBe(0);

      const documentId = 'test-doc-empty-yjs';

      // Act: Render editor with empty Yjs state
      render(
        <Editor 
          documentId={documentId}
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
        />
      );

      // Assert: Should still load content from API
      await waitFor(() => {
        expect(screen.getByText(/This is test content with multiple paragraphs/)).toBeInTheDocument();
      });
    });
  });

  describe('Content Initialization Race Conditions', () => {
    it('should handle multiple content sources correctly', async () => {
      // Arrange: Simulate race between API content and Yjs content
      const apiContent = `# API Content

Content from API response.`;

      const yjsContent = `# Yjs Content

Content from Yjs document.`;

      // Mock Yjs fragment with content
      mockXmlFragment.insert(0, [{ type: 'paragraph', content: [{ type: 'text', text: yjsContent }] }]);

      const documentId = 'test-doc-race';

      // Act: Render editor with competing content sources
      render(
        <Editor 
          documentId={documentId}
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
        />
      );

      // Assert: Should handle the race gracefully and show some content
      await waitFor(() => {
        // Should show either API or Yjs content, but not be empty
        const editorContent = screen.getByTestId('tiptap-editor') || screen.getByRole('textbox');
        expect(editorContent).toBeInTheDocument();
        expect(editorContent).not.toHaveTextContent(''); // Should not be empty
      });
    });

    it('should prevent content initialization when document is just created', async () => {
      // Arrange: Newly created document scenario
      const documentId = 'obsidian-new-doc-123';
      
      // Mock document as just created
      const mockUseDocument = jest.requireMock('../../hooks/useDocument').useDocument;
      mockUseDocument.mockReturnValue({
        document: null, // No document exists yet
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      // Act: Render editor for new document
      render(
        <Editor 
          documentId={documentId}
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
          justCreatedDocument={true}
        />
      );

      // Assert: Should show placeholder content for new document
      await waitFor(() => {
        expect(screen.getByText(/Start typing here/i) || screen.getByPlaceholderText(/Start typing/i)).toBeInTheDocument();
      });
    });

    it('should handle short content correctly (not skip due to length threshold)', async () => {
      // Arrange: Very short but valid content
      const shortContent = 'Short note';
      
      const mockUseDocument = jest.requireMock('../../hooks/useDocument').useDocument;
      mockUseDocument.mockReturnValue({
        document: {
          shareId: 'test-short',
          title: 'Short Note',
          content: shortContent,
          permissions: 'edit'
        },
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      // Act: Render editor with short content
      render(
        <Editor 
          documentId="test-short"
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
        />
      );

      // Assert: Short content should still be displayed
      await waitFor(() => {
        expect(screen.getByText('Short note')).toBeInTheDocument();
      });
    });
  });

  describe('Fallback Content Loading', () => {
    it('should show content even if Yjs initialization fails', async () => {
      // Arrange: Simulate Yjs connection failure
      const mockUseCollaboration = jest.requireMock('../../hooks/useCollaboration').useCollaboration;
      mockUseCollaboration.mockReturnValue({
        isInitialSyncComplete: false,
        yXmlFragment: null, // Failed to create fragment
        provider: { connect: jest.fn(), disconnect: jest.fn() }
      });

      const documentId = 'test-yjs-fail';

      // Act: Render editor with Yjs failure
      render(
        <Editor 
          documentId={documentId}
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
        />
      );

      // Assert: Should fall back to API content
      await waitFor(() => {
        expect(screen.getByText(/This is test content with multiple paragraphs/)).toBeInTheDocument();
      });
    });

    it('should provide meaningful error feedback when both API and Yjs fail', async () => {
      // Arrange: Both API and Yjs fail
      const mockUseDocument = jest.requireMock('../../hooks/useDocument').useDocument;
      mockUseDocument.mockReturnValue({
        document: null,
        loading: false,
        error: new Error('Failed to load document'),
        refetch: jest.fn()
      });

      const mockUseCollaboration = jest.requireMock('../../hooks/useCollaboration').useCollaboration;
      mockUseCollaboration.mockReturnValue({
        isInitialSyncComplete: false,
        yXmlFragment: null,
        provider: null
      });

      // Act: Render editor with all failures
      render(
        <Editor 
          documentId="test-all-fail"
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
        />
      );

      // Assert: Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to load document/) || screen.getByText(/Error loading content/)).toBeInTheDocument();
      });
    });
  });

  describe('Content vs View Mode Comparison', () => {
    it('should display the same content as view mode', async () => {
      // This test ensures parity between collaborative editor and view mode
      const documentId = 'test-parity';
      const expectedContent = 'This is test content with multiple paragraphs.';

      // Act: Render collaborative editor
      render(
        <Editor 
          documentId={documentId}
          onTitleChange={jest.fn()}
          onSaveTitle={jest.fn()}
        />
      );

      // Assert: Content should match what view mode would show
      await waitFor(() => {
        expect(screen.getByText(expectedContent)).toBeInTheDocument();
      });

      // Note: In a real integration test, we would also render ViewPage 
      // and compare that the same content appears in both modes
    });
  });
});