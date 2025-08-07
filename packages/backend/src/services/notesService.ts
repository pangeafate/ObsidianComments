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
  console.log('🔧 [DEBUG] createSharedNote called with:', { title: data.title?.length, content: data.content?.length, htmlContent: data.htmlContent?.length, customId });
  
  // Title is now REQUIRED - no automatic extraction
  if (!data.title) {
    console.error('❌ [DEBUG] Validation failed: Title is required');
    throw new ValidationError('Title is required and must be provided explicitly');
  }
  console.log('✅ [DEBUG] Title validation passed');

  // Sanitize HTML if provided
  console.log('🧹 [DEBUG] Starting HTML sanitization...');
  let sanitizedHtml = null;
  try {
    sanitizedHtml = data.htmlContent ? sanitizeHtml(data.htmlContent) : null;
    console.log('✅ [DEBUG] HTML sanitization successful:', { originalLength: data.htmlContent?.length, sanitizedLength: sanitizedHtml?.length });
  } catch (error) {
    console.error('❌ [DEBUG] HTML sanitization failed:', error);
    throw new ValidationError(`HTML sanitization failed: ${(error as Error).message}`);
  }

  console.log('💾 [DEBUG] Starting Prisma document.create...');
  console.log('💾 [DEBUG] Prisma data payload:', {
    customId: customId, // Frontend-provided ID (for reference only, not used as DB ID)
    title: data.title,
    contentLength: data.content?.length || 0,
    htmlContentLength: sanitizedHtml?.length || 0,
    renderMode: sanitizedHtml ? 'html' : 'markdown',
    hasMetadata: !!data.metadata
  });
  
  let document;
  try {
    // CRITICAL FIX: Don't pass custom ID to Prisma - let it auto-generate CUID
    // The frontend's customId may not be valid CUID format
    document = await prisma.document.create({
      data: {
        // id: auto-generated CUID (removed customId to fix 500 error)
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
    console.log('✅ [DEBUG] Prisma document.create successful:', { documentId: document.id, createdAt: document.publishedAt });
  } catch (error) {
    console.error('❌ [DEBUG] Prisma document.create failed:', error);
    console.error('❌ [DEBUG] Prisma error details:', {
      name: (error as any).name,
      message: (error as any).message,
      code: (error as any).code,
      meta: (error as any).meta
    });
    throw error;
  }

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