/**
 * Patient-related TypeScript types for copilot-service
 * Based on Backend API schema (port 8000)
 */
/**
 * Patient entity as returned from Backend API
 */
export interface Patient {
    id: string;
    user_id: string | null;
    medical_record_number: string | null;
    date_of_birth: string | null;
    gender: string | null;
    blood_type: string | null;
    allergies: string[] | null;
    created_at?: string;
    updated_at?: string;
}
/**
 * Medical record entity as returned from Backend API
 */
export interface MedicalRecord {
    id: string;
    patient_id: string;
    practitioner_id: string | null;
    appointment_id: string | null;
    record_type: string;
    snomed_codes: string[] | null;
    diagnosis: string | null;
    treatment_plan: string | null;
    notes: string | null;
    created_at?: string;
    updated_at?: string;
}
/**
 * Parameters for getPatientData action
 */
export interface GetPatientDataParams {
    patientId?: string;
    includeRecords: boolean;
}
/**
 * Response from getPatientData action
 */
export interface GetPatientDataResult {
    patient: Patient;
    medicalRecords?: MedicalRecord[];
    accessedAt: string;
}
/**
 * Filters for listing patients
 */
export interface PatientFilters {
    skip?: number;
    limit?: number;
}
/**
 * Filters for listing medical records
 */
export interface MedicalRecordFilters {
    patientId?: string;
    recordType?: string;
    skip?: number;
    limit?: number;
}
/**
 * Patient list response
 */
export interface PatientListResult {
    patients: Patient[];
    total?: number;
}
//# sourceMappingURL=patient.d.ts.map