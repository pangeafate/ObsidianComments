import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { sanitizeHtml, cleanMarkdownContent } from '../utils/html-sanitizer';
import * as Y from 'yjs';

const prisma = new PrismaClient();

// Simple ID generation fallback
function generateId(): string {
  return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

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

// Generate edit URL (same as collaborative URL for now)
function generateEditUrl(shareId: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/editor/${shareId}`;
}

interface NoteData {
  title?: string;
  content?: string;
  htmlContent?: string;
  metadata?: any;
}

// Initialize Yjs document with content for collaborative editing
function initializeYjsDocument(content: string): Buffer {
  console.log('🔧 [YJS] Initializing Yjs document with content length:', content?.length || 0);
  
  const ydoc = new Y.Doc();
  
  if (content && content.trim()) {
    // Get the prosemirror fragment (used by TipTap/ProseMirror)
    const prosemirrorFragment = ydoc.getXmlFragment('default');
    
    // For simple text content, create a paragraph node
    // This matches how TipTap initializes content
    const paragraph = new Y.XmlElement('paragraph');
    const textNode = new Y.XmlText();
    textNode.insert(0, content);
    paragraph.insert(0, [textNode]);
    prosemirrorFragment.insert(0, [paragraph]);
    
    console.log('✅ [YJS] Yjs document initialized with content');
  } else {
    console.log('ℹ️ [YJS] Yjs document initialized empty (no content provided)');
  }
  
  // Encode the document state and return as Buffer
  const state = Y.encodeStateAsUpdate(ydoc);
  console.log('📦 [YJS] Encoded state size:', state.length, 'bytes');
  
  return Buffer.from(state);
}

export async function createSharedNote(data: NoteData, customId?: string) {
  console.log('🔧 [DEBUG] createSharedNote called with:', { title: data.title?.length, content: data.content?.length, htmlContent: data.htmlContent?.length, customId });
  
  // Handle title: default to "Untitled Document" if not provided or empty
  let cleanTitle = (data.title && data.title.trim().length > 0) 
    ? data.title.trim() 
    : 'Untitled Document';
  console.log('✅ [DEBUG] Title handling completed:', { provided: data.title, final: cleanTitle });

  // Clean markdown content first
  console.log('🧹 [DEBUG] Starting content cleaning...');
  const cleanedContent = data.content ? cleanMarkdownContent(data.content) : '';
  console.log('✅ [DEBUG] Content cleaning successful:', { originalLength: data.content?.length, cleanedLength: cleanedContent.length });


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

  // Initialize Yjs state for collaborative editing
  console.log('🔧 [DEBUG] Initializing Yjs state for collaborative editing...');
  const yjsState = initializeYjsDocument(cleanedContent);
  console.log('✅ [DEBUG] Yjs state initialization completed:', { stateSize: yjsState.length });

  console.log('💾 [DEBUG] Starting Prisma document.create...');
  console.log('💾 [DEBUG] Prisma data payload:', {
    customId: customId, // Frontend-provided ID (now allowed as arbitrary string)
    title: cleanTitle,
    contentLength: data.content?.length || 0,
    htmlContentLength: sanitizedHtml?.length || 0,
    renderMode: sanitizedHtml ? 'html' : 'markdown',
    hasMetadata: !!data.metadata,
    yjsStateSize: yjsState.length
  });
  
  let document;
  try {
    // FIXED: Use custom ID or generate a fallback if none provided
    // Prisma schema now allows arbitrary string IDs (removed CUID requirement)
    const documentId = customId || generateId(); // Use frontend ID or generate one
    document = await prisma.document.create({
      data: {
        id: documentId, // Now works with any string format
        title: cleanTitle, // Use cleaned title
        content: cleanedContent,
        yjsState: yjsState, // CRITICAL FIX: Initialize Yjs state for collaborative editing
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
    shareUrl: generateCollaborativeUrl(document.id), // Standardized as shareUrl for plugin compatibility
    viewUrl: generateViewUrl(document.id),
    editUrl: generateEditUrl(document.id),
    title: document.title,
    createdAt: document.publishedAt.toISOString(),
    permissions: 'edit',
    version: 1 // TODO: Implement proper version tracking from database
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
    shareUrl: generateCollaborativeUrl(document.id), // Standardized as shareUrl for plugin compatibility
    viewUrl: generateViewUrl(document.id),
    version: 1 // TODO: Implement proper version tracking from database
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
    // CRITICAL FIX: Update Yjs state when content changes
    updateData.yjsState = initializeYjsDocument(updates.content);
    console.log('🔧 [DEBUG] Updated Yjs state for content change:', { stateSize: updateData.yjsState.length });
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

  // Update metadata if provided
  if (updates.metadata !== undefined) {
    updateData.metadata = updates.metadata;
  }

  const updated = await prisma.document.update({
    where: { id: shareId },
    data: updateData
  });

  return {
    shareId: updated.id,
    title: updated.title,
    content: updated.content,
    htmlContent: updated.htmlContent,
    renderMode: updated.renderMode || 'markdown',
    createdAt: updated.publishedAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    permissions: 'edit',
    shareUrl: generateCollaborativeUrl(updated.id), // Standardized as shareUrl for plugin compatibility
    viewUrl: generateViewUrl(updated.id)
  };
}

export async function deleteSharedNote(shareId: string) {
  try {
    // First check if the note exists to get its details before deletion
    const existingNote = await prisma.document.findUnique({
      where: { id: shareId },
      select: { id: true, title: true }
    });

    if (!existingNote) {
      throw new NotFoundError('Shared note not found. It may have already been deleted.');
    }

    // Delete the note
    await prisma.document.delete({
      where: { id: shareId }
    });

    return {
      success: true,
      message: 'Note deleted successfully',
      deletedNoteId: shareId,
      title: existingNote.title,
      notifyCollaborators: true
    };
  } catch (error) {
    if ((error as any).code === 'P2025') {
      // Prisma record not found error
      throw new NotFoundError('Shared note not found. It may have already been deleted.');
    }
    throw error;
  }
}

export async function listSharedNotes(limit?: number, offset?: number) {
  const documents = await prisma.document.findMany({
    orderBy: { publishedAt: 'desc' },
    take: limit || 100, // Use provided limit or default to 100
    skip: offset || 0
  });

  // Get total count for pagination
  const totalCount = await prisma.document.count();

  const shares = documents.map((doc: any) => ({
    shareId: doc.id, // Plugin expects shareId not id
    title: doc.title,
    shareUrl: generateCollaborativeUrl(doc.id), // Add shareUrl for plugin compatibility
    createdAt: doc.publishedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    permissions: 'edit', // Default permission
    views: doc.views || 0, // Use actual database field
    editors: doc.activeEditors || 0 // Use actual database field
  }));

  // Return wrapped format as expected by plugin
  return {
    shares,
    total: totalCount
  };
}