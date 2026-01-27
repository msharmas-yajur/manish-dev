"use strict";
/**
 * CopilotKit Actions Routes
 *
 * Exposes agent actions as HTTP endpoints for CopilotKit integration.
 * All actions require authentication and go through RBAC.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../services/rbac");
const logger_1 = require("../config/logger");
// Import agents
const medicalCodingAgent_1 = require("../agents/medicalCodingAgent");
const patientDataAgent_1 = require("../agents/patientDataAgent");
const router = (0, express_1.Router)();
/**
 * Build action context from authenticated request
 */
async function buildActionContext(req) {
    const user = req.user;
    const permissions = await (0, rbac_1.getUserPermissions)(user.id);
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
function actionHandler(actionFn) {
    return async (req, res, next) => {
        try {
            const authReq = req;
            const context = await buildActionContext(authReq);
            const params = req.body;
            logger_1.logger.info({
                action: actionFn.name,
                userId: context.userId,
                params,
            }, 'Executing copilot action');
            const result = await actionFn(params, context);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                stack: error.stack,
            }, 'Copilot action failed');
            // Determine appropriate status code
            let statusCode = 500;
            if (error.message.includes('Missing required permissions')) {
                statusCode = 403;
            }
            else if (error.message.includes('not found')) {
                statusCode = 404;
            }
            else if (error.message.includes('required') ||
                error.message.includes('Invalid')) {
                statusCode = 400;
            }
            else if (error.message.includes('Access denied')) {
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
router.get('/actions', auth_1.authenticate, (req, res) => {
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
        patientDataAgent_1.getPatientDataAction,
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
router.post('/actions/searchMedicalCodes', auth_1.authenticate, actionHandler(medicalCodingAgent_1.searchMedicalCodes));
/**
 * Get Patient Data Action
 * POST /copilot/actions/getPatientData
 */
router.post('/actions/getPatientData', auth_1.authenticate, actionHandler(patientDataAgent_1.getPatientData));
/**
 * Execute any action by name
 * POST /copilot/execute
 * Body: { action: string, params: object }
 */
router.post('/execute', auth_1.authenticate, async (req, res, next) => {
    try {
        const { action, params } = req.body;
        if (!action) {
            return res.status(400).json({
                success: false,
                error: 'action is required',
            });
        }
        // Map action names to handlers
        const actionHandlers = {
            searchMedicalCodes: medicalCodingAgent_1.searchMedicalCodes,
            getPatientData: patientDataAgent_1.getPatientData,
        };
        const handler = actionHandlers[action];
        if (!handler) {
            return res.status(404).json({
                success: false,
                error: `Unknown action: ${action}`,
            });
        }
        const authReq = req;
        const context = await buildActionContext(authReq);
        logger_1.logger.info({
            action,
            userId: context.userId,
            params,
        }, 'Executing copilot action via /execute');
        const result = await handler(params, context);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error({
            error: error.message,
            stack: error.stack,
        }, 'Copilot execute failed');
        let statusCode = 500;
        if (error.message.includes('Missing required permissions')) {
            statusCode = 403;
        }
        else if (error.message.includes('not found')) {
            statusCode = 404;
        }
        else if (error.message.includes('required') ||
            error.message.includes('Invalid')) {
            statusCode = 400;
        }
        else if (error.message.includes('Access denied')) {
            statusCode = 403;
        }
        res.status(statusCode).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=copilot.js.map