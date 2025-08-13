import { useState, useEffect } from 'react';

export interface Document {
  shareId: string;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UseDocumentReturn {
  document: Document | null;
  loading: boolean;
  error: string | null;
  updateDocument: (updates: Partial<Document>) => void;
  saveDocument: () => Promise<void>;
}

/**
 * Hook for managing document state and persistence
 * This is a basic implementation that can be extended with actual API calls
 */
export function useDocument(documentId: string): UseDocumentReturn {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    // Simulate loading a document
    setLoading(true);
    
    // In a real implementation, this would be an API call
    setTimeout(() => {
      setDocument({
        shareId: documentId,
        title: `Document ${documentId}`,
        content: `# Document ${documentId}\n\nThis is the content for document ${documentId}.`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setLoading(false);
    }, 100);

    return () => {
      setDocument(null);
      setError(null);
    };
  }, [documentId]);

  const updateDocument = (updates: Partial<Document>) => {
    if (!document) return;
    
    setDocument(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
  };

  const saveDocument = async (): Promise<void> => {
    if (!document) throw new Error('No document to save');
    
    try {
      // In a real implementation, this would make an API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setDocument(prev => prev ? { ...prev, updatedAt: new Date() } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
      throw err;
    }
  };

  return {
    document,
    loading,
    error,
    updateDocument,
    saveDocument
  };
}