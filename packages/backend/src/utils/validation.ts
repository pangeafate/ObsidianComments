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
  title: Joi.string().optional().allow('').max(255),
  content: Joi.string().required().min(1).max(1000000),
  htmlContent: Joi.string().optional().allow('').max(5000000), // Allow larger HTML content, including empty strings
  metadata: Joi.object().optional()
});

const noteUpdateSchema = Joi.object({
  content: Joi.string().optional().min(1).max(1000000),
  title: Joi.string().optional().min(1).max(255),
  htmlContent: Joi.string().optional().allow('').max(5000000)
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
  title?: string;
  content: string;
  htmlContent?: string;
  metadata?: any;
}

export interface NoteUpdateRequest {
  content?: string;
  title?: string;
  htmlContent?: string;
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
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw new ValidationError(`Validation failed: ${details.map(d => d.message).join(', ')}`);
  }
  
  // At least one field must be provided for update
  if (!value.content && !value.title && !value.htmlContent) {
    throw new ValidationError('At least one field (content, title, or htmlContent) must be provided for update');
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

// Additional validation functions needed by tests
export function validateDocumentData(data: any): { title: string; content: string } {
  const schema = Joi.object({
    title: Joi.string().required().min(1).max(255),
    content: Joi.string().required().min(1)
  });
  
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw new ValidationError(details);
  }
  
  return value;
}

export function validatePublishData(data: any): PublishRequest {
  return validatePublishRequest(data);
}

export function sanitizeInput(input: any): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Basic sanitization - remove potentially harmful characters
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .slice(0, 10000); // Limit length
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}