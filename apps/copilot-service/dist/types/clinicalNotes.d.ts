/**
 * Clinical Notes TypeScript types for copilot-service
 * Phase 4d: Clinical Documentation Agent
 */
/**
 * Supported clinical note types
 */
export type ClinicalNoteType = 'SOAP' | 'Progress' | 'Discharge' | 'Consultation';
/**
 * Clinical staff roles allowed to generate clinical notes
 */
export declare const CLINICAL_STAFF_ROLES: readonly ["physician", "nurse", "medical_assistant"];
export type ClinicalStaffRole = typeof CLINICAL_STAFF_ROLES[number];
/**
 * Request parameters for generating clinical notes
 */
export interface ClinicalNoteRequest {
    /** Type of clinical note to generate */
    noteType: ClinicalNoteType;
    /** Patient context including symptoms, history, observations, etc. */
    patientContext: string;
    /** Optional additional instructions for customizing the note */
    additionalInstructions?: string;
}
/**
 * Response from clinical note generation
 */
export interface ClinicalNoteResponse {
    /** The generated clinical note content */
    content: string;
    /** Type of note that was generated */
    noteType: ClinicalNoteType;
    /** Timestamp of generation */
    generatedAt: string;
    /** Model used for generation */
    model: string;
    /** Token usage information */
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    /** Any warnings or notices */
    warnings?: string[];
}
/**
 * Action context for clinical documentation agent
 */
export interface ClinicalDocumentationContext {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
    /** JWT token for downstream service authentication */
    token?: string;
}
/**
 * Medical prompt template structure
 */
export interface MedicalPromptTemplate {
    systemPrompt: string;
    userPromptTemplate: string;
}
/**
 * SOAP Note structure
 * - Subjective: Patient's description of symptoms
 * - Objective: Measurable, observable data
 * - Assessment: Diagnosis or clinical impression
 * - Plan: Treatment plan
 */
export interface SOAPNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}
/**
 * Progress Note structure
 * Used for daily documentation of patient status
 */
export interface ProgressNote {
    date: string;
    chiefComplaint: string;
    interval_history: string;
    currentMedications: string;
    vitalSigns: string;
    physicalExam: string;
    assessment: string;
    plan: string;
}
/**
 * Discharge Summary structure
 */
export interface DischargeSummary {
    admissionDate: string;
    dischargeDate: string;
    admittingDiagnosis: string;
    dischargeDiagnosis: string;
    hospitalCourse: string;
    procedures: string;
    dischargeMedications: string;
    followUpInstructions: string;
    patientEducation: string;
}
/**
 * Consultation Note structure
 */
export interface ConsultationNote {
    reasonForConsultation: string;
    historyOfPresentIllness: string;
    pastMedicalHistory: string;
    medications: string;
    allergies: string;
    physicalExamination: string;
    diagnosticFindings: string;
    impression: string;
    recommendations: string;
}
//# sourceMappingURL=clinicalNotes.d.ts.map