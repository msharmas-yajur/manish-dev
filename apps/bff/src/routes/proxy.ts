import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { createError } from '../middleware/errorHandler';

export const proxyRouter = Router();

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

// Backend API routes (protected)
proxyRouter.all('/backend/*', authenticate, (req, res, next) => {
  const path = req.path.replace('/backend', '');
  const targetUrl = config.backendUrl + '/api' + path;
  proxyRequest(targetUrl, req, res, next);
});

// LLM Service routes (protected)
proxyRouter.all('/llm/*', authenticate, (req, res, next) => {
  const path = req.path.replace('/llm', '');
  const targetUrl = config.llmServiceUrl + path;
  proxyRequest(targetUrl, req, res, next);
});

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
