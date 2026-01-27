"use strict";
/**
 * Patient Data Agent
 *
 * CopilotKit action for retrieving patient data with full RBAC and audit logging.
 *
 * Action name: getPatientData
 * Required permissions: patients:read, records:read
 *
 * Security features:
 * - Patients can ONLY access their own data (ownership validation)
 * - All other roles with patients:read can access any patient
 * - Complete audit trail with user, action, params, result
 * - Non-blocking audit logging
 * - 10-second timeout
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatientDataAction = void 0;
exports.getPatientData = getPatientData;
const rbac_1 = require("../services/rbac");
const backend_1 = require("../services/backend");
const audit_1 = require("../services/audit");
const logger_1 = require("../config/logger");
const user_1 = require("../types/user");
// Required permissions for this action
const REQUIRED_PERMISSIONS = ['patients:read', 'records:read'];
// Action name for audit logging
const ACTION_NAME = 'getPatientData';
// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * Validate UUID format
 */
function isValidUUID(id) {
    return UUID_REGEX.test(id);
}
/**
 * Check if user has patient role
 */
async function isPatientRole(userId) {
    const roles = await (0, rbac_1.getUserRoles)(userId);
    return roles.includes(user_1.UserRole.PATIENT) || roles.includes('patient');
}
/**
 * Validate that a patient user can only access their own data
 * Returns the patient ID that should be used for the query
 */
async function validatePatientAccess(userId, requestedPatientId, token) {
    // Find the patient record linked to this user
    const userPatient = await backend_1.backendClient.findPatientByUserId(userId, token);
    if (!userPatient) {
        return {
            allowed: false,
            patientId: null,
            reason: 'No patient record found for this user',
        };
    }
    // If no patient ID requested, use the user's own patient record
    if (!requestedPatientId) {
        return {
            allowed: true,
            patientId: userPatient.id,
        };
    }
    // If patient ID requested, verify it matches the user's patient record
    if (requestedPatientId !== userPatient.id) {
        return {
            allowed: false,
            patientId: null,
            reason: 'Patients can only access their own data',
        };
    }
    return {
        allowed: true,
        patientId: requestedPatientId,
    };
}
/**
 * Get patient data action
 *
 * @param params - Action parameters
 * @param params.patientId - Optional UUID of patient to retrieve (if not provided, returns current user's patient data for patient role)
 * @param params.includeRecords - Whether to include medical records
 * @param context - User context containing authenticated user info
 * @returns Patient data with optional medical records
 */
async function getPatientData(params, context) {
    const startTime = Date.now();
    // Non-blocking audit log helper
    const auditLog = async (success, result, error) => {
        // Fire and forget - don't await
        (0, audit_1.logAction)({
            userId: context.userId,
            actionName: ACTION_NAME,
            parameters: params,
            result: result,
            error: error,
            permissionsChecked: REQUIRED_PERMISSIONS,
            success,
            executionTimeMs: Date.now() - startTime,
        }).catch((e) => {
            logger_1.logger.warn({ error: e.message }, 'Failed to write audit log');
        });
    };
    try {
        // 1. Validate parameters
        if (params.patientId && !isValidUUID(params.patientId)) {
            const error = 'Invalid patientId format - must be a valid UUID';
            auditLog(false, undefined, error);
            throw new Error(error);
        }
        logger_1.logger.debug({
            userId: context.userId,
            patientId: params.patientId,
            includeRecords: params.includeRecords,
        }, 'Processing getPatientData request');
        // 2. Check permissions
        logger_1.logger.debug({ userId: context.userId, permissions: REQUIRED_PERMISSIONS }, 'Checking permissions');
        const hasPermissions = await (0, rbac_1.hasAllPermissions)(context.userId, REQUIRED_PERMISSIONS);
        if (!hasPermissions) {
            const error = `Missing required permissions: ${REQUIRED_PERMISSIONS.join(', ')}`;
            auditLog(false, undefined, error);
            throw new Error(error);
        }
        // 3. Check if user is a patient role - apply ownership restrictions
        const isPatient = await isPatientRole(context.userId);
        let targetPatientId;
        if (isPatient) {
            // Patient role: can ONLY access their own data
            logger_1.logger.debug({ userId: context.userId }, 'User has patient role - validating ownership');
            const accessValidation = await validatePatientAccess(context.userId, params.patientId);
            if (!accessValidation.allowed || !accessValidation.patientId) {
                const error = accessValidation.reason || 'Access denied - patients can only access their own data';
                auditLog(false, undefined, error);
                throw new Error(error);
            }
            targetPatientId = accessValidation.patientId;
        }
        else {
            // Non-patient roles with patients:read permission can access any patient
            if (!params.patientId) {
                const error = 'patientId is required for non-patient roles';
                auditLog(false, undefined, error);
                throw new Error(error);
            }
            targetPatientId = params.patientId;
        }
        // 4. Fetch patient data from Backend API
        logger_1.logger.info({ targetPatientId, includeRecords: params.includeRecords }, 'Fetching patient data from backend');
        const patient = await backend_1.backendClient.getPatient(targetPatientId);
        // 5. Optionally fetch medical records
        let medicalRecords;
        if (params.includeRecords) {
            logger_1.logger.debug({ patientId: targetPatientId }, 'Fetching medical records');
            medicalRecords = await backend_1.backendClient.getMedicalRecords(targetPatientId);
        }
        // 6. Build response
        const response = {
            patient,
            accessedAt: new Date().toISOString(),
        };
        if (medicalRecords) {
            response.medicalRecords = medicalRecords;
        }
        // 7. Audit log success (non-blocking)
        auditLog(true, {
            patientId: targetPatientId,
            recordCount: medicalRecords?.length ?? 0,
            isOwnData: isPatient,
        });
        logger_1.logger.info({
            userId: context.userId,
            patientId: targetPatientId,
            recordCount: medicalRecords?.length ?? 0,
            executionTimeMs: Date.now() - startTime,
        }, 'Patient data retrieved successfully');
        return response;
    }
    catch (error) {
        // Log failure (non-blocking)
        auditLog(false, undefined, error.message);
        logger_1.logger.error({
            error: error.message,
            userId: context.userId,
            patientId: params.patientId,
            executionTimeMs: Date.now() - startTime,
        }, 'getPatientData failed');
        throw error;
    }
}
/**
 * Action metadata for CopilotKit registration
 */
exports.getPatientDataAction = {
    name: ACTION_NAME,
    description: 'Retrieve patient data and optionally their medical records. Patients can only access their own data.',
    parameters: {
        type: 'object',
        properties: {
            patientId: {
                type: 'string',
                description: 'UUID of the patient to retrieve. Optional for patient role (defaults to own data). Required for other roles.',
            },
            includeRecords: {
                type: 'boolean',
                description: 'Whether to include the patient medical records in the response',
            },
        },
        required: ['includeRecords'],
    },
    handler: getPatientData,
};
//# sourceMappingURL=patientDataAgent.js.map