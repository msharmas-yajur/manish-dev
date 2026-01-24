import { Router, Request, Response } from 'express';
import { checkPostgresHealth, checkRedisHealth } from '../config/database';
import { config } from '../config/env';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const [postgresHealthy, redisHealthy] = await Promise.all([
    checkPostgresHealth(),
    checkRedisHealth(),
  ]);

  const isHealthy = postgresHealthy && redisHealthy;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'bff',
    version: '1.0.0',
    environment: config.nodeEnv,
    dependencies: {
      postgres: postgresHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy ? 'healthy' : 'unhealthy',
    },
  });
});

healthRouter.get('/ready', async (req: Request, res: Response) => {
  const [postgresHealthy, redisHealthy] = await Promise.all([
    checkPostgresHealth(),
    checkRedisHealth(),
  ]);

  if (postgresHealthy && redisHealthy) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});
