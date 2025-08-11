import { Router } from 'express';
import { getFeatureFlags } from '../utils/featureFlags';

const router = Router();

// Get feature flags for current user
router.get('/feature-flags', (req, res) => {
  try {
    const featureFlags = getFeatureFlags();
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    
    const flags = featureFlags.getFlagsForUser(userId);
    
    res.json({
      flags,
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve feature flags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin endpoint to update feature flags (require authentication in production)
router.post('/feature-flags/:feature', async (req, res) => {
  try {
    // In production, add authentication check here
    if (process.env.NODE_ENV === 'production' && !req.headers['x-admin-token']) {
      return res.status(401).json({ error: 'Admin token required' });
    }
    
    const { feature } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    
    const featureFlags = getFeatureFlags();
    await featureFlags.updateFlag(feature as any, enabled);
    
    res.json({
      success: true,
      feature,
      enabled,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update feature flag',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all flags (admin endpoint)
router.get('/feature-flags/admin/all', (req, res) => {
  try {
    // In production, add authentication check here
    if (process.env.NODE_ENV === 'production' && !req.headers['x-admin-token']) {
      return res.status(401).json({ error: 'Admin token required' });
    }
    
    const featureFlags = getFeatureFlags();
    const allFlags = featureFlags.getAllFlags();
    
    res.json({
      flags: allFlags,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve all feature flags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as featureFlagsRouter };