/**
 * Backend API HTTP Client
 * Communicates with the FastAPI backend service (port 8000)
 */
import { Patient, MedicalRecord, PatientFilters, MedicalRecordFilters } from '../types/patient';
/**
 * Backend API Client for patient and medical record operations
 */
declare class BackendClient {
    private client;
    constructor();
    /**
     * Set JWT token for authenticated requests
     */
    setAuthToken(token: string): void;
    /**
     * Clear JWT token
     */
    clearAuthToken(): void;
    /**
     * Get a single patient by ID
     */
    getPatient(patientId: string, token?: string): Promise<Patient>;
    /**
     * Get list of patients with optional filters
     */
    getPatients(filters?: PatientFilters, token?: string): Promise<Patient[]>;
    /**
     * Get medical records for a patient
     */
    getMedicalRecords(patientId: string, filters?: MedicalRecordFilters, token?: string): Promise<MedicalRecord[]>;
    /**
     * Get a single medical record by ID
     */
    getMedicalRecord(recordId: string, token?: string): Promise<MedicalRecord>;
    /**
     * Find patient by user ID (for patient role ownership validation)
     */
    findPatientByUserId(userId: string, token?: string): Promise<Patient | null>;
    /**
     * Handle API errors with consistent logging
     */
    private handleError;
}
export declare const backendClient: BackendClient;
export {};
//# sourceMappingURL=backend.d.ts.map