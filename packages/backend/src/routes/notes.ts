import { Router } from 'express';
import { 
  createSharedNote, 
  getSharedNote, 
  updateSharedNote, 
  deleteSharedNote, 
  listSharedNotes 
} from '../services/notesService';
import { 
  validateNoteShare, 
  validateNoteUpdate, 
  validateNoteTitleUpdate, 
  validateShareId 
} from '../utils/validation';

const router = Router();

// POST /api/notes/share - Create a new shared document
router.post('/share', async (req, res, next) => {
  try {
    console.log('📝 [DEBUG] POST /api/notes/share - Request received');
    console.log('📝 [DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('📝 [DEBUG] Request body keys:', Object.keys(req.body));
    console.log('📝 [DEBUG] Request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 [DEBUG] Raw body type:', typeof req.body);
    console.log('📝 [DEBUG] Content-Length:', req.get('content-length'));
    console.log('📝 [DEBUG] User-Agent:', req.get('user-agent'));
    
    const { title, content, htmlContent, metadata, shareId } = req.body;
    console.log('📝 [DEBUG] Extracted fields:', { title: title?.length, content: content?.length, htmlContent: htmlContent?.length, hasMetadata: !!metadata, shareId });
    
    console.log('📝 [DEBUG] Starting validation...');
    const validated = validateNoteShare({ title, content, htmlContent, metadata });
    console.log('📝 [DEBUG] Validation successful:', { title: validated.title?.length, content: validated.content?.length });
    
    console.log('📝 [DEBUG] Creating shared note...');
    const result = await createSharedNote(validated, shareId);
    console.log('📝 [DEBUG] Note created successfully:', { shareId: result.shareId });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ [DEBUG] POST /api/notes/share - Error occurred:', error);
    console.error('❌ [DEBUG] Error stack:', (error as Error).stack);
    next(error);
  }
});

// GET /api/notes/:shareId - Get document details
router.get('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = validateShareId(req.params);
    const result = await getSharedNote(shareId);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /api/notes/:shareId - Update document content
router.put('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = validateShareId(req.params);
    const validated = validateNoteUpdate(req.body);
    
    const result = await updateSharedNote(shareId, validated);
    // Return structured response for plugin compatibility
    res.json({
      shareId: result.shareId,
      updatedAt: result.updatedAt,
      version: 1 // TODO: Implement proper version tracking
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notes/:shareId - Update document title
router.patch('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = validateShareId(req.params);
    const { title } = validateNoteTitleUpdate(req.body);
    
    const result = await updateSharedNote(shareId, { title });
    // Return structured response for plugin compatibility
    res.json({
      shareId: result.shareId,
      updatedAt: result.updatedAt,
      version: 1 // TODO: Implement proper version tracking
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notes/:shareId - Delete document
router.delete('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = validateShareId(req.params);
    const result = await deleteSharedNote(shareId);
    
    // Notify all connected collaborators about the deletion (locally enabled)
    if (result.notifyCollaborators) {
      try {
        const { websocketService } = await import('../services/websocketService');
        websocketService.notifyNoteDeleted(shareId);
        console.log('📡 WebSocket notification sent for note deletion');
      } catch (wsError) {
        console.warn('⚠️ Failed to notify collaborators via WebSocket:', wsError);
      }
    }
    
    res.status(200).json({
      success: true,
      message: result.message,
      deletedNoteId: result.deletedNoteId,
      title: result.title
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notes - List all shared documents
router.get('/', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    
    const shares = await listSharedNotes(limit, offset);
    
    res.json(shares);
  } catch (error) {
    next(error);
  }
});

export { router as notesRouter };