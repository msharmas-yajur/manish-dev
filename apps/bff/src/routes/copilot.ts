import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
import { config } from '../config/env';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';
import { createError } from '../middleware/errorHandler';

export const copilotRouter: RouterType = Router();

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
 * @swagger
 * tags:
 *   - name: Copilot
 *     description: CopilotKit AI assistant endpoints
 */

/**
 * @swagger
 * /api/copilot:
 *   post:
 *     summary: Main CopilotKit endpoint
 *     description: |
 *       Primary endpoint that CopilotKit's frontend SDK calls.
 *       Receives chat messages and returns AI responses.
 *       Supports both standard JSON responses and Server-Sent Events (SSE) streaming.
 *     tags: [Copilot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 description: Array of chat messages
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                     content:
 *                       type: string
 *               context:
 *                 type: object
 *                 description: Optional context (patient, codes, etc.)
 *               actions:
 *                 type: array
 *                 description: Available CopilotKit actions
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: AI response (JSON or SSE stream)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                       content:
 *                         type: string
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: SSE stream of AI response chunks
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Copilot service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/copilot/chat:
 *   post:
 *     summary: Chat completions endpoint
 *     description: |
 *       OpenAI-compatible chat completions endpoint with streaming support.
 *       Alternative to the main CopilotKit endpoint for direct chat interactions.
 *     tags: [Copilot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 description: Array of chat messages
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant, system]
 *                     content:
 *                       type: string
 *               stream:
 *                 type: boolean
 *                 description: Enable streaming response
 *                 default: false
 *               model:
 *                 type: string
 *                 description: Model to use for completion
 *               temperature:
 *                 type: number
 *                 description: Sampling temperature (0-2)
 *                 minimum: 0
 *                 maximum: 2
 *               max_tokens:
 *                 type: integer
 *                 description: Maximum tokens in response
 *     responses:
 *       200:
 *         description: Chat completion response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 object:
 *                   type: string
 *                   example: chat.completion
 *                 choices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                       message:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: string
 *                           content:
 *                             type: string
 *                       finish_reason:
 *                         type: string
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: SSE stream of completion chunks
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Copilot service unavailable
 */
copilotRouter.post('/chat', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const { stream } = req.body;

  if (stream) {
    return proxyCopilotStreamingRequest('/copilot/chat', req, res, next);
  }

  return proxyCopilotRequest('/copilot/chat', req, res, next);
});

/**
 * @swagger
 * /api/copilot/actions/{actionName}:
 *   post:
 *     summary: Execute agent action
 *     description: |
 *       Executes specific CopilotKit agent actions:
 *       - searchMedicalCodes: Search ICD-10, CPT, HCPCS codes
 *       - getPatientData: Retrieve patient information
 *       - generateClinicalNote: Generate clinical documentation
 *     tags: [Copilot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actionName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [searchMedicalCodes, getPatientData, generateClinicalNote]
 *         description: Name of the action to execute
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Action-specific parameters
 *             oneOf:
 *               - title: searchMedicalCodes
 *                 type: object
 *                 properties:
 *                   query:
 *                     type: string
 *                     description: Search query for medical codes
 *                   codeType:
 *                     type: string
 *                     enum: [ICD-10, CPT, HCPCS]
 *                   limit:
 *                     type: integer
 *                     default: 10
 *               - title: getPatientData
 *                 type: object
 *                 properties:
 *                   patientId:
 *                     type: string
 *                     format: uuid
 *               - title: generateClinicalNote
 *                 type: object
 *                 properties:
 *                   patientId:
 *                     type: string
 *                     format: uuid
 *                   noteType:
 *                     type: string
 *                     enum: [progress, consultation, discharge]
 *     responses:
 *       200:
 *         description: Action executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Action-specific response data
 *       400:
 *         description: Invalid action name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Copilot service unavailable
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
 * @swagger
 * /api/copilot/context:
 *   get:
 *     summary: Get session context
 *     description: |
 *       Retrieves the current context for the Copilot session,
 *       including active patient, recent codes, user preferences, etc.
 *     tags: [Copilot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current session context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   description: Current session identifier
 *                 activePatient:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                 recentCodes:
 *                   type: array
 *                   description: Recently used medical codes
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type:
 *                         type: string
 *                 preferences:
 *                   type: object
 *                   description: User preferences for AI interactions
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Copilot service unavailable
 */
copilotRouter.get('/context', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  return proxyCopilotRequest('/copilot/context', req, res, next);
});

/**
 * @swagger
 * /api/copilot/session:
 *   post:
 *     summary: Create or update session
 *     description: Creates or updates a Copilot session with preferences and context.
 *     tags: [Copilot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Existing session ID to update (omit to create new)
 *               activePatientId:
 *                 type: string
 *                 format: uuid
 *                 description: Set active patient for context
 *               preferences:
 *                 type: object
 *                 description: User preferences
 *                 properties:
 *                   language:
 *                     type: string
 *                     default: en
 *                   verbosity:
 *                     type: string
 *                     enum: [concise, normal, detailed]
 *                   specialty:
 *                     type: string
 *                     description: Medical specialty context
 *               metadata:
 *                 type: object
 *                 description: Additional session metadata
 *     responses:
 *       200:
 *         description: Session created or updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 created:
 *                   type: boolean
 *                   description: True if new session, false if updated
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Copilot service unavailable
 */
copilotRouter.post('/session', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  return proxyCopilotRequest('/copilot/session', req, res, next);
});

/**
 * @swagger
 * /api/copilot/session:
 *   delete:
 *     summary: Clear session
 *     description: Clears the current Copilot session and conversation history.
 *     tags: [Copilot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Session cleared
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       503:
 *         description: Copilot service unavailable
 */
copilotRouter.delete('/session', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  return proxyCopilotRequest('/copilot/session', req, res, next);
});

/**
 * @swagger
 * /api/copilot/health:
 *   get:
 *     summary: Health check
 *     description: Checks the health status of the Copilot service and its upstream dependencies.
 *     tags: [Copilot]
 *     responses:
 *       200:
 *         description: Copilot service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                   example: healthy
 *                 service:
 *                   type: string
 *                   example: copilot
 *                 upstream:
 *                   type: object
 *                   description: Upstream service health details
 *       503:
 *         description: Copilot service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 service:
 *                   type: string
 *                   example: copilot
 *                 error:
 *                   type: string
 *                   example: Failed to connect to Copilot service
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
