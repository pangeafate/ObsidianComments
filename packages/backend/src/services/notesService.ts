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

export async function createSharedNote(content: string, customId?: string) {
  const title = extractTitleFromMarkdown(content);
  
  const document = await prisma.document.create({
    data: {
      id: customId, // Use custom ID if provided, otherwise auto-generate
      title,
      content,
      metadata: {
        source: customId ? 'web-editor' : 'obsidian-plugin',
        createdVia: 'api'
      }
    }
  });

  return {
    shareUrl: generateCollaborativeUrl(document.id),
    shareId: document.id,
    createdAt: document.publishedAt.toISOString(),
    permissions: 'edit'
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

export async function updateSharedNote(shareId: string, content: string) {
  const title = extractTitleFromMarkdown(content);
  
  const document = await prisma.document.findUnique({
    where: { id: shareId }
  });

  if (!document) {
    throw new NotFoundError('Shared note not found. It may have been deleted.');
  }

  const updated = await prisma.document.update({
    where: { id: shareId },
    data: {
      title,
      content,
      updatedAt: new Date()
    }
  });

  return {
    shareId: updated.id,
    updatedAt: updated.updatedAt.toISOString(),
    version: 1 // We'll implement proper versioning later
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

export async function listSharedNotes() {
  const documents = await prisma.document.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 100 // Limit to 100 most recent
  });

  const shares = documents.map(doc => ({
    shareId: doc.id,
    title: doc.title,
    shareUrl: generateCollaborativeUrl(doc.id),
    createdAt: doc.publishedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    permissions: 'edit',
    views: 0, // We'll implement analytics later
    editors: 1 // We'll implement proper editor tracking later
  }));

  return {
    shares,
    total: shares.length
  };
}