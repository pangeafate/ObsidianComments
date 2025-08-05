// DocumentService extensions to avoid circular dependency issues
// Based on FIX-initialization-error-resolution-plan.md

import { documentService } from './documentService';
import type { DocumentData } from './documentService';

export const extendedDocumentService = {
  ...documentService,
  
  async createDocument(documentId: string, title?: string, content?: string): Promise<DocumentData> {
    try {
      // First, try to create with the specific ID using PUT
      const baseUrl = (documentService as any).baseUrl || 'http://localhost:8081';
      const response = await fetch(`${baseUrl}/api/notes/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content || `# ${title || 'New Document'}\n\nStart typing here...`,
        }),
      });

      if (!response.ok) {
        // If PUT fails, try POST to create with auto-generated ID
        const createResponse = await fetch(`${baseUrl}/api/notes/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content || `# ${title || 'New Document'}\n\nStart typing here...`,
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create document');
        }

        const createResult = await createResponse.json();
        
        // Return the document data in expected format
        return {
          shareId: createResult.shareId,
          title: title || 'New Document',
          content: content || `# ${title || 'New Document'}\n\nStart typing here...`,
          createdAt: createResult.createdAt,
          updatedAt: createResult.createdAt,
          permissions: 'edit',
          collaborativeUrl: createResult.shareUrl,
        };
      }

      // If PUT succeeded, fetch the created document
      return await documentService.loadDocument(documentId);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create document');
    }
  },
  
  async saveDocument(documentId: string, content: string): Promise<void> {
    try {
      const baseUrl = (documentService as any).baseUrl || 'http://localhost:8081';
      const response = await fetch(`${baseUrl}/api/notes/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error;
    }
  }
};