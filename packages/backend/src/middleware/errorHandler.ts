import { Request, Response, NextFunction } from 'express';
import { ValidationError, NotFoundError } from '../utils/errors';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: error.message,
      code: 'VALIDATION_ERROR',
      details: error.details
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: error.message,
      code: 'NOT_FOUND'
    });
  }

  // Handle payload too large error from express
  if (error.name === 'PayloadTooLargeError' || (error as any).type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Content too large',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  console.error('❌ [DEBUG] Unhandled error occurred:', error);
  console.error('❌ [DEBUG] Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: (error as any).code,
    errno: (error as any).errno,
    syscall: (error as any).syscall
  });
  console.error('❌ [DEBUG] Request details:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}