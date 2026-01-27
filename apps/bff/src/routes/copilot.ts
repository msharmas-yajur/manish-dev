import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { createError } from '../middleware/errorHandler';

export const copilotRouter = Router();

/**
 * Copilot Service Proxy Configuration
 *
 * This router handles all communication between the frontend and the
 * CopilotKit-powered AI service. It provides:
 * - JWT authentication validation
 * - Request forwarding with user context
 * - Streaming response support for real-time AI responses
 * - Error handling and logging
 */

/**
 * Helper function to proxy standard HTTP requests to Copilot Service
 */
async function proxyCopilotRequest(
  targetPath: string,
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const url = new URL(targetPath, config.copilotServiceUrl);

    // Forward query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      url.search = new URLSearchParams(req.query as Record<string, string>).toString();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Forward authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // Add user context from authenticated request
    const authReq = req as AuthenticatedRequest;
    if (authReq.user) {
      headers['X-User-Id'] = authReq.user.id;
      headers['X-User-Email'] = authReq.user.email;
      headers['X-User-Role'] = authReq.user.role;
    }

    // Forward correlation ID for tracing
    const correlationId = req.headers['x-correlation-id'] || `copilot-${Date.now()}`;
    headers['X-Correlation-Id'] = correlationId as string;

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    // Include body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    logger.debug(
      { url: url.toString(), method: req.method, correlationId },
      'Proxying request to Copilot Service'
    );

    const response = await fetch(url.toString(), fetchOptions);
    const contentType = response.headers.get('content-type');

    // Handle different response types
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else if (contentType?.includes('text/event-stream')) {
      // Handle Server-Sent Events for streaming responses
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const body = response.body;
      if (body) {
        const reader = body.getReader();
        const decoder = new TextDecoder();

        const streamData = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              res.write(chunk);
            }
            res.end();
          } catch (streamError) {
            logger.error({ err: streamError }, 'Stream error in Copilot proxy');
            res.end();
          }
        };

        streamData();
      } else {
        res.end();
      }
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (err) {
    logger.error({ err, targetPath }, 'Copilot proxy request failed');
    next(createError('Copilot service unavailable', 503));
  }
}

/**
 * Helper function to proxy streaming requests (WebSocket-like behavior over HTTP)
 */
async function proxyCopilotStreamingRequest(
  targetPath: string,
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const url = new URL(targetPath, config.copilotServiceUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    // Forward authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // Add user context
    const authReq = req as AuthenticatedRequest;
    if (authReq.user) {
      headers['X-User-Id'] = authReq.user.id;
      headers['X-User-Email'] = authReq.user.email;
      headers['X-User-Role'] = authReq.user.role;
    }

    const correlationId = req.headers['x-correlation-id'] || `copilot-stream-${Date.now()}`;
    headers['X-Correlation-Id'] = correlationId as string;

    logger.debug(
      { url: url.toString(), correlationId },
      'Starting streaming request to Copilot Service'
    );

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Copilot stream error');
      return next(createError(`Copilot service error: ${response.status}`, response.status));
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const body = response.body;
    if (!body) {
      res.end();
      return;
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();

    // Stream the response
    const streamResponse = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            logger.debug({ correlationId }, 'Copilot stream completed');
            res.write('data: [DONE]\n\n');
            res.end();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);

          // Flush the response to ensure real-time streaming
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        }
      } catch (streamError) {
        logger.error({ err: streamError, correlationId }, 'Error during Copilot stream');
        res.write(`data: {"error": "Stream interrupted"}\n\n`);
        res.end();
      }
    };

    // Handle client disconnect
    req.on('close', () => {
      logger.debug({ correlationId }, 'Client disconnected from Copilot stream');
      reader.cancel();
    });

    streamResponse();
  } catch (err) {
    logger.error({ err }, 'Failed to establish Copilot streaming connection');
    next(createError('Copilot service unavailable', 503));
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * Main CopilotKit endpoint
 * POST /api/copilot
 *
 * This is the primary endpoint that CopilotKit's frontend SDK calls.
 * It receives chat messages and returns AI responses.
 */
copilotRouter.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const acceptHeader = req.headers.accept || '';

  // Check if client wants streaming response
  if (acceptHeader.includes('text/event-stream')) {
    return proxyCopilotStreamingRequest('/copilot', req, res, next);
  }

  // Standard JSON request/response
  return proxyCopilotRequest('/copilot', req, res, next);
});

/**
 * Chat completions endpoint (OpenAI-compatible)
 * POST /api/copilot/chat
 *
 * Alternative endpoint for chat completions with streaming support.
 */
copilotRouter.post('/chat', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { stream } = req.body;

  if (stream) {
    return proxyCopilotStreamingRequest('/copilot/chat', req, res, next);
  }

  return proxyCopilotRequest('/copilot/chat', req, res, next);
});

/**
 * Agent actions endpoint
 * POST /api/copilot/actions/:actionName
 *
 * Executes specific CopilotKit agent actions:
 * - searchMedicalCodes: Search ICD-10, CPT, HCPCS codes
 * - getPatientData: Retrieve patient information
 * - generateClinicalNote: Generate clinical documentation
 */
copilotRouter.post(
  '/actions/:actionName',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const { actionName } = req.params;

    // Validate action name
    const validActions = ['searchMedicalCodes', 'getPatientData', 'generateClinicalNote'];
    if (!validActions.includes(actionName)) {
      return next(createError(`Invalid action: ${actionName}`, 400));
    }

    logger.info(
      { actionName, userId: (req as AuthenticatedRequest).user?.id },
      'Executing Copilot action'
    );

    return proxyCopilotRequest(`/copilot/actions/${actionName}`, req, res, next);
  }
);

/**
 * Context endpoint
 * GET /api/copilot/context
 *
 * Retrieves the current context for the Copilot session,
 * including active patient, recent codes, etc.
 */
copilotRouter.get('/context', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  return proxyCopilotRequest('/copilot/context', req, res, next);
});

/**
 * Session management endpoint
 * POST /api/copilot/session
 *
 * Creates or updates a Copilot session with preferences and context.
 */
copilotRouter.post('/session', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  return proxyCopilotRequest('/copilot/session', req, res, next);
});

/**
 * Clear session endpoint
 * DELETE /api/copilot/session
 *
 * Clears the current Copilot session and conversation history.
 */
copilotRouter.delete('/session', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  return proxyCopilotRequest('/copilot/session', req, res, next);
});

/**
 * Health check endpoint
 * GET /api/copilot/health
 *
 * Checks the health status of the Copilot service.
 */
copilotRouter.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await fetch(`${config.copilotServiceUrl}/health`);

    if (response.ok) {
      const data = await response.json();
      res.json({
        status: 'healthy',
        service: 'copilot',
        upstream: data,
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        service: 'copilot',
        error: 'Upstream service unavailable',
      });
    }
  } catch (err) {
    logger.error({ err }, 'Copilot health check failed');
    res.status(503).json({
      status: 'unhealthy',
      service: 'copilot',
      error: 'Failed to connect to Copilot service',
    });
  }
});

export default copilotRouter;
