import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const router = Router();
const prisma = new PrismaClient();

// Initialize Redis client
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redis.connect().catch(console.error);

async function checkHocuspocusHealth(): Promise<boolean> {
  try {
    // Simple check to see if Hocuspocus is responding
    const http = require('http');
    
    return new Promise((resolve) => {
      const req = http.get('http://hocuspocus:8082/', { timeout: 5000 }, (res: any) => {
        resolve(res.statusCode < 500);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  } catch (error) {
    return false;
  }
}

// Basic health check
router.get('/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    await redis.ping();
    
    // Check Hocuspocus connection
    const hocuspocusHealth = await checkHocuspocusHealth();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        hocuspocus: hocuspocusHealth ? 'connected' : 'error'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  const checks: any = {
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    hocuspocus: { status: 'unknown' },
    documents: { status: 'unknown' }
  };
  
  // Database check
  try {
    const count = await prisma.document.count();
    checks.database = { status: 'ok', documentCount: count };
  } catch (error) {
    checks.database = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  // Redis check
  try {
    const pong = await redis.ping();
    checks.redis = { status: 'ok', response: pong };
  } catch (error) {
    checks.redis = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  // Hocuspocus check
  try {
    const hocuspocusHealth = await checkHocuspocusHealth();
    checks.hocuspocus = { 
      status: hocuspocusHealth ? 'ok' : 'error',
      message: hocuspocusHealth ? 'Responding' : 'Not responding'
    };
  } catch (error) {
    checks.hocuspocus = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  // Document accessibility check
  try {
    const testDoc = await prisma.document.findFirst();
    if (testDoc) {
      checks.documents = { status: 'ok', sampleId: testDoc.id };
    } else {
      checks.documents = { status: 'warning', message: 'No documents found' };
    }
  } catch (error) {
    checks.documents = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
  
  res.json(checks);
});

export { router as healthRouter };