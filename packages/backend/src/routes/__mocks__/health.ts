import { Router } from 'express';

const router = Router();

// Add security headers middleware for testing
router.use((req, res, next) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('x-xss-protection', '1; mode=block');
  next();
});

// Mock health endpoints for unit testing
router.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      hocuspocus: 'connected'
    }
  });
});

router.get('/health/detailed', async (req, res) => {
  res.json({
    database: { 
      status: 'ok',
      documentCount: 5
    },
    redis: { 
      status: 'ok',
      response: 'PONG'
    },
    hocuspocus: {
      status: 'ok',
      message: 'Responding'
    },
    documents: {
      status: 'ok',
      sampleId: 'test-doc-123'
    }
  });
});

export { router as healthRouter };