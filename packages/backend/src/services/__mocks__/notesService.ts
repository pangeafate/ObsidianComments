// Mock notes service for unit testing

interface NoteData {
  title?: string;
  content?: string;
  metadata?: any;
}

// In-memory storage for testing
const mockDocuments = new Map<string, any>();
let idCounter = 1;

// Add some sample data for testing
function initializeSampleData() {
  if (mockDocuments.size === 0) {
    for (let i = 1; i <= 5; i++) {
      const id = `test-doc-${i}`;
      mockDocuments.set(id, {
        id,
        title: `Sample Document ${i}`,
        content: `# Sample Document ${i}\n\nThis is sample content.`,
        metadata: { sample: true },
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        updatedAt: new Date(Date.now() - i * 30000).toISOString()
      });
    }
    idCounter = 6;
  }
}

function generateId(): string {
  return `test-doc-${idCounter++}`;
}

function generateCollaborativeUrl(shareId: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/editor/${shareId}`;
}

function sanitizeInput(input: string): string {
  // Simple sanitization - remove script tags
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

export async function createSharedNote(data: NoteData): Promise<any> {
  const shareId = generateId();
  
  // Sanitize inputs
  const sanitizedTitle = data.title ? sanitizeInput(data.title) : 'Untitled';
  const sanitizedContent = data.content ? sanitizeInput(data.content) : '';
  
  const document = {
    id: shareId,
    title: sanitizedTitle,
    content: sanitizedContent,
    metadata: data.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockDocuments.set(shareId, document);
  
  return {
    shareId,
    collaborativeUrl: generateCollaborativeUrl(shareId),
    title: sanitizedTitle
  };
}

export async function getSharedNote(shareId: string): Promise<any> {
  const document = mockDocuments.get(shareId);
  
  if (!document) {
    const error = new Error('Document not found');
    (error as any).status = 404;
    throw error;
  }
  
  return {
    id: document.id,
    title: document.title,
    content: document.content,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

export async function updateSharedNote(shareId: string, updates: NoteData): Promise<any> {
  const document = mockDocuments.get(shareId);
  
  if (!document) {
    const error = new Error('Document not found');
    (error as any).status = 404;
    throw error;
  }
  
  // Update fields
  if (updates.title !== undefined) {
    document.title = sanitizeInput(updates.title);
  }
  
  if (updates.content !== undefined) {
    document.content = sanitizeInput(updates.content);
  }
  
  document.updatedAt = new Date().toISOString();
  mockDocuments.set(shareId, document);
  
  return {
    success: true,
    updatedAt: document.updatedAt
  };
}

export async function deleteSharedNote(shareId: string): Promise<void> {
  const document = mockDocuments.get(shareId);
  
  if (!document) {
    const error = new Error('Document not found');
    (error as any).status = 404;
    throw error;
  }
  
  mockDocuments.delete(shareId);
}

export async function listSharedNotes(limit?: number, offset?: number): Promise<any> {
  initializeSampleData();
  
  const documents = Array.from(mockDocuments.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const start = offset || 0;
  const end = limit ? start + limit : documents.length;
  const paginatedDocs = documents.slice(start, end);
  
  const shares = paginatedDocs.map(doc => ({
    shareId: doc.id, // Plugin expects shareId not id
    title: doc.title,
    shareUrl: `http://localhost:5173/editor/${doc.id}`, // Add shareUrl for plugin compatibility
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    permissions: 'edit', // Default permission
    views: 0, // TODO: Implement view tracking
    editors: 0 // TODO: Implement editor tracking
  }));

  // Return wrapped format as expected by plugin
  return {
    shares,
    total: mockDocuments.size
  };
}