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
      // Never add H1 to content - title is handled separately in UI
      // If content is provided (especially from plugin), use it as-is to avoid duplication
      const docContent = content || `Start typing here...`; // Minimal placeholder for empty content only
      
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
      
      // Convert HTML to markdown for content field to prevent divergence
      const markdownContent = this.htmlToMarkdown(content);
      
      // Update both content and htmlContent to keep them in sync
      const response = await fetch(`${baseUrl}/notes/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: markdownContent,
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
  },

  // Simple HTML to Markdown converter to keep content fields in sync
  htmlToMarkdown(html: string): string {
    if (!html) return '';
    
    let markdown = html
      // Headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      
      // Paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      
      // Line breaks
      .replace(/<br\s*\/?>/gi, '  \n')
      
      // Bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      
      // Links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      
      // Images
      .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
      
      // Lists
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
      })
      
      // Code blocks
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      
      // Blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
        return content.replace(/^(.*)$/gm, '> $1') + '\n\n';
      })
      
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Clean up whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    return markdown;
  }
};