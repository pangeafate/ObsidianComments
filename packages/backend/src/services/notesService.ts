import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { sanitizeHtml } from '../utils/html-sanitizer';

const prisma = new PrismaClient();

// Generate view URL for HTML rendering
function generateViewUrl(shareId: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/view/${shareId}`;
}

// Generate collaborative editor URL
function generateCollaborativeUrl(shareId: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/editor/${shareId}`;
}

interface NoteData {
  title?: string;
  content?: string;
  htmlContent?: string;
  metadata?: any;
}

export async function createSharedNote(data: NoteData, customId?: string) {
  // Title is now REQUIRED - no automatic extraction
  if (!data.title) {
    throw new ValidationError('Title is required and must be provided explicitly');
  }

  // Sanitize HTML if provided
  const sanitizedHtml = data.htmlContent ? sanitizeHtml(data.htmlContent) : null;

  const document = await prisma.document.create({
    data: {
      id: customId, // Use custom ID if provided, otherwise auto-generate
      title: data.title, // Use provided title as-is
      content: data.content || '',
      htmlContent: sanitizedHtml,
      renderMode: sanitizedHtml ? 'html' : 'markdown',
      metadata: {
        ...data.metadata,
        source: data.htmlContent ? 'obsidian-share-note' : 'obsidian-plugin',
        createdVia: 'api'
      }
    }
  });

  return {
    shareId: document.id,
    collaborativeUrl: generateCollaborativeUrl(document.id),
    viewUrl: generateViewUrl(document.id),
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
    htmlContent: document.htmlContent,
    renderMode: document.renderMode || 'markdown',
    createdAt: document.publishedAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    permissions: 'edit',
    collaborativeUrl: generateCollaborativeUrl(document.id),
    viewUrl: generateViewUrl(document.id)
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

  // Update content without touching title (no auto-extraction)
  if (updates.content !== undefined) {
    updateData.content = updates.content;
    // REMOVED: automatic title extraction
  }

  // Only update title if explicitly provided
  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  // Update HTML if provided
  if (updates.htmlContent !== undefined) {
    updateData.htmlContent = updates.htmlContent ? sanitizeHtml(updates.htmlContent) : null;
    updateData.renderMode = updates.htmlContent ? 'html' : 'markdown';
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