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
import { GetPatientDataParams, GetPatientDataResult } from '../types/patient';
import { ActionContext } from '../types/medicalCoding';
/**
 * Get patient data action
 *
 * @param params - Action parameters
 * @param params.patientId - Optional UUID of patient to retrieve (if not provided, returns current user's patient data for patient role)
 * @param params.includeRecords - Whether to include medical records
 * @param context - User context containing authenticated user info
 * @returns Patient data with optional medical records
 */
export declare function getPatientData(params: GetPatientDataParams, context: ActionContext): Promise<GetPatientDataResult>;
/**
 * Action metadata for CopilotKit registration
 */
export declare const getPatientDataAction: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            patientId: {
                type: string;
                description: string;
            };
            includeRecords: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: typeof getPatientData;
};
//# sourceMappingURL=patientDataAgent.d.ts.map