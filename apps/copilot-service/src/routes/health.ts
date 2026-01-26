import { Router, Request, Response } from 'express';
import { checkPostgresHealth, checkRedisHealth } from '../config/database';
import axios from 'axios';
import { config } from '../config/env';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    service: 'copilot-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      postgres: await checkPostgresHealth() ? 'connected' : 'disconnected',
      redis: await checkRedisHealth() ? 'connected' : 'disconnected',
      llmService: 'unknown' // Will check via HTTP
    }
  };

  // Check LLM Service
  try {
    await axios.get(`${config.llmServiceUrl}/health`, { timeout: 2000 });
    health.dependencies.llmService = 'healthy';
  } catch {
    health.dependencies.llmService = 'unhealthy';
  }

  const allHealthy = Object.values(health.dependencies).every(
    status => status === 'connected' || status === 'healthy'
  );

  res.status(allHealthy ? 200 : 503).json(health);
});

export default router;
