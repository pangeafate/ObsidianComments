import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const validateNoteContent = (req: Request, res: Response, next: NextFunction): void => {
  const { content } = req.body;
  
  if (!content || content.trim() === '') {
    res.status(400).json({ error: 'Note content cannot be empty' });
    return;
  }
  
  // Check size limit (10MB)
  const sizeInBytes = Buffer.byteLength(content, 'utf8');
  const maxSizeBytes = config.share.maxNoteSizeMB * 1024 * 1024;
  
  if (sizeInBytes > maxSizeBytes) {
    res.status(400).json({ 
      error: `Note size exceeds maximum limit of ${config.share.maxNoteSizeMB}MB` 
    });
    return;
  }
  
  next();
};