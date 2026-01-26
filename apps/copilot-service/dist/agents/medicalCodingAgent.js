"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMedicalCodes = searchMedicalCodes;
const rbac_1 = require("../services/rbac");
const snowstorm_1 = require("../services/snowstorm");
const audit_1 = require("../services/audit");
const logger_1 = require("../config/logger");
const REQUIRED_PERMISSIONS = ['llm:use', 'records:read'];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
async function searchMedicalCodes(params, context) {
    const startTime = Date.now();
    try {
        // 1. Validate parameters
        if (!params.searchTerm || params.searchTerm.trim().length === 0) {
            throw new Error('searchTerm is required');
        }
        const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
        // 2. Check permissions
        logger_1.logger.debug({ userId: context.userId, permissions: REQUIRED_PERMISSIONS }, 'Checking permissions');
        const hasPermissions = await (0, rbac_1.hasAllPermissions)(context.userId, REQUIRED_PERMISSIONS);
        if (!hasPermissions) {
            const error = `Missing required permissions: ${REQUIRED_PERMISSIONS.join(', ')}`;
            await (0, audit_1.logAction)({
                userId: context.userId,
                actionName: 'searchMedicalCodes',
                parameters: params,
                error,
                permissionsChecked: REQUIRED_PERMISSIONS,
                success: false,
                executionTimeMs: Date.now() - startTime,
            });
            throw new Error(error);
        }
        // 3. Search SNOMED concepts
        logger_1.logger.info({ searchTerm: params.searchTerm, limit }, 'Searching SNOMED concepts');
        const result = await snowstorm_1.snowstormClient.searchConcepts(params.searchTerm, limit);
        // 4. Format response
        const response = {
            codes: result.items,
            total: result.total,
            searchTerm: params.searchTerm,
        };
        // 5. Audit log success
        await (0, audit_1.logAction)({
            userId: context.userId,
            actionName: 'searchMedicalCodes',
            parameters: params,
            result: { count: result.items.length, total: result.total },
            permissionsChecked: REQUIRED_PERMISSIONS,
            success: true,
            executionTimeMs: Date.now() - startTime,
        });
        logger_1.logger.info({
            userId: context.userId,
            searchTerm: params.searchTerm,
            resultCount: result.items.length,
            executionTimeMs: Date.now() - startTime
        }, 'Medical code search completed');
        return response;
    }
    catch (error) {
        // Log failure
        await (0, audit_1.logAction)({
            userId: context.userId,
            actionName: 'searchMedicalCodes',
            parameters: params,
            error: error.message,
            permissionsChecked: REQUIRED_PERMISSIONS,
            success: false,
            executionTimeMs: Date.now() - startTime,
        });
        logger_1.logger.error({
            error: error.message,
            userId: context.userId,
            searchTerm: params.searchTerm
        }, 'Medical code search failed');
        throw error;
    }
}
//# sourceMappingURL=medicalCodingAgent.js.map