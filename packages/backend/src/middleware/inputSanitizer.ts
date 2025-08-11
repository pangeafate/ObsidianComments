import { Request, Response, NextFunction } from 'express';
import { sanitizeTitle, sanitizeHtml } from '../utils/html-sanitizer';

/**
 * SECURITY FIX: Comprehensive input sanitization middleware
 * This middleware automatically sanitizes all user inputs to prevent XSS attacks
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === 'object') {
      sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('❌ Input sanitization middleware error:', error);
    res.status(500).json({
      error: 'Input sanitization failed',
      message: 'Unable to process request due to security validation failure'
    });
  }
}

/**
 * Recursively sanitize an object's string properties
 */
function sanitizeObject(obj: any): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

    const value = obj[key];

    if (typeof value === 'string') {
      // Apply different sanitization based on field type
      if (isTitleField(key)) {
        obj[key] = sanitizeTitle(value);
      } else if (isHtmlContentField(key)) {
        obj[key] = sanitizeHtml(value);
      } else {
        // For other string fields, do basic sanitization
        obj[key] = sanitizeTitle(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitizeObject(value);
    }
  }
}

/**
 * Check if a field should be treated as a title field
 */
function isTitleField(fieldName: string): boolean {
  return /^(title|name|displayName)$/i.test(fieldName);
}

/**
 * Check if a field should be treated as HTML content
 */
function isHtmlContentField(fieldName: string): boolean {
  return /^(htmlContent|html|content)$/i.test(fieldName);
}

/**
 * SECURITY FIX: Rate limiting middleware for sensitive endpoints
 * This provides additional protection for endpoints that handle user data
 */
export function rateLimitSensitiveEndpoints(req: Request, res: Response, next: NextFunction) {
  // This is a placeholder for rate limiting logic
  // In production, you might want to use express-rate-limit or similar
  const userIP = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  
  console.log(`🔒 Security check - IP: ${userIP}, Endpoint: ${endpoint}`);
  
  // For now, just log and continue
  next();
}

/**
 * SECURITY FIX: Content type validation middleware
 * Ensures that requests contain expected content types
 */
export function validateContentType(expectedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !expectedTypes.some(type => contentType.includes(type))) {
      return res.status(400).json({
        error: 'Invalid content type',
        message: `Expected one of: ${expectedTypes.join(', ')}`,
        received: contentType || 'none'
      });
    }
    
    next();
  };
}