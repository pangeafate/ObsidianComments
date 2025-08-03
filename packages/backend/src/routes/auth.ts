import { Router } from 'express';

const router = Router();

// GET /api/auth/test - Test connection and auth
router.get('/test', async (req, res, next) => {
  try {
    // For now, we'll return a simple success response
    // Later we can add proper authentication
    res.json({
      valid: true,
      user: {
        id: 'anonymous',
        email: 'anonymous@obsidiancomments.lakestrom.com'
      },
      limits: {
        maxShares: 1000,
        currentShares: 0 // We'll calculate this dynamically later
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };