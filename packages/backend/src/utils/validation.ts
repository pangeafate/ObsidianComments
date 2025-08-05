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

const noteShareSchema = Joi.object({
  title: Joi.string().required().min(1).max(255),
  content: Joi.string().required().min(1).max(1000000),
  metadata: Joi.object().optional()
});

const noteUpdateSchema = Joi.object({
  content: Joi.string().required().min(1).max(1000000)
});

const noteTitleUpdateSchema = Joi.object({
  title: Joi.string().required().min(1).max(255)
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

export interface NoteShareRequest {
  title: string;
  content: string;
  metadata?: any;
}

export interface NoteUpdateRequest {
  content: string;
}

export interface NoteTitleUpdateRequest {
  title: string;
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

export function validateNoteShare(data: any): NoteShareRequest {
  const { error, value } = noteShareSchema.validate(data, { abortEarly: false });
  
  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw new ValidationError(`Validation failed: ${details.map(d => d.message).join(', ')}`);
  }
  
  return value;
}

export function validateNoteUpdate(data: any): NoteUpdateRequest {
  const { error, value } = noteUpdateSchema.validate(data, { abortEarly: false });
  
  if (error) {
    throw new ValidationError('Content is required and must be non-empty');
  }
  
  return value;
}

export function validateNoteTitleUpdate(data: any): NoteTitleUpdateRequest {
  const { error, value } = noteTitleUpdateSchema.validate(data, { abortEarly: false });
  
  if (error) {
    throw new ValidationError('Title is required and must be non-empty');
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