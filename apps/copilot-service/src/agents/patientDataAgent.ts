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

import { hasAllPermissions, getUserRoles } from '../services/rbac';
import { backendClient } from '../services/backend';
import { logAction } from '../services/audit';
import { logger } from '../config/logger';
import {
  GetPatientDataParams,
  GetPatientDataResult,
  Patient,
  MedicalRecord,
} from '../types/patient';
import { ActionContext } from '../types/medicalCoding';
import { UserRole } from '../types/user';

// Required permissions for this action
const REQUIRED_PERMISSIONS = ['patients:read', 'records:read'];

// Action name for audit logging
const ACTION_NAME = 'getPatientData';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Check if user has patient role
 */
async function isPatientRole(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(UserRole.PATIENT) || roles.includes('patient');
}

/**
 * Validate that a patient user can only access their own data
 * Returns the patient ID that should be used for the query
 */
async function validatePatientAccess(
  userId: string,
  requestedPatientId: string | undefined,
  token?: string
): Promise<{ allowed: boolean; patientId: string | null; reason?: string }> {
  // Find the patient record linked to this user
  const userPatient = await backendClient.findPatientByUserId(userId, token);

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
export async function getPatientData(
  params: GetPatientDataParams,
  context: ActionContext
): Promise<GetPatientDataResult> {
  const startTime = Date.now();

  // Non-blocking audit log helper
  const auditLog = async (success: boolean, result?: any, error?: string) => {
    // Fire and forget - don't await
    logAction({
      userId: context.userId,
      actionName: ACTION_NAME,
      parameters: params,
      result: result,
      error: error,
      permissionsChecked: REQUIRED_PERMISSIONS,
      success,
      executionTimeMs: Date.now() - startTime,
    }).catch((e) => {
      logger.warn({ error: e.message }, 'Failed to write audit log');
    });
  };

  try {
    // 1. Validate parameters
    if (params.patientId && !isValidUUID(params.patientId)) {
      const error = 'Invalid patientId format - must be a valid UUID';
      auditLog(false, undefined, error);
      throw new Error(error);
    }

    logger.debug(
      {
        userId: context.userId,
        patientId: params.patientId,
        includeRecords: params.includeRecords,
      },
      'Processing getPatientData request'
    );

    // 2. Check permissions
    logger.debug(
      { userId: context.userId, permissions: REQUIRED_PERMISSIONS },
      'Checking permissions'
    );

    const hasPermissions = await hasAllPermissions(
      context.userId,
      REQUIRED_PERMISSIONS
    );

    if (!hasPermissions) {
      const error = `Missing required permissions: ${REQUIRED_PERMISSIONS.join(', ')}`;
      auditLog(false, undefined, error);
      throw new Error(error);
    }

    // 3. Check if user is a patient role - apply ownership restrictions
    const isPatient = await isPatientRole(context.userId);
    let targetPatientId: string;

    if (isPatient) {
      // Patient role: can ONLY access their own data
      logger.debug(
        { userId: context.userId },
        'User has patient role - validating ownership'
      );

      const accessValidation = await validatePatientAccess(
        context.userId,
        params.patientId
      );

      if (!accessValidation.allowed || !accessValidation.patientId) {
        const error =
          accessValidation.reason || 'Access denied - patients can only access their own data';
        auditLog(false, undefined, error);
        throw new Error(error);
      }

      targetPatientId = accessValidation.patientId;
    } else {
      // Non-patient roles with patients:read permission can access any patient
      if (!params.patientId) {
        const error = 'patientId is required for non-patient roles';
        auditLog(false, undefined, error);
        throw new Error(error);
      }
      targetPatientId = params.patientId;
    }

    // 4. Fetch patient data from Backend API
    logger.info(
      { targetPatientId, includeRecords: params.includeRecords },
      'Fetching patient data from backend'
    );

    const patient = await backendClient.getPatient(targetPatientId);

    // 5. Optionally fetch medical records
    let medicalRecords: MedicalRecord[] | undefined;

    if (params.includeRecords) {
      logger.debug(
        { patientId: targetPatientId },
        'Fetching medical records'
      );
      medicalRecords = await backendClient.getMedicalRecords(targetPatientId);
    }

    // 6. Build response
    const response: GetPatientDataResult = {
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

    logger.info(
      {
        userId: context.userId,
        patientId: targetPatientId,
        recordCount: medicalRecords?.length ?? 0,
        executionTimeMs: Date.now() - startTime,
      },
      'Patient data retrieved successfully'
    );

    return response;
  } catch (error: any) {
    // Log failure (non-blocking)
    auditLog(false, undefined, error.message);

    logger.error(
      {
        error: error.message,
        userId: context.userId,
        patientId: params.patientId,
        executionTimeMs: Date.now() - startTime,
      },
      'getPatientData failed'
    );

    throw error;
  }
}

/**
 * Action metadata for CopilotKit registration
 */
export const getPatientDataAction = {
  name: ACTION_NAME,
  description:
    'Retrieve patient data and optionally their medical records. Patients can only access their own data.',
  parameters: {
    type: 'object',
    properties: {
      patientId: {
        type: 'string',
        description:
          'UUID of the patient to retrieve. Optional for patient role (defaults to own data). Required for other roles.',
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
