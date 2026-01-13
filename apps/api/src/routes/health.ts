import { Router } from 'express';

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
