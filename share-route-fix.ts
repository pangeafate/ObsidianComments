import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { NoteModel } from '../db/models/Note';

export const shareRouter = Router();

// Serve HTML page for shared notes (browser frontend)
shareRouter.get('/:shareId', optionalAuth, async (req, res) => {
  const { shareId } = req.params;
  
  try {
    // Fetch the note from database
    const note = await NoteModel.getByShareId(shareId);
    
    if (!note) {
      const notFoundHtml = createNotFoundPage(shareId);
      return res.status(404).send(notFoundHtml);
    }

    const isAuthenticated = !!req.user;
    const userId = req.user?.id;
    const isOwner = userId && note.ownerId === userId;

    // Render HTML page with the note content
    const html = createNotePage(note, req, isAuthenticated, isOwner);
    res.send(html);
    
  } catch (error) {
    console.error('Error serving shared note:', error);
    const errorHtml = createErrorPage();
    res.status(500).send(errorHtml);
  }
});

function createNotFoundPage(shareId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Note Not Found - ObsidianComments</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
           margin: 0; padding: 40px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; 
                padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #d32f2f; }
    .error-code { color: #666; font-size: 14px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Note not found</h1>
    <p>The shared note you're looking for doesn't exist or has been removed.</p>
    <p class="error-code">Error: Resource not found - ${shareId}</p>
  </div>
</body>
</html>`;
}

function createErrorPage(): string {
  return `<!DOCTYPE html>
<html>
<head><title>Error - ObsidianComments</title></head>
<body>
  <h1>Server Error</h1>
  <p>Sorry, there was an error loading this shared note.</p>
</body>
</html>`;
}

function createNotePage(note: any, req: any, isAuthenticated: boolean, isOwner: boolean): string {
  const title = note.content.split('\n')[0].replace(/^#\s*/, '') || 'Shared Note';
  const userInfo = isAuthenticated 
    ? `Viewing as: ${req.user?.name || req.user?.email || 'User'}` 
    : 'Viewing anonymously';
  
  const signInButton = !isAuthenticated 
    ? '<button class="edit-button" onclick="alert(\'Sign in with Google to edit this note\')">Sign In to Edit</button>' 
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ObsidianComments</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; padding: 20px; background: #f8f9fa; line-height: 1.6;
    }
    .container { 
      max-width: 800px; margin: 0 auto; background: white; 
      padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
    }
    .header {
      border-bottom: 1px solid #e9ecef; padding-bottom: 20px; margin-bottom: 30px;
    }
    .auth-info {
      font-size: 14px; color: #6c757d; margin-bottom: 10px;
    }
    .content {
      white-space: pre-wrap; font-size: 16px; line-height: 1.7;
    }
    h1, h2, h3 { color: #212529; }
    .share-info {
      margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;
      font-size: 14px; color: #6c757d;
    }
    .edit-button {
      background: #007bff; color: white; border: none; padding: 8px 16px;
      border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 10px;
    }
    .edit-button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="auth-info">
        ${userInfo}
        ${signInButton}
      </div>
    </div>
    
    <div class="content">${renderMarkdown(note.content)}</div>
    
    <div class="share-info">
      <strong>Share URL:</strong> ${req.protocol}://${req.get('host')}/share/${note.shareId}<br>
      <strong>Created:</strong> ${note.createdAt.toLocaleDateString()}<br>
      <strong>Last updated:</strong> ${note.updatedAt.toLocaleDateString()}<br>
      <strong>Version:</strong> ${note.version}
    </div>
  </div>
</body>
</html>`;
}

// Simple markdown renderer for basic formatting
function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>');
}