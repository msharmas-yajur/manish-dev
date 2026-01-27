/**
 * TypeScript types for Caladrius Health AI Studio Copilot Agent Actions
 * These types define the structure for interactions with the CopilotKit agents.
 */

// ============================================================================
// Medical Codes Types
// ============================================================================

/**
 * ICD-10 Medical Code
 */
export interface ICD10Code {
  code: string;
  description: string;
  category: string;
  subcategory?: string;
  isHeader: boolean;
  includesNotes?: string[];
  excludesNotes?: string[];
}

/**
 * CPT Procedure Code
 */
export interface CPTCode {
  code: string;
  description: string;
  category: string;
  type: 'evaluation' | 'surgery' | 'radiology' | 'pathology' | 'medicine' | 'other';
  modifiers?: string[];
  relativeValueUnits?: number;
}

/**
 * HCPCS Code
 */
export interface HCPCSCode {
  code: string;
  description: string;
  category: string;
  type: 'Level I' | 'Level II';
  pricingIndicator?: string;
}

/**
 * Search Medical Codes Request
 */
export interface SearchMedicalCodesRequest {
  query: string;
  codeType?: 'icd10' | 'cpt' | 'hcpcs' | 'all';
  limit?: number;
  includeRelated?: boolean;
}

/**
 * Search Medical Codes Response
 */
export interface SearchMedicalCodesResponse {
  icd10Codes?: ICD10Code[];
  cptCodes?: CPTCode[];
  hcpcsCodes?: HCPCSCode[];
  totalResults: number;
  query: string;
  suggestedQueries?: string[];
}

// ============================================================================
// Patient Data Types
// ============================================================================

/**
 * Patient Demographics
 */
export interface PatientDemographics {
  id: string;
  mrn: string; // Medical Record Number
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
}

/**
 * Patient Vital Signs
 */
export interface VitalSigns {
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  temperatureUnit?: 'celsius' | 'fahrenheit';
  oxygenSaturation?: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'in';
  bmi?: number;
  painLevel?: number; // 0-10 scale
}

/**
 * Patient Medication
 */
export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  status: 'active' | 'discontinued' | 'completed' | 'on-hold';
  instructions?: string;
  sideEffects?: string[];
}

/**
 * Patient Allergy
 */
export interface Allergy {
  id: string;
  allergen: string;
  type: 'medication' | 'food' | 'environmental' | 'other';
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  onsetDate?: string;
  verifiedDate?: string;
  status: 'active' | 'inactive' | 'resolved';
}

/**
 * Patient Condition/Diagnosis
 */
export interface Condition {
  id: string;
  icd10Code: string;
  description: string;
  clinicalStatus: 'active' | 'recurrence' | 'relapse' | 'inactive' | 'remission' | 'resolved';
  verificationStatus: 'unconfirmed' | 'provisional' | 'differential' | 'confirmed';
  category: 'problem-list-item' | 'encounter-diagnosis';
  onsetDate?: string;
  abatementDate?: string;
  recordedDate: string;
  recordedBy: string;
  notes?: string;
}

/**
 * Patient Lab Result
 */
export interface LabResult {
  id: string;
  testName: string;
  testCode: string;
  value: string | number;
  unit: string;
  referenceRange?: string;
  status: 'normal' | 'abnormal' | 'critical';
  interpretation?: string;
  collectedDate: string;
  resultDate: string;
  orderedBy: string;
  performedAt?: string;
}

/**
 * Patient Encounter/Visit
 */
export interface Encounter {
  id: string;
  type: 'inpatient' | 'outpatient' | 'emergency' | 'telehealth' | 'home-visit';
  status: 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled';
  startDate: string;
  endDate?: string;
  reason: string;
  provider: string;
  facility?: string;
  diagnoses?: string[];
  procedures?: string[];
  notes?: string;
}

/**
 * Complete Patient Data
 */
export interface PatientData {
  demographics: PatientDemographics;
  vitalSigns?: VitalSigns[];
  medications?: Medication[];
  allergies?: Allergy[];
  conditions?: Condition[];
  labResults?: LabResult[];
  encounters?: Encounter[];
  lastUpdated: string;
}

/**
 * Get Patient Data Request
 */
export interface GetPatientDataRequest {
  patientId: string;
  sections?: ('demographics' | 'vitalSigns' | 'medications' | 'allergies' | 'conditions' | 'labResults' | 'encounters')[];
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Get Patient Data Response
 */
export interface GetPatientDataResponse {
  patient: PatientData;
  requestedSections: string[];
  dataCompleteness: number; // Percentage 0-100
  lastAccessed: string;
}

// ============================================================================
// Clinical Note Types
// ============================================================================

/**
 * Clinical Note Section
 */
export interface ClinicalNoteSection {
  title: string;
  content: string;
  order: number;
}

/**
 * SOAP Note Structure
 */
export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/**
 * Generated Clinical Note
 */
export interface ClinicalNote {
  id: string;
  patientId: string;
  encounterId?: string;
  noteType: 'progress' | 'admission' | 'discharge' | 'consultation' | 'procedure' | 'operative' | 'h-and-p';
  format: 'soap' | 'narrative' | 'structured';
  title: string;
  content: string | SOAPNote | ClinicalNoteSection[];
  chiefComplaint?: string;
  diagnoses?: Array<{
    code: string;
    description: string;
    type: 'primary' | 'secondary';
  }>;
  procedures?: Array<{
    code: string;
    description: string;
  }>;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'final' | 'amended' | 'entered-in-error';
  signedBy?: string;
  signedAt?: string;
  amendmentHistory?: Array<{
    amendedAt: string;
    amendedBy: string;
    reason: string;
    previousContent: string;
  }>;
}

/**
 * Generate Clinical Note Request
 */
export interface GenerateClinicalNoteRequest {
  patientId: string;
  encounterId?: string;
  noteType: ClinicalNote['noteType'];
  format?: ClinicalNote['format'];
  context?: {
    chiefComplaint?: string;
    symptoms?: string[];
    physicalExamFindings?: string[];
    testResults?: string[];
    treatmentPlan?: string[];
    additionalNotes?: string;
  };
  templateId?: string;
  includePatientHistory?: boolean;
}

/**
 * Generate Clinical Note Response
 */
export interface GenerateClinicalNoteResponse {
  note: ClinicalNote;
  suggestedCodes?: {
    icd10: ICD10Code[];
    cpt: CPTCode[];
  };
  confidence: number; // 0-100 confidence score
  warnings?: string[];
  requiresReview: boolean;
}

// ============================================================================
// Copilot Agent Action Types
// ============================================================================

/**
 * Agent Action Names
 */
export type CopilotAgentAction =
  | 'searchMedicalCodes'
  | 'getPatientData'
  | 'generateClinicalNote';

/**
 * Agent Action Request Map
 */
export interface CopilotAgentRequestMap {
  searchMedicalCodes: SearchMedicalCodesRequest;
  getPatientData: GetPatientDataRequest;
  generateClinicalNote: GenerateClinicalNoteRequest;
}

/**
 * Agent Action Response Map
 */
export interface CopilotAgentResponseMap {
  searchMedicalCodes: SearchMedicalCodesResponse;
  getPatientData: GetPatientDataResponse;
  generateClinicalNote: GenerateClinicalNoteResponse;
}

/**
 * Copilot Chat Message
 */
export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionResults?: Array<{
    action: CopilotAgentAction;
    result: CopilotAgentResponseMap[CopilotAgentAction];
    executionTime: number;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Copilot Session State
 */
export interface CopilotSessionState {
  sessionId: string;
  messages: CopilotMessage[];
  activePatientId?: string;
  activeEncounterId?: string;
  context: {
    recentCodes: Array<ICD10Code | CPTCode | HCPCSCode>;
    recentPatients: PatientDemographics[];
    clipboardNotes: ClinicalNote[];
  };
  preferences: {
    defaultNoteFormat: ClinicalNote['format'];
    autoSuggestCodes: boolean;
    showConfidenceScores: boolean;
  };
}

/**
 * Copilot Configuration
 */
export interface CopilotConfig {
  endpoint: string;
  maxTokens?: number;
  temperature?: number;
  streamingEnabled?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export default {
  // Export nothing by default, use named exports
};
