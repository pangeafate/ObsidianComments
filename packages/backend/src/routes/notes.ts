import { Router } from 'express';
import { 
  createSharedNote, 
  getSharedNote, 
  updateSharedNote, 
  deleteSharedNote, 
  listSharedNotes 
} from '../services/notesService';
import { validateNoteContent, validateShareId } from '../utils/validation';

const router = Router();

// POST /api/notes/share - Create a new shared document
router.post('/share', async (req, res, next) => {
  try {
    const { content } = validateNoteContent(req.body);
    const result = await createSharedNote(content);
    
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

// PUT /api/notes/:shareId - Update or create document with specific ID
router.put('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = validateShareId(req.params);
    const { content } = validateNoteContent(req.body);
    
    // Check if document exists
    try {
      const result = await updateSharedNote(shareId, content);
      res.json(result);
    } catch (error: any) {
      // If document doesn't exist, create it with the specific ID
      if (error.message.includes('not found') || error.message.includes('Not found')) {
        console.log(`Creating new document with ID: ${shareId}`);
        const result = await createSharedNote(content, shareId);
        res.status(201).json(result);
      } else {
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notes/:shareId - Delete document
router.delete('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = validateShareId(req.params);
    await deleteSharedNote(shareId);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/notes - List all shared documents
router.get('/', async (req, res, next) => {
  try {
    const result = await listSharedNotes();
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as notesRouter };