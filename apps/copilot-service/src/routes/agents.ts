import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { searchMedicalCodes } from '../agents/medicalCodingAgent';
import { ActionContext } from '../types/medicalCoding';
import { getUserPermissions } from '../services/rbac';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/agents/search-medical-codes
 * Search for SNOMED CT medical codes
 *
 * Required permissions: llm:use, records:read
 *
 * Request body:
 * {
 *   "searchTerm": "diabetes",
 *   "limit": 10
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "codes": [...],
 *     "total": 42,
 *     "searchTerm": "diabetes"
 *   }
 * }
 */
router.post(
  '/search-medical-codes',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Validate authenticated user exists
      if (!authReq.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
          },
        });
      }

      const { searchTerm, limit } = req.body;

      // Validate required fields
      if (!searchTerm || typeof searchTerm !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'searchTerm is required and must be a string',
            code: 'INVALID_PARAMS',
          },
        });
      }

      // Fetch user permissions from RBAC service
      const permissions = await getUserPermissions(authReq.user.id);

      // Build action context from authenticated user
      const context: ActionContext = {
        userId: authReq.user.id,
        email: authReq.user.email,
        role: authReq.user.role,
        permissions,
      };

      logger.info(
        { userId: context.userId, searchTerm, limit },
        'Executing searchMedicalCodes action'
      );

      // Execute agent action
      const result = await searchMedicalCodes(
        { searchTerm, limit: limit || 10 },
        context
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'searchMedicalCodes failed');

      // Handle permission errors
      if (error.message.includes('Missing required permissions')) {
        return res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'PERMISSION_DENIED',
          },
        });
      }

      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'INVALID_PARAMS',
          },
        });
      }

      // Generic server error
      next(error);
    }
  }
);

/**
 * GET /api/agents/actions
 * List all available agent actions with their metadata
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "actions": [
 *       {
 *         "name": "searchMedicalCodes",
 *         "description": "Search for SNOMED CT medical codes",
 *         "requiredPermissions": ["llm:use", "records:read"],
 *         "parameters": {...}
 *       }
 *     ]
 *   }
 * }
 */
router.get(
  '/actions',
  authenticate,
  async (req: Request, res: Response) => {
    const actions = [
      {
        name: 'searchMedicalCodes',
        description: 'Search for SNOMED CT medical codes using Snowstorm',
        requiredPermissions: ['llm:use', 'records:read'],
        parameters: {
          searchTerm: {
            type: 'string',
            required: true,
            description: 'The clinical term to search for',
          },
          limit: {
            type: 'number',
            required: false,
            default: 10,
            max: 50,
            description: 'Maximum number of results to return',
          },
        },
        responseType: 'MedicalCodeSearchResult',
      },
      // Future actions will be added here
      // getPatientData, generateClinicalNote, etc.
    ];

    res.status(200).json({
      success: true,
      data: { actions },
    });
  }
);

export default router;
