import { Router } from 'express';
import { CommentModel } from '../db/models/Comment';
import { NoteModel } from '../db/models/Note';

export const commentsRouter = Router();

// Get all comments for a note
commentsRouter.get('/:shareId/comments', async (req, res) => {
  const { shareId } = req.params;
  
  try {
    // First verify the note exists
    const noteExists = await NoteModel.exists(shareId);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const comments = await CommentModel.getByShareId(shareId);
    
    res.json({
      shareId,
      totalComments: comments.length,
      comments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create a new comment
commentsRouter.post('/:shareId/comments', async (req, res) => {
  const { shareId } = req.params;
  const { 
    content, 
    contributorName, 
    positionStart, 
    positionEnd, 
    versionNumber,
    parentCommentId 
  } = req.body;
  
  // Validation
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  
  if (!contributorName || contributorName.trim().length === 0) {
    return res.status(400).json({ error: 'Contributor name is required' });
  }
  
  if (positionStart === undefined || positionEnd === undefined) {
    return res.status(400).json({ error: 'Position start and end are required' });
  }
  
  if (positionStart < 0 || positionEnd < positionStart) {
    return res.status(400).json({ error: 'Invalid position range' });
  }
  
  try {
    // Verify the note exists
    const noteExists = await NoteModel.exists(shareId);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Get current version if not provided
    let currentVersion = versionNumber;
    if (!currentVersion) {
      const note = await NoteModel.getByShareId(shareId);
      currentVersion = note?.version || 1;
    }

    const comment = await CommentModel.create({
      shareId,
      contributorName: contributorName.trim(),
      content: content.trim(),
      positionStart,
      positionEnd,
      versionNumber: currentVersion,
      parentCommentId
    });
    
    // Get contributor color for response
    const contributorColor = await CommentModel.getContributorColor(contributorName.trim());
    
    res.status(201).json({
      ...comment,
      contributorColor: contributorColor.colorHex
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a comment
commentsRouter.put('/:shareId/comments/:commentId', async (req, res) => {
  const { shareId, commentId } = req.params;
  const { content, contributorName } = req.body;
  
  // Validation
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  
  if (!contributorName || contributorName.trim().length === 0) {
    return res.status(400).json({ error: 'Contributor name is required' });
  }
  
  try {
    // Verify the note exists
    const noteExists = await NoteModel.exists(shareId);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updatedComment = await CommentModel.update(
      parseInt(commentId, 10), 
      content.trim(), 
      contributorName.trim()
    );
    
    if (!updatedComment) {
      return res.status(404).json({ error: 'Comment not found or you are not authorized to edit it' });
    }
    
    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Resolve a comment
commentsRouter.post('/:shareId/comments/:commentId/resolve', async (req, res) => {
  const { shareId, commentId } = req.params;
  const { contributorName } = req.body;
  
  if (!contributorName || contributorName.trim().length === 0) {
    return res.status(400).json({ error: 'Contributor name is required' });
  }
  
  try {
    // Verify the note exists
    const noteExists = await NoteModel.exists(shareId);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const success = await CommentModel.resolve(
      parseInt(commentId, 10), 
      contributorName.trim()
    );
    
    if (!success) {
      return res.status(404).json({ error: 'Comment not found or you are not authorized to resolve it' });
    }
    
    res.json({ success: true, message: 'Comment resolved' });
  } catch (error) {
    console.error('Error resolving comment:', error);
    res.status(500).json({ error: 'Failed to resolve comment' });
  }
});

// Delete a comment
commentsRouter.delete('/:shareId/comments/:commentId', async (req, res) => {
  const { shareId, commentId } = req.params;
  const { contributorName } = req.body || {};
  
  if (!contributorName || contributorName.trim().length === 0) {
    return res.status(400).json({ error: 'Contributor name is required' });
  }
  
  try {
    // Verify the note exists
    const noteExists = await NoteModel.exists(shareId);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const success = await CommentModel.delete(
      parseInt(commentId, 10), 
      contributorName.trim()
    );
    
    if (!success) {
      return res.status(404).json({ error: 'Comment not found or you are not authorized to delete it' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Get comments by position range (useful for highlighting comments in editor)
commentsRouter.get('/:shareId/comments/range/:startPos/:endPos', async (req, res) => {
  const { shareId, startPos, endPos } = req.params;
  
  try {
    // Verify the note exists
    const noteExists = await NoteModel.exists(shareId);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const comments = await CommentModel.getByPositionRange(
      shareId, 
      parseInt(startPos, 10), 
      parseInt(endPos, 10)
    );
    
    res.json({
      shareId,
      positionRange: { start: parseInt(startPos, 10), end: parseInt(endPos, 10) },
      comments
    });
  } catch (error) {
    console.error('Error fetching comments by range:', error);
    res.status(500).json({ error: 'Failed to fetch comments by range' });
  }
});

// Get contributor colors for a note
commentsRouter.get('/:shareId/contributors/colors', async (req, res) => {
  const { shareId } = req.params;
  
  try {
    // Verify the note exists
    const noteExists = await NoteModel.exists(shareId);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const colors = await CommentModel.getShareContributorColors(shareId);
    
    res.json({
      shareId,
      contributors: colors
    });
  } catch (error) {
    console.error('Error fetching contributor colors:', error);
    res.status(500).json({ error: 'Failed to fetch contributor colors' });
  }
});

// Get or create contributor color for a specific contributor
commentsRouter.get('/:shareId/contributors/:contributorName/color', async (req, res) => {
  const { shareId, contributorName } = req.params;
  
  try {
    // Verify the note exists
    const noteExists = await NoteModel.exists(shareId);
    if (!noteExists) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const color = await CommentModel.getContributorColor(contributorName);
    
    res.json(color);
  } catch (error) {
    console.error('Error fetching contributor color:', error);
    res.status(500).json({ error: 'Failed to fetch contributor color' });
  }
});