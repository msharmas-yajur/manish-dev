import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
import { config } from '../config/env';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { createError } from '../middleware/errorHandler';

export const proxyRouter: RouterType = Router();

/**
 * @swagger
 * tags:
 *   - name: Proxy
 *     description: Proxy routes to backend services
 */

// Helper function to proxy requests
async function proxyRequest(
  targetUrl: string,
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const url = new URL(targetUrl);
    url.search = new URLSearchParams(req.query as Record<string, string>).toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward auth header if present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // Forward user info from authenticated request
    const authReq = req as AuthenticatedRequest;
    if (authReq.user) {
      headers['X-User-Id'] = authReq.user.id;
      headers['X-User-Email'] = authReq.user.email;
      headers['X-User-Role'] = authReq.user.role;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    logger.debug({ url: url.toString(), method: req.method }, 'Proxying request');

    const response = await fetch(url.toString(), fetchOptions);
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (err) {
    logger.error({ err, targetUrl }, 'Proxy request failed');
    next(createError('Service unavailable', 503));
  }
}

/**
 * @swagger
 * /api/proxy/backend/{path}:
 *   get:
 *     summary: Proxy GET request to Backend service
 *     description: |
 *       Proxies requests to the Python Backend API service.
 *       All requests are authenticated and user context is forwarded.
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Backend API path (e.g., patients, codes/search)
 *     responses:
 *       200:
 *         description: Proxied response from Backend service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Backend service unavailable
 *   post:
 *     summary: Proxy POST request to Backend service
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Proxied response from Backend service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Backend service unavailable
 *   put:
 *     summary: Proxy PUT request to Backend service
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Proxied response from Backend service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Backend service unavailable
 *   patch:
 *     summary: Proxy PATCH request to Backend service
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Proxied response from Backend service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Backend service unavailable
 *   delete:
 *     summary: Proxy DELETE request to Backend service
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proxied response from Backend service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Backend service unavailable
 */
// Backend API routes (protected)
proxyRouter.all('/backend/*', authenticate, (req, res, next) => {
  const path = req.path.replace('/backend', '');
  const targetUrl = config.backendUrl + '/api' + path;
  proxyRequest(targetUrl, req, res, next);
});

/**
 * @swagger
 * /api/proxy/llm/{path}:
 *   get:
 *     summary: Proxy GET request to LLM Service
 *     description: |
 *       Proxies requests to the LLM Service for AI model interactions.
 *       Supports multiple LLM providers (Ollama, OpenAI, Anthropic).
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: LLM service path (e.g., models, chat/completions)
 *     responses:
 *       200:
 *         description: Proxied response from LLM Service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: LLM service unavailable
 *   post:
 *     summary: Proxy POST request to LLM Service
 *     description: |
 *       Proxies POST requests to the LLM Service.
 *       Commonly used for chat completions and embeddings.
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *                 description: Model name or ID
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *               stream:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Proxied response from LLM Service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: LLM service unavailable
 *   put:
 *     summary: Proxy PUT request to LLM Service
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Proxied response from LLM Service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: LLM service unavailable
 *   patch:
 *     summary: Proxy PATCH request to LLM Service
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Proxied response from LLM Service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: LLM service unavailable
 *   delete:
 *     summary: Proxy DELETE request to LLM Service
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proxied response from LLM Service
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: LLM service unavailable
 */
// LLM Service routes (protected)
proxyRouter.all('/llm/*', authenticate, (req, res, next) => {
  const path = req.path.replace('/llm', '');
  const targetUrl = config.llmServiceUrl + path;
  proxyRequest(targetUrl, req, res, next);
});

/**
 * @swagger
 * /api/proxy/public/health:
 *   get:
 *     summary: Check backend services health
 *     description: |
 *       Public endpoint to check the health of proxied backend services.
 *       Does not require authentication. Returns aggregated health status
 *       of Backend API and LLM Service.
 *     tags: [Proxy]
 *     responses:
 *       200:
 *         description: Backend services health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backend:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                   description: Python Backend API health status
 *                 llmService:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                   description: LLM Service health status
 *             example:
 *               backend: healthy
 *               llmService: healthy
 */
// Public backend routes (e.g., for health checks)
proxyRouter.get('/public/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [backendRes, llmRes] = await Promise.allSettled([
      fetch(`${config.backendUrl}/health`),
      fetch(`${config.llmServiceUrl}/health`),
    ]);

    res.json({
      backend: backendRes.status === 'fulfilled' && backendRes.value.ok ? 'healthy' : 'unhealthy',
      llmService: llmRes.status === 'fulfilled' && llmRes.value.ok ? 'healthy' : 'unhealthy',
    });
  } catch (err) {
    next(err);
  }
});
