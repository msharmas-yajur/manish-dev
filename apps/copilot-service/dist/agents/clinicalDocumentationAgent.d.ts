import { ActionContext } from '../types/medicalCoding';
export interface GenerateSoapNoteParams {
    patientId: string;
    visitId: string;
    chiefComplaint: string;
    vitalSigns?: {
        bloodPressure?: string;
        heartRate?: number;
        temperature?: number;
        respiratoryRate?: number;
        oxygenSaturation?: number;
        weight?: number;
        height?: number;
    };
    symptoms?: string[];
    physicalExamFindings?: string;
    assessmentContext?: string;
}
export interface SoapNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    generatedAt: string;
    confidence: number;
}
export interface GenerateSoapNoteResult {
    patientId: string;
    visitId: string;
    note: SoapNote;
    metadata: {
        model: string;
        executionTimeMs: number;
    };
}
export interface SummarizeHistoryParams {
    patientId: string;
    summaryType: 'comprehensive' | 'recent' | 'medications' | 'conditions';
    periodDays?: number;
}
export interface HistorySummary {
    patientId: string;
    summaryType: string;
    summary: string;
    keyFindings: string[];
    generatedAt: string;
}
export interface SaveDocumentParams {
    patientId: string;
    visitId?: string;
    documentType: 'soap_note' | 'summary' | 'referral' | 'discharge';
    content: Record<string, any>;
    status?: 'draft' | 'final' | 'amended';
}
export interface SaveDocumentResult {
    documentId: string;
    patientId: string;
    documentType: string;
    status: string;
    createdAt: string;
}
/**
 * Generate SOAP note using LLM service
 */
export declare function generateSoapNote(params: GenerateSoapNoteParams, context: ActionContext): Promise<GenerateSoapNoteResult>;
/**
 * Summarize patient history using LLM
 */
export declare function summarizePatientHistory(params: SummarizeHistoryParams, context: ActionContext): Promise<HistorySummary>;
/**
 * Save clinical document to database
 */
export declare function saveDocument(params: SaveDocumentParams, context: ActionContext): Promise<SaveDocumentResult>;
//# sourceMappingURL=clinicalDocumentationAgent.d.ts.map