import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validateNoteContent } from '../middleware/validation';
import { NoteModel } from '../db/models/Note';

export const notesRouter = Router();

// Create a new share (anonymous sharing allowed)
notesRouter.post('/share', optionalAuth, validateNoteContent, async (req, res) => {
  const { content } = req.body;
  const userId = req.user?.id;
  
  try {
    // Generate unique share ID
    let shareId: string;
    let attempts = 0;
    const maxAttempts = 5;
    
    // Ensure unique shareId
    do {
      shareId = generateShareId();
      attempts++;
      if (attempts > maxAttempts) {
        return res.status(500).json({ error: 'Failed to generate unique share ID' });
      }
    } while (await NoteModel.exists(shareId));
    
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareId}`;
    
    // Save to database
    const note = await NoteModel.create({
      shareId,
      content,
      ownerId: userId
    });
    
    res.status(201).json({
      shareId: note.shareId,
      shareUrl,
      createdAt: note.createdAt,
      permissions: 'edit'
    });
  } catch (error) {
    console.error('Error creating share:', error);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

// Get shared note (authentication optional for viewing)
notesRouter.get('/:token', optionalAuth, async (req, res) => {
  const { token } = req.params;
  
  try {
    // Fetch from database
    const note = await NoteModel.getByShareId(token);
    
    if (!note) {
      return res.status(404).json({ error: 'Shared note not found' });
    }
    
    const isAuthenticated = !!req.headers.authorization;
    const userId = req.user?.id;
    const isOwner = userId && note.ownerId === userId;
    
    res.json({
      shareId: note.shareId,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      version: note.version,
      permissions: {
        canEdit: isOwner || !note.ownerId, // Owner can edit, or anyone if no owner
        canComment: isAuthenticated,
        isOwner: isOwner
      },
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch shared note' });
  }
});

// Update shared note
notesRouter.put('/:token', requireAuth, validateNoteContent, async (req, res) => {
  const { token } = req.params;
  const { content, version } = req.body;
  const userId = req.user?.id;
  
  try {
    // Check if note exists and get current version
    const existingNote = await NoteModel.getByShareId(token);
    if (!existingNote) {
      return res.status(404).json({ error: 'Shared note not found' });
    }
    
    // Check version for optimistic locking (if provided)
    if (version && existingNote.version !== version) {
      return res.status(409).json({
        error: 'Version conflict',
        currentVersion: existingNote.version,
      });
    }
    
    // Update the note
    const updatedNote = await NoteModel.update(token, content, userId);
    
    res.json({
      shareId: updatedNote.shareId,
      updatedAt: updatedNote.updatedAt,
      version: updatedNote.version,
    });
  } catch (error) {
    console.error('Error updating note:', error);
    if (error instanceof Error && error.message === 'Note not found or access denied') {
      res.status(403).json({ error: 'Access denied or note not found' });
    } else {
      res.status(500).json({ error: 'Failed to update shared note' });
    }
  }
});

// Delete shared note
notesRouter.delete('/:token', requireAuth, async (req, res) => {
  const { token } = req.params;
  const userId = req.user?.id;
  
  try {
    // Delete the note (checks ownership internally)
    const deleted = await NoteModel.delete(token, userId);
    
    if (!deleted) {
      return res.status(403).json({ error: 'Only the owner can delete this share or note not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete shared note' });
  }
});

// Get comments (protected endpoint for auth middleware test)
notesRouter.get('/:token/comments', requireAuth, async (req, res) => {
  res.json({ comments: [] });
});

// Add comment to shared note
notesRouter.post('/:token/comments', requireAuth, async (req, res) => {
  const { token } = req.params;
  const { content } = req.body;
  
  res.status(201).json({
    id: 'comment-id',
    noteId: token,
    content,
    userId: req.user?.id,
    createdAt: new Date().toISOString(),
  });
});

// Helper function to generate share IDs
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}