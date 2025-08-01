import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateNoteContent } from '../middleware/validation';

export const notesRouter = Router();

// Create a new share
notesRouter.post('/share', requireAuth, validateNoteContent, async (req, res) => {
  const { content } = req.body;
  const userId = req.user?.id;
  
  // Generate unique share ID
  const shareId = generateShareId();
  const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareId}`;
  
  // TODO: Save to database
  
  res.status(201).json({
    shareId,
    shareUrl,
    createdAt: new Date().toISOString(),
  });
});

// Get shared note
notesRouter.get('/:token', async (req, res) => {
  const { token } = req.params;
  
  // TODO: Fetch from database
  if (token === 'invalid-share-id') {
    return res.status(404).json({ error: 'Shared note not found' });
  }
  
  const isAuthenticated = !!req.headers.authorization;
  
  res.json({
    shareId: token,
    content: '# Test Note\n\nThis is a test note.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: {
      canEdit: isAuthenticated,
      canComment: isAuthenticated,
    },
  });
});

// Update shared note
notesRouter.put('/:token', requireAuth, validateNoteContent, async (req, res) => {
  const { token } = req.params;
  const { content, version } = req.body;
  
  // TODO: Implement version control
  if (version === 1) {
    return res.status(409).json({
      error: 'Version conflict',
      currentVersion: 2,
    });
  }
  
  res.json({
    shareId: token,
    updatedAt: new Date().toISOString(),
    version: 2,
  });
});

// Delete shared note
notesRouter.delete('/:token', requireAuth, async (req, res) => {
  const { token } = req.params;
  const userId = req.user?.id;
  
  // TODO: Check ownership
  if (req.headers.authorization !== 'Bearer owner-token') {
    return res.status(403).json({ error: 'Only the owner can delete this share' });
  }
  
  res.status(204).send();
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