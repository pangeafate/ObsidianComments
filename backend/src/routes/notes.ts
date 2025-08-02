import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validateNoteContent } from '../middleware/validation';
import { NoteModel } from '../db/models/Note';

export const notesRouter = Router();

// Create a new share (anyone can create)
notesRouter.post('/share', validateNoteContent, async (req, res) => {
  const { content, contributorName } = req.body;
  
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
      creatorName: contributorName
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

// Get shared note (anyone can view)
notesRouter.get('/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    // Fetch from database
    const note = await NoteModel.getByShareId(token);
    
    if (!note) {
      return res.status(404).json({ error: 'Shared note not found' });
    }
    
    res.json({
      shareId: note.shareId,
      content: note.content,
      creatorName: note.creatorName,
      lastEditor: note.lastEditorName,
      editCount: note.editCount,
      lastChangeSummary: note.lastChangeSummary,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      version: note.version,
      permissions: {
        canEdit: true, // Anyone can edit
        canComment: true, // Anyone can comment
        isOwner: false // No ownership concept
      },
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch shared note' });
  }
});

// Update shared note (anyone can edit)
notesRouter.put('/:token', validateNoteContent, async (req, res) => {
  const { token } = req.params;
  const { content, version, contributorName, changeSummary } = req.body;
  
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
    const updatedNote = await NoteModel.update(token, content, contributorName, changeSummary);
    
    res.json({
      shareId: updatedNote.shareId,
      lastEditor: updatedNote.lastEditorName,
      updatedAt: updatedNote.updatedAt,
      version: updatedNote.version,
    });
  } catch (error) {
    console.error('Error updating note:', error);
    if (error instanceof Error && error.message === 'Note not found') {
      res.status(404).json({ error: 'Note not found' });
    } else {
      res.status(500).json({ error: 'Failed to update shared note' });
    }
  }
});

// Delete shared note (marks as inactive)
notesRouter.delete('/:token', async (req, res) => {
  const { token } = req.params;
  const { contributorName } = req.body || {};
  
  try {
    const success = await NoteModel.delete(token, contributorName);
    
    if (!success) {
      return res.status(404).json({ error: 'Shared note not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete shared note' });
  }
});


// Get version history for a note
notesRouter.get('/:token/versions', async (req, res) => {
  const { token } = req.params;
  
  try {
    const versionHistory = await NoteModel.getVersionHistory(token);
    
    if (!versionHistory) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(versionHistory);
  } catch (error) {
    console.error('Error fetching version history:', error);
    res.status(500).json({ error: 'Failed to fetch version history' });
  }
});

// Get specific version of a note
notesRouter.get('/:token/versions/:versionNumber', async (req, res) => {
  const { token, versionNumber } = req.params;
  
  try {
    // First check if the note exists
    const noteExists = await NoteModel.exists(token);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const version = await NoteModel.getSpecificVersion(token, parseInt(versionNumber, 10));
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    res.json(version);
  } catch (error) {
    console.error('Error fetching specific version:', error);
    res.status(500).json({ error: 'Failed to fetch version' });
  }
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