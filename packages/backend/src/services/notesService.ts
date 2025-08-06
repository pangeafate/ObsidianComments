import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

const prisma = new PrismaClient();

// Helper function to extract title from markdown or HTML content
function extractTitleFromMarkdown(content: string): string {
  // Check if content is HTML (contains HTML tags)
  const isHTML = /<[^>]+>/.test(content);
  
  if (isHTML) {
    // Handle HTML content from TipTap editor
    try {
      // First, convert block elements to line breaks to preserve structure
      let processedHtml = content
        .replace(/<\/p>/gi, '</p>\n')
        .replace(/<\/div>/gi, '</div>\n')
        .replace(/<\/h[1-6]>/gi, '</h>\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/li>/gi, '</li>\n');
      
      // Remove HTML tags
      const plainText = processedHtml
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
      
      // Get first non-empty line
      const lines = plainText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (lines.length > 0) {
        let firstLine = lines[0]
          .replace(/^#+\s*/, '') // Remove markdown headers
          .replace(/^\*+\s*/, '') // Remove bullet points
          .replace(/^\d+\.\s*/, '') // Remove numbered lists
          .replace(/^[-•]\s*/, '') // Remove dashes
          .trim();
        
        if (firstLine.length > 60) {
          firstLine = firstLine.substring(0, 57) + '...';
        }
        
        return firstLine.length >= 3 ? firstLine : 'Untitled Document';
      }
    } catch (error) {
      console.error('HTML title extraction failed:', error);
    }
  } else {
    // Handle Markdown content (original logic)
    const lines = content.split('\n');
    
    // Look for the first H1 heading
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    
    // Fallback: use first non-empty line
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        return trimmed.length > 60 ? trimmed.substring(0, 57) + '...' : trimmed;
      }
    }
  }
  
  return 'Untitled Document';
}

// Generate collaborative editor URL
function generateCollaborativeUrl(shareId: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/editor/${shareId}`;
}

interface NoteData {
  title?: string;
  content?: string;
  metadata?: any;
}

export async function createSharedNote(data: NoteData, customId?: string) {
  const title = data.title || extractTitleFromMarkdown(data.content || '');
  
  const document = await prisma.document.create({
    data: {
      id: customId, // Use custom ID if provided, otherwise auto-generate
      title,
      content: data.content || '',
      metadata: {
        ...data.metadata,
        source: customId ? 'web-editor' : 'obsidian-plugin',
        createdVia: 'api'
      }
    }
  });

  return {
    shareId: document.id,
    collaborativeUrl: generateCollaborativeUrl(document.id),
    title: document.title
  };
}

export async function getSharedNote(shareId: string) {
  const document = await prisma.document.findUnique({
    where: { id: shareId }
  });

  if (!document) {
    throw new NotFoundError('Shared note not found. It may have been deleted.');
  }

  return {
    shareId: document.id,
    title: document.title,
    content: document.content,
    createdAt: document.publishedAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    permissions: 'edit',
    collaborativeUrl: generateCollaborativeUrl(document.id)
  };
}

export async function updateSharedNote(shareId: string, updates: NoteData) {
  const document = await prisma.document.findUnique({
    where: { id: shareId }
  });

  if (!document) {
    throw new NotFoundError('Shared note not found. It may have been deleted.');
  }

  const updateData: any = {
    updatedAt: new Date()
  };

  if (updates.content !== undefined) {
    updateData.content = updates.content;
    updateData.title = extractTitleFromMarkdown(updates.content);
  }

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  const updated = await prisma.document.update({
    where: { id: shareId },
    data: updateData
  });

  return {
    success: true,
    updatedAt: updated.updatedAt.toISOString()
  };
}

export async function deleteSharedNote(shareId: string) {
  const document = await prisma.document.findUnique({
    where: { id: shareId }
  });

  if (!document) {
    throw new NotFoundError('Shared note not found. It may have been deleted.');
  }

  await prisma.document.delete({
    where: { id: shareId }
  });
}

export async function listSharedNotes(limit?: number, offset?: number) {
  const documents = await prisma.document.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit || 100, // Use provided limit or default to 100
    skip: offset || 0
  });

  const shares = documents.map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    createdAt: doc.publishedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  }));

  return shares;
}