import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { checkPostgresHealth, checkRedisHealth } from '../config/database';
import { config } from '../config/env';

export const healthRouter: RouterType = Router();

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Health check and monitoring endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Overall health check
 *     description: |
 *       Returns the overall health status of the BFF service including all dependencies.
 *       Used for monitoring dashboards and alerting systems.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: bff
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 environment:
 *                   type: string
 *                   enum: [development, staging, production]
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     postgres:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     redis:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *       503:
 *         description: Service is unhealthy (one or more dependencies failed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     postgres:
 *                       type: string
 *                     redis:
 *                       type: string
 */
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

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: |
 *       Kubernetes readiness probe endpoint.
 *       Returns 200 only when the service is ready to accept traffic
 *       (all dependencies are healthy).
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: true
 *       503:
 *         description: Service is not ready (dependencies unavailable)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: false
 */
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

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: |
 *       Kubernetes liveness probe endpoint.
 *       Returns 200 if the service process is running.
 *       Does not check dependencies - only confirms the service is alive.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                   example: true
 */
healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});
