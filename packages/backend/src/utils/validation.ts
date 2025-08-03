import Joi from 'joi';
import { ValidationError } from './errors';

const publishSchema = Joi.object({
  title: Joi.string().required().min(1).max(255),
  content: Joi.string().required().min(1),
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string()),
    source: Joi.string(),
    publishedBy: Joi.string()
  }).optional()
});

const noteContentSchema = Joi.object({
  content: Joi.string().required().min(1).max(1000000) // 1MB limit for content
});

const shareIdSchema = Joi.object({
  shareId: Joi.string().required().min(1).max(50).pattern(/^[a-zA-Z0-9_-]+$/)
});

export interface PublishRequest {
  title: string;
  content: string;
  metadata?: {
    tags?: string[];
    source?: string;
    publishedBy?: string;
  };
}

export interface NoteContentRequest {
  content: string;
}

export interface ShareIdRequest {
  shareId: string;
}

export function validatePublishRequest(data: any): PublishRequest {
  const { error, value } = publishSchema.validate(data, { abortEarly: false });
  
  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw new ValidationError(details);
  }
  
  return value;
}

export function validateNoteContent(data: any): NoteContentRequest {
  const { error, value } = noteContentSchema.validate(data, { abortEarly: false });
  
  if (error) {
    throw new ValidationError('Content is required');
  }
  
  return value;
}

export function validateShareId(data: any): ShareIdRequest {
  const { error, value } = shareIdSchema.validate(data, { abortEarly: false });
  
  if (error) {
    throw new ValidationError('Invalid share ID format');
  }
  
  return value;
}