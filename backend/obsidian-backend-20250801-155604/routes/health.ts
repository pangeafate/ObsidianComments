import { Router } from 'express';
import { config } from '../config';

export const healthRouter = Router();

// Health check endpoint
healthRouter.get('/', async (_req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.app.version,
    environment: config.env,
    services: {
      database: {
        status: 'connected', // TODO: Implement actual database check
      },
    },
  };

  res.json(health);
});