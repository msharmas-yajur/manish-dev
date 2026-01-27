/**
 * Agents index - exports all CopilotKit agents/actions
 */

// Medical Coding Agent
export { searchMedicalCodes } from './medicalCodingAgent';

// Patient Data Agent
export {
  getPatientData,
  getPatientDataAction,
} from './patientDataAgent';

// Clinical Documentation Agent
export {
  // Existing documentation functions
  generateSoapNote,
  summarizePatientHistory,
  saveDocument,
  // Phase 4d: New generateClinicalNote action
  generateClinicalNote,
  generateClinicalNoteAction,
  getAvailableNoteTypes,
  getNoteTypeTemplate,
  isAllowedClinicalRole,
  GENERATE_NOTE_PERMISSIONS,
  ALLOWED_CLINICAL_ROLES,
  CLINICAL_NOTE_MODEL,
} from './clinicalDocumentationAgent';
