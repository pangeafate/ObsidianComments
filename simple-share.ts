import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { NoteModel } from '../db/models/Note';

export const shareRouter = Router();

shareRouter.get('/:shareId', optionalAuth, async (req, res) => {
  const { shareId } = req.params;
  
  try {
    const note = await NoteModel.getByShareId(shareId);
    
    if (!note) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Note Not Found</title></head>
        <body>
          <h1>Note not found</h1>
          <p>The shared note ${shareId} doesn't exist or has been removed.</p>
        </body>
        </html>
      `);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shared Note - ObsidianComments</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          .content { white-space: pre-wrap; line-height: 1.6; }
          .info { border-top: 1px solid #ccc; margin-top: 40px; padding-top: 20px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="content">${note.content}</div>
        <div class="info">
          <p>Share ID: ${shareId}</p>
          <p>Created: ${note.createdAt}</p>
        </div>
      </body>
      </html>
    `;

    res.send(html);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('<h1>Server Error</h1>');
  }
});