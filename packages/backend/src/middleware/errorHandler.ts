import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details
    });
  }

  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error'
  });
}