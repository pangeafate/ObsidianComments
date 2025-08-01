import { Request, Response } from 'express';
import { config } from '../config';

// Simple in-memory rate limiter for development
// In production, use redis-based rate limiter
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: Function): void => {
  // Skip rate limiting in test environment
  if (config.env === 'test') {
    return next();
  }

  const key = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  // Get or create request count for this IP
  let requestData = requestCounts.get(key);
  
  if (!requestData || requestData.resetTime < now) {
    requestData = {
      count: 0,
      resetTime: now + windowMs,
    };
    requestCounts.set(key, requestData);
  }

  requestData.count++;

  if (requestData.count > maxRequests) {
    const retryAfter = Math.ceil((requestData.resetTime - now) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());
    
    res.status(429).json({
      error: 'Too many requests',
      retryAfter,
    });
    return;
  }

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - requestData.count).toString());
  res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());

  next();
};

// Clean up old entries periodically
let cleanupInterval: NodeJS.Timeout | null = null;

if (config.env !== 'test') {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
      if (data.resetTime < now) {
        requestCounts.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

// Export cleanup function for tests
export const cleanupRateLimiter = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  requestCounts.clear();
};