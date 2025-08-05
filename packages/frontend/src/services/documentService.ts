export interface DocumentData {
  shareId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  permissions: string;
  collaborativeUrl: string;
}

class DocumentService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

  async loadDocument(documentId: string): Promise<DocumentData> {
    try {
      const response = await fetch(`${this.baseUrl}/notes/${documentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document not found');
        }
        throw new Error('Failed to load document');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load document');
    }
  }

  async checkDocumentExists(documentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/notes/${documentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

}

export const documentService = new DocumentService();