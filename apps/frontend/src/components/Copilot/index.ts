/**
 * Copilot Components - Caladrius Health AI Studio
 *
 * This module exports all CopilotKit-related components for the
 * AI Health Assistant feature.
 */

export { CopilotProvider, useCopilotConfig } from './CopilotProvider';
export { CopilotSidebar } from './CopilotSidebar';
export { CopilotChat } from './CopilotChat';

// Export types
export type {
  // Medical Codes
  ICD10Code,
  CPTCode,
  HCPCSCode,
  SearchMedicalCodesRequest,
  SearchMedicalCodesResponse,

  // Patient Data
  PatientDemographics,
  VitalSigns,
  Medication,
  Allergy,
  Condition,
  LabResult,
  Encounter,
  PatientData,
  GetPatientDataRequest,
  GetPatientDataResponse,

  // Clinical Notes
  ClinicalNoteSection,
  SOAPNote,
  ClinicalNote,
  GenerateClinicalNoteRequest,
  GenerateClinicalNoteResponse,

  // Copilot Types
  CopilotAgentAction,
  CopilotAgentRequestMap,
  CopilotAgentResponseMap,
  CopilotMessage,
  CopilotSessionState,
  CopilotConfig,
} from './types';
