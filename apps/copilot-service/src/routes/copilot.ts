/**
 * CopilotKit Actions Routes
 *
 * Exposes agent actions as HTTP endpoints for CopilotKit integration.
 * All actions require authentication and go through RBAC.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getUserPermissions } from '../services/rbac';
import { logger } from '../config/logger';

// Import agents
import { searchMedicalCodes } from '../agents/medicalCodingAgent';
import { getPatientData, getPatientDataAction } from '../agents/patientDataAgent';

// Import types
import { ActionContext } from '../types/medicalCoding';

const router = Router();

/**
 * Build action context from authenticated request
 */
async function buildActionContext(req: AuthenticatedRequest): Promise<ActionContext> {
  const user = req.user!;
  const permissions = await getUserPermissions(user.id);

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions,
  };
}

/**
 * Generic action handler wrapper
 * Provides consistent error handling and response format
 */
function actionHandler(
  actionFn: (params: any, context: ActionContext) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const context = await buildActionContext(authReq);
      const params = req.body;

      logger.info(
        {
          action: actionFn.name,
          userId: context.userId,
          params,
        },
        'Executing copilot action'
      );

      const result = await actionFn(params, context);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
        },
        'Copilot action failed'
      );

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message.includes('Missing required permissions')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (
        error.message.includes('required') ||
        error.message.includes('Invalid')
      ) {
        statusCode = 400;
      } else if (error.message.includes('Access denied')) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  };
}

/**
 * List available actions
 * GET /copilot/actions
 */
router.get('/actions', authenticate, (req: Request, res: Response) => {
  const actions = [
    {
      name: 'searchMedicalCodes',
      description: 'Search SNOMED medical codes by term',
      parameters: {
        type: 'object',
        properties: {
          searchTerm: {
            type: 'string',
            description: 'The search term to look up medical codes',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default 10, max 50)',
          },
        },
        required: ['searchTerm'],
      },
    },
    getPatientDataAction,
  ];

  res.json({
    success: true,
    data: {
      actions,
      count: actions.length,
    },
  });
});

/**
 * Search Medical Codes Action
 * POST /copilot/actions/searchMedicalCodes
 */
router.post(
  '/actions/searchMedicalCodes',
  authenticate,
  actionHandler(searchMedicalCodes)
);

/**
 * Get Patient Data Action
 * POST /copilot/actions/getPatientData
 */
router.post(
  '/actions/getPatientData',
  authenticate,
  actionHandler(getPatientData)
);

/**
 * Execute any action by name
 * POST /copilot/execute
 * Body: { action: string, params: object }
 */
router.post(
  '/execute',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action, params } = req.body;

      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'action is required',
        });
      }

      // Map action names to handlers
      const actionHandlers: Record<string, (params: any, context: ActionContext) => Promise<any>> = {
        searchMedicalCodes,
        getPatientData,
      };

      const handler = actionHandlers[action];

      if (!handler) {
        return res.status(404).json({
          success: false,
          error: `Unknown action: ${action}`,
        });
      }

      const authReq = req as AuthenticatedRequest;
      const context = await buildActionContext(authReq);

      logger.info(
        {
          action,
          userId: context.userId,
          params,
        },
        'Executing copilot action via /execute'
      );

      const result = await handler(params, context);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
        },
        'Copilot execute failed'
      );

      let statusCode = 500;
      if (error.message.includes('Missing required permissions')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (
        error.message.includes('required') ||
        error.message.includes('Invalid')
      ) {
        statusCode = 400;
      } else if (error.message.includes('Access denied')) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
