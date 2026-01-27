/**
 * Type exports for copilot-service
 */

export {
  JwtPayload,
  UserInfo,
  UserContext,
  AuthenticatedRequest,
  UserRole,
  Permission,
} from './user';

export {
  Patient,
  MedicalRecord,
  GetPatientDataParams,
  GetPatientDataResult,
  PatientFilters,
  MedicalRecordFilters,
  PatientListResult,
} from './patient';

// Clinical Notes types (Phase 4d)
export {
  ClinicalNoteType,
  ClinicalNoteRequest,
  ClinicalNoteResponse,
  ClinicalDocumentationContext,
  MedicalPromptTemplate,
  CLINICAL_STAFF_ROLES,
  SOAPNote,
  ProgressNote,
  DischargeSummary,
  ConsultationNote,
} from './clinicalNotes';

// Medical Coding types
export {
  MedicalCodeSearchParams,
  MedicalCodeSearchResult,
  SnomedConcept,
  ActionAuditLog,
  ActionContext,
} from './medicalCoding';
