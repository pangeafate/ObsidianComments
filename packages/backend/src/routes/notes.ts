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
    const { title, content, metadata } = validateNoteShare(req.body);
    const result = await createSharedNote({ title, content, metadata });
    
    res.status(201).json(result);
  } catch (error) {
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
    const { content } = validateNoteUpdate(req.body);
    
    const result = await updateSharedNote(shareId, { content });
    res.json({ success: true });
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
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notes/:shareId - Delete document
router.delete('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = validateShareId(req.params);
    await deleteSharedNote(shareId);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/notes - List all shared documents
router.get('/', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    
    const result = await listSharedNotes(limit, offset);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as notesRouter };