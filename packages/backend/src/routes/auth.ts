import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/auth/test - Test connection and auth
router.get('/test', async (req, res, next) => {
  try {
    // Get current document count for limits
    const currentShares = await prisma.document.count();
    
    // For now, we'll return a simple success response for plugin compatibility
    // Later we can add proper authentication
    res.json({
      valid: true,
      user: {
        id: 'anonymous',
        email: 'anonymous@obsidiancomments.serverado.app'
      },
      limits: {
        maxShares: 1000,
        currentShares
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };