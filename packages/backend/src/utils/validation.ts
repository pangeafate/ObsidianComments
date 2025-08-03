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

export interface PublishRequest {
  title: string;
  content: string;
  metadata?: {
    tags?: string[];
    source?: string;
    publishedBy?: string;
  };
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