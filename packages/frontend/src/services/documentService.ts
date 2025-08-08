export interface DocumentData {
  shareId: string;
  title: string;
  content: string;
  htmlContent?: string | null;
  renderMode?: 'html' | 'markdown';
  createdAt: string;
  updatedAt: string;
  permissions: string;
  collaborativeUrl: string;
  viewUrl?: string;
}

class DocumentService {
  private baseUrl: string;

  constructor() {
    // Prefer import.meta.env in browser; fallback to process.env for Jest; default to relative
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viteEnv = (typeof window !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : undefined;
    const fromVite = viteEnv?.VITE_API_URL as string | undefined;
    const fromProcess = typeof process !== 'undefined' ? (process.env?.VITE_API_URL as string | undefined) : undefined;
    const base = fromVite || fromProcess || '';
    this.baseUrl = base ? base + '/api' : '/api';
  }

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