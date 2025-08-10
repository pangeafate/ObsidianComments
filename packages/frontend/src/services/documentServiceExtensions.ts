// DocumentService extensions to avoid circular dependency issues
// Based on FIX-initialization-error-resolution-plan.md

import { documentService } from './documentService';
import type { DocumentData } from './documentService';

export const extendedDocumentService = {
  ...documentService,
  
  async createDocument(documentId: string, title?: string, content?: string): Promise<DocumentData> {
    try {
      const baseUrl = (documentService as any).baseUrl || '/api';
      const docTitle = title || 'New Document';
      const docContent = content || `# ${docTitle}\n\nStart typing here...`;
      
      // Use POST to create document with custom ID
      const createResponse = await fetch(`${baseUrl}/notes/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: docTitle,
          content: docContent,
          shareId: documentId, // Pass the document ID as shareId
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('❌ Create response error:', errorText);
        throw new Error(`Failed to create document: ${createResponse.status} ${errorText}`);
      }

      const createResult = await createResponse.json();
      console.log('✅ Document created via API:', createResult);
      
      // Return the document data in expected format
      return {
        shareId: createResult.shareId,
        title: docTitle,
        content: docContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: 'edit',
        collaborativeUrl: createResult.collaborativeUrl,
      };
    } catch (error) {
      console.error('❌ Failed to create document:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create document');
    }
  },
  
  async saveDocument(documentId: string, content: string, title?: string): Promise<void> {
    try {
      const baseUrl = (documentService as any).baseUrl || '/api';
      
      // Update content
      const response = await fetch(`${baseUrl}/notes/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Store HTML in htmlContent for fidelity; backend switches renderMode accordingly
          htmlContent: content,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Save content response error:', errorText);
        throw new Error(`Failed to save document content: ${response.status} ${errorText}`);
      }
      
      console.log('✅ Document content saved successfully');

      // Update title if provided
      if (title) {
        const titleResponse = await fetch(`${baseUrl}/notes/${documentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
          }),
        });

        if (!titleResponse.ok) {
          console.warn('⚠️ Failed to update document title, but content was saved');
        } else {
          console.log('✅ Document title updated successfully');
        }
      }
    } catch (error) {
      console.error('❌ Failed to save document:', error);
      throw error;
    }
  },

  async updateDocumentTitle(documentId: string, title: string): Promise<void> {
    try {
      const baseUrl = (documentService as any).baseUrl || '/api';
      
      // Update only the title using PATCH
      const response = await fetch(`${baseUrl}/notes/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update title response error:', errorText);
        throw new Error(`Failed to update document title: ${response.status} ${errorText}`);
      }
      
      console.log('✅ Document title updated successfully:', title);
    } catch (error) {
      console.error('❌ Failed to update document title:', error);
      throw error;
    }
  },

  async saveTitle(documentId: string, title: string): Promise<void> {
    return this.updateDocumentTitle(documentId, title);
  }
};