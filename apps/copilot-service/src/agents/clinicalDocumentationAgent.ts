import { hasAllPermissions, hasAnyRole } from '../services/rbac';
import { logAction } from '../services/audit';
import { logger } from '../config/logger';
import { pgPool } from '../config/database';
import { config } from '../config/env';
import axios from 'axios';
import { ActionContext } from '../types/medicalCoding';
import { llmClient, ChatMessage, LLMServiceError } from '../services/llm';
import {
  ClinicalNoteRequest,
  ClinicalNoteResponse,
  ClinicalDocumentationContext,
  ClinicalNoteType,
  CLINICAL_STAFF_ROLES,
  MedicalPromptTemplate,
} from '../types/clinicalNotes';

// Clinical Documentation Agent Types
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

const DOCUMENTATION_PERMISSIONS = ['records:create', 'records:update', 'llm:use'];
const READ_PERMISSIONS = ['records:read', 'llm:use'];

/**
 * Generate SOAP note using LLM service
 */
export async function generateSoapNote(
  params: GenerateSoapNoteParams,
  context: ActionContext
): Promise<GenerateSoapNoteResult> {
  const startTime = Date.now();

  try {
    // Validate required params
    if (!params.patientId || !params.visitId || !params.chiefComplaint) {
      throw new Error('patientId, visitId, and chiefComplaint are required');
    }

    // Check permissions
    logger.debug({ userId: context.userId, permissions: DOCUMENTATION_PERMISSIONS }, 'Checking permissions');

    const hasPermissions = await hasAllPermissions(context.userId, DOCUMENTATION_PERMISSIONS);

    if (!hasPermissions) {
      const error = `Missing required permissions: ${DOCUMENTATION_PERMISSIONS.join(', ')}`;
      await logAction({
        userId: context.userId,
        actionName: 'generateSoapNote',
        parameters: { patientId: params.patientId, visitId: params.visitId },
        error,
        permissionsChecked: DOCUMENTATION_PERMISSIONS,
        success: false,
        executionTimeMs: Date.now() - startTime,
      });
      throw new Error(error);
    }

    // Verify patient exists
    const patientResult = await pgPool.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [params.patientId]
    );

    if (patientResult.rows.length === 0) {
      throw new Error(`Patient not found: ${params.patientId}`);
    }

    // Build prompt for LLM
    const prompt = buildSoapNotePrompt(params, patientResult.rows[0]);

    // Call LLM service
    const llmResponse = await callLlmService(prompt, 'soap_note');

    // Parse LLM response
    const soapNote = parseSoapNoteResponse(llmResponse);

    const response: GenerateSoapNoteResult = {
      patientId: params.patientId,
      visitId: params.visitId,
      note: soapNote,
      metadata: {
        model: 'gpt-4',
        executionTimeMs: Date.now() - startTime,
      },
    };

    // Audit log success
    await logAction({
      userId: context.userId,
      actionName: 'generateSoapNote',
      parameters: { patientId: params.patientId, visitId: params.visitId },
      result: { noteGenerated: true, confidence: soapNote.confidence },
      permissionsChecked: DOCUMENTATION_PERMISSIONS,
      success: true,
      executionTimeMs: Date.now() - startTime,
    });

    logger.info(
      {
        userId: context.userId,
        patientId: params.patientId,
        visitId: params.visitId,
        executionTimeMs: Date.now() - startTime,
      },
      'SOAP note generated'
    );

    return response;
  } catch (error: any) {
    await logAction({
      userId: context.userId,
      actionName: 'generateSoapNote',
      parameters: { patientId: params.patientId, visitId: params.visitId },
      error: error.message,
      permissionsChecked: DOCUMENTATION_PERMISSIONS,
      success: false,
      executionTimeMs: Date.now() - startTime,
    });

    logger.error(
      {
        error: error.message,
        userId: context.userId,
        patientId: params.patientId,
      },
      'Failed to generate SOAP note'
    );

    throw error;
  }
}

/**
 * Summarize patient history using LLM
 */
export async function summarizePatientHistory(
  params: SummarizeHistoryParams,
  context: ActionContext
): Promise<HistorySummary> {
  const startTime = Date.now();

  try {
    // Validate required params
    if (!params.patientId || !params.summaryType) {
      throw new Error('patientId and summaryType are required');
    }

    // Check permissions
    const hasPermissions = await hasAllPermissions(context.userId, READ_PERMISSIONS);

    if (!hasPermissions) {
      const error = `Missing required permissions: ${READ_PERMISSIONS.join(', ')}`;
      await logAction({
        userId: context.userId,
        actionName: 'summarizePatientHistory',
        parameters: params,
        error,
        permissionsChecked: READ_PERMISSIONS,
        success: false,
        executionTimeMs: Date.now() - startTime,
      });
      throw new Error(error);
    }

    // Fetch patient history
    const periodDays = params.periodDays || 365;
    const historyData = await fetchPatientHistory(params.patientId, params.summaryType, periodDays);

    // Build prompt and call LLM
    const prompt = buildSummaryPrompt(params.summaryType, historyData);
    const llmResponse = await callLlmService(prompt, 'summary');

    // Parse response
    const summary = parseSummaryResponse(llmResponse, params);

    // Audit log success
    await logAction({
      userId: context.userId,
      actionName: 'summarizePatientHistory',
      parameters: params,
      result: { summaryGenerated: true, keyFindingsCount: summary.keyFindings.length },
      permissionsChecked: READ_PERMISSIONS,
      success: true,
      executionTimeMs: Date.now() - startTime,
    });

    logger.info(
      {
        userId: context.userId,
        patientId: params.patientId,
        summaryType: params.summaryType,
        executionTimeMs: Date.now() - startTime,
      },
      'Patient history summarized'
    );

    return summary;
  } catch (error: any) {
    await logAction({
      userId: context.userId,
      actionName: 'summarizePatientHistory',
      parameters: params,
      error: error.message,
      permissionsChecked: READ_PERMISSIONS,
      success: false,
      executionTimeMs: Date.now() - startTime,
    });

    logger.error(
      {
        error: error.message,
        userId: context.userId,
        patientId: params.patientId,
      },
      'Failed to summarize patient history'
    );

    throw error;
  }
}

/**
 * Save clinical document to database
 */
export async function saveDocument(
  params: SaveDocumentParams,
  context: ActionContext
): Promise<SaveDocumentResult> {
  const startTime = Date.now();

  try {
    // Validate required params
    if (!params.patientId || !params.documentType || !params.content) {
      throw new Error('patientId, documentType, and content are required');
    }

    // Check permissions
    const hasPermissions = await hasAllPermissions(context.userId, DOCUMENTATION_PERMISSIONS);

    if (!hasPermissions) {
      const error = `Missing required permissions: ${DOCUMENTATION_PERMISSIONS.join(', ')}`;
      await logAction({
        userId: context.userId,
        actionName: 'saveDocument',
        parameters: { patientId: params.patientId, documentType: params.documentType },
        error,
        permissionsChecked: DOCUMENTATION_PERMISSIONS,
        success: false,
        executionTimeMs: Date.now() - startTime,
      });
      throw new Error(error);
    }

    const status = params.status || 'draft';

    // Insert document
    const result = await pgPool.query(
      `INSERT INTO clinical_documents (
        patient_id, visit_id, document_type, content, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, patient_id, document_type, status, created_at`,
      [params.patientId, params.visitId || null, params.documentType, JSON.stringify(params.content), status, context.userId]
    );

    const savedDoc = result.rows[0];

    const response: SaveDocumentResult = {
      documentId: savedDoc.id,
      patientId: savedDoc.patient_id,
      documentType: savedDoc.document_type,
      status: savedDoc.status,
      createdAt: savedDoc.created_at,
    };

    // Audit log success
    await logAction({
      userId: context.userId,
      actionName: 'saveDocument',
      parameters: { patientId: params.patientId, documentType: params.documentType },
      result: { documentId: response.documentId, status: response.status },
      permissionsChecked: DOCUMENTATION_PERMISSIONS,
      success: true,
      executionTimeMs: Date.now() - startTime,
    });

    logger.info(
      {
        userId: context.userId,
        patientId: params.patientId,
        documentId: response.documentId,
        documentType: params.documentType,
        executionTimeMs: Date.now() - startTime,
      },
      'Clinical document saved'
    );

    return response;
  } catch (error: any) {
    await logAction({
      userId: context.userId,
      actionName: 'saveDocument',
      parameters: { patientId: params.patientId, documentType: params.documentType },
      error: error.message,
      permissionsChecked: DOCUMENTATION_PERMISSIONS,
      success: false,
      executionTimeMs: Date.now() - startTime,
    });

    logger.error(
      {
        error: error.message,
        userId: context.userId,
        patientId: params.patientId,
      },
      'Failed to save clinical document'
    );

    throw error;
  }
}

// Helper functions

function buildSoapNotePrompt(params: GenerateSoapNoteParams, patient: any): string {
  let prompt = `Generate a SOAP note for the following patient encounter:

Patient: ${patient.first_name} ${patient.last_name}
Chief Complaint: ${params.chiefComplaint}
`;

  if (params.vitalSigns) {
    prompt += '\nVital Signs:\n';
    if (params.vitalSigns.bloodPressure) prompt += `- Blood Pressure: ${params.vitalSigns.bloodPressure}\n`;
    if (params.vitalSigns.heartRate) prompt += `- Heart Rate: ${params.vitalSigns.heartRate} bpm\n`;
    if (params.vitalSigns.temperature) prompt += `- Temperature: ${params.vitalSigns.temperature}F\n`;
    if (params.vitalSigns.respiratoryRate) prompt += `- Respiratory Rate: ${params.vitalSigns.respiratoryRate}/min\n`;
    if (params.vitalSigns.oxygenSaturation) prompt += `- Oxygen Saturation: ${params.vitalSigns.oxygenSaturation}%\n`;
  }

  if (params.symptoms && params.symptoms.length > 0) {
    prompt += `\nSymptoms: ${params.symptoms.join(', ')}\n`;
  }

  if (params.physicalExamFindings) {
    prompt += `\nPhysical Exam Findings: ${params.physicalExamFindings}\n`;
  }

  if (params.assessmentContext) {
    prompt += `\nAssessment Context: ${params.assessmentContext}\n`;
  }

  prompt += '\nPlease generate a comprehensive SOAP note with Subjective, Objective, Assessment, and Plan sections.';

  return prompt;
}

function buildSummaryPrompt(summaryType: string, historyData: any): string {
  let prompt = `Generate a ${summaryType} summary for the following patient data:\n\n`;
  prompt += JSON.stringify(historyData, null, 2);
  prompt += '\n\nProvide a concise summary with key findings.';
  return prompt;
}

async function callLlmService(prompt: string, taskType: string): Promise<string> {
  try {
    const response = await axios.post(
      `${config.llmServiceUrl}/api/generate`,
      {
        prompt,
        taskType,
        maxTokens: 1500,
        temperature: 0.3,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.text || response.data.content || '';
  } catch (error: any) {
    logger.error({ error: error.message }, 'LLM service call failed');
    throw new Error(`LLM service error: ${error.message}`);
  }
}

function parseSoapNoteResponse(response: string): SoapNote {
  // Default structure if parsing fails
  const defaultNote: SoapNote = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    generatedAt: new Date().toISOString(),
    confidence: 0.8,
  };

  try {
    // Try to parse structured response
    const sections = {
      subjective: extractSection(response, 'Subjective', 'Objective'),
      objective: extractSection(response, 'Objective', 'Assessment'),
      assessment: extractSection(response, 'Assessment', 'Plan'),
      plan: extractSection(response, 'Plan', null),
    };

    return {
      ...sections,
      generatedAt: new Date().toISOString(),
      confidence: calculateConfidence(sections),
    };
  } catch {
    return defaultNote;
  }
}

function extractSection(text: string, sectionStart: string, sectionEnd: string | null): string {
  const startRegex = new RegExp(`${sectionStart}[:\\s]*`, 'i');
  const startMatch = text.match(startRegex);

  if (!startMatch) return '';

  const startIndex = text.indexOf(startMatch[0]) + startMatch[0].length;
  let endIndex = text.length;

  if (sectionEnd) {
    const endRegex = new RegExp(`${sectionEnd}[:\\s]*`, 'i');
    const endMatch = text.substring(startIndex).match(endRegex);
    if (endMatch) {
      endIndex = startIndex + text.substring(startIndex).indexOf(endMatch[0]);
    }
  }

  return text.substring(startIndex, endIndex).trim();
}

function calculateConfidence(sections: Record<string, string>): number {
  const filledSections = Object.values(sections).filter(s => s.length > 10).length;
  return Math.min(0.95, 0.5 + (filledSections * 0.1));
}

async function fetchPatientHistory(patientId: string, summaryType: string, periodDays: number): Promise<any> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  let query = '';
  const values = [patientId, startDate.toISOString()];

  switch (summaryType) {
    case 'medications':
      query = `
        SELECT * FROM patient_records
        WHERE patient_id = $1 AND record_type = 'medication' AND created_at >= $2
        ORDER BY created_at DESC
      `;
      break;
    case 'conditions':
      query = `
        SELECT * FROM patient_records
        WHERE patient_id = $1 AND record_type IN ('diagnosis', 'condition') AND created_at >= $2
        ORDER BY created_at DESC
      `;
      break;
    case 'recent':
      query = `
        SELECT * FROM patient_records
        WHERE patient_id = $1 AND created_at >= $2
        ORDER BY created_at DESC
        LIMIT 20
      `;
      break;
    default: // comprehensive
      query = `
        SELECT * FROM patient_records
        WHERE patient_id = $1 AND created_at >= $2
        ORDER BY created_at DESC
      `;
  }

  const result = await pgPool.query(query, values);
  return result.rows;
}

function parseSummaryResponse(response: string, params: SummarizeHistoryParams): HistorySummary {
  // Extract key findings (bullet points or numbered items)
  const keyFindings: string[] = [];
  const lines = response.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[-*\d.]\s+/) && trimmed.length > 5) {
      keyFindings.push(trimmed.replace(/^[-*\d.]+\s*/, ''));
    }
  }

  return {
    patientId: params.patientId,
    summaryType: params.summaryType,
    summary: response,
    keyFindings: keyFindings.slice(0, 10),
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Phase 4d: Clinical Documentation Agent - generateClinicalNote Action
// ============================================================================

// Required permissions for generateClinicalNote action
const GENERATE_NOTE_PERMISSIONS = ['llm:use', 'records:create'];

// Allowed roles for clinical documentation (clinical staff only)
const ALLOWED_CLINICAL_ROLES = [...CLINICAL_STAFF_ROLES];

// Model to use for clinical note generation
const CLINICAL_NOTE_MODEL = 'gpt-4';

// Maximum context length for patient context
const MAX_CONTEXT_LENGTH = 10000;

/**
 * Medical prompt templates for each note type
 * These templates guide the LLM to generate appropriate clinical documentation
 */
const MEDICAL_PROMPT_TEMPLATES: Record<ClinicalNoteType, MedicalPromptTemplate> = {
  SOAP: {
    systemPrompt: `You are a clinical documentation assistant helping healthcare providers create SOAP notes.
Your role is to generate well-structured, professional SOAP (Subjective, Objective, Assessment, Plan) notes based on the provided patient information.

Guidelines:
- Use professional medical terminology appropriately
- Be concise but thorough
- Follow standard SOAP note formatting
- Include all relevant clinical details
- Never fabricate information not provided in the context
- If information is missing, indicate it with [Not documented] or similar notation
- Maintain HIPAA-compliant language
- Use present tense for current findings, past tense for history

SOAP Note Structure:
- SUBJECTIVE: Patient's reported symptoms, chief complaint, history of present illness, relevant medical/social history
- OBJECTIVE: Vital signs, physical examination findings, lab results, imaging findings
- ASSESSMENT: Clinical impression, diagnoses, differential diagnoses
- PLAN: Treatment plan, medications, follow-up, patient education, referrals`,

    userPromptTemplate: `Based on the following patient information, generate a comprehensive SOAP note:

PATIENT CONTEXT:
{patientContext}

{additionalInstructions}

Please generate a complete SOAP note with clearly labeled sections (SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN).`,
  },

  Progress: {
    systemPrompt: `You are a clinical documentation assistant helping healthcare providers create daily progress notes.
Your role is to generate well-structured progress notes that document the patient's current status and ongoing care.

Guidelines:
- Document the patient's current condition and any changes since the last note
- Include relevant vital signs and examination findings
- Note any new symptoms, complications, or improvements
- Document current medications and any changes
- Use professional medical terminology
- Be concise and factual
- Never fabricate information not provided in the context
- Use [Not documented] for missing information
- Maintain HIPAA-compliant language

Progress Note Structure:
- Date and Time
- Chief Complaint/Reason for Visit
- Interval History (changes since last encounter)
- Current Medications
- Vital Signs
- Physical Examination
- Assessment
- Plan`,

    userPromptTemplate: `Based on the following patient information, generate a progress note:

PATIENT CONTEXT:
{patientContext}

{additionalInstructions}

Please generate a complete progress note documenting the patient's current status.`,
  },

  Discharge: {
    systemPrompt: `You are a clinical documentation assistant helping healthcare providers create discharge summaries.
Your role is to generate comprehensive discharge summaries that ensure continuity of care after hospital discharge.

Guidelines:
- Provide a complete summary of the hospitalization
- Clearly document admission and discharge diagnoses
- Summarize the hospital course including procedures and treatments
- List all discharge medications with clear instructions
- Provide specific follow-up instructions
- Include patient education provided
- Use clear, understandable language for patient instructions
- Use professional medical terminology for clinical sections
- Never fabricate information not provided in the context
- Use [Not documented] for missing information

Discharge Summary Structure:
- Patient Information
- Admission Date / Discharge Date
- Admitting Diagnosis
- Discharge Diagnosis
- Hospital Course (summary of treatment and progress)
- Procedures Performed
- Discharge Medications (with dosing and instructions)
- Follow-up Instructions
- Patient Education
- Pending Results/Studies
- Emergency Return Precautions`,

    userPromptTemplate: `Based on the following patient information, generate a discharge summary:

PATIENT CONTEXT:
{patientContext}

{additionalInstructions}

Please generate a complete discharge summary with all necessary sections for continuity of care.`,
  },

  Consultation: {
    systemPrompt: `You are a clinical documentation assistant helping healthcare providers create consultation notes.
Your role is to generate professional consultation notes for specialist referrals and consultations.

Guidelines:
- Clearly state the reason for consultation
- Provide relevant history and background
- Document pertinent positive and negative findings
- Offer clear clinical impression and recommendations
- Use professional medical terminology
- Be thorough but focused on the consultation question
- Never fabricate information not provided in the context
- Use [Not documented] for missing information
- Maintain HIPAA-compliant language

Consultation Note Structure:
- Reason for Consultation
- History of Present Illness
- Past Medical History
- Current Medications
- Allergies
- Physical Examination
- Diagnostic Studies/Labs
- Impression/Assessment
- Recommendations`,

    userPromptTemplate: `Based on the following patient information, generate a consultation note:

PATIENT CONTEXT:
{patientContext}

{additionalInstructions}

Please generate a complete consultation note with clear recommendations.`,
  },
};

/**
 * Validate the clinical note request parameters
 */
function validateClinicalNoteRequest(params: ClinicalNoteRequest): string[] {
  const errors: string[] = [];

  // Validate noteType
  const validNoteTypes: ClinicalNoteType[] = ['SOAP', 'Progress', 'Discharge', 'Consultation'];
  if (!params.noteType || !validNoteTypes.includes(params.noteType)) {
    errors.push(
      `Invalid noteType. Must be one of: ${validNoteTypes.join(', ')}`
    );
  }

  // Validate patientContext
  if (!params.patientContext || params.patientContext.trim().length === 0) {
    errors.push('patientContext is required and cannot be empty');
  } else if (params.patientContext.length > MAX_CONTEXT_LENGTH) {
    errors.push(
      `patientContext exceeds maximum length of ${MAX_CONTEXT_LENGTH} characters`
    );
  }

  // Validate additionalInstructions if provided
  if (
    params.additionalInstructions &&
    params.additionalInstructions.length > 1000
  ) {
    errors.push('additionalInstructions exceeds maximum length of 1000 characters');
  }

  return errors;
}

/**
 * Build the prompt for the LLM based on note type and patient context
 */
function buildClinicalNotePrompt(params: ClinicalNoteRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  const template = MEDICAL_PROMPT_TEMPLATES[params.noteType];

  let userPrompt = template.userPromptTemplate
    .replace('{patientContext}', params.patientContext);

  // Add additional instructions if provided
  if (params.additionalInstructions) {
    userPrompt = userPrompt.replace(
      '{additionalInstructions}',
      `ADDITIONAL INSTRUCTIONS:\n${params.additionalInstructions}`
    );
  } else {
    userPrompt = userPrompt.replace('{additionalInstructions}', '');
  }

  return {
    systemPrompt: template.systemPrompt,
    userPrompt: userPrompt.trim(),
  };
}

/**
 * Generate a clinical note using the LLM Service
 *
 * Action name: generateClinicalNote
 * Required permissions: llm:use, records:create
 * Restricted to clinical staff ONLY: physician, nurse, medical_assistant
 *
 * @param params Clinical note request parameters
 * @param params.noteType Type of note: 'SOAP' | 'Progress' | 'Discharge' | 'Consultation'
 * @param params.patientContext Patient symptoms, history, observations, etc.
 * @param params.additionalInstructions Optional additional instructions
 * @param context User context including authentication
 * @returns Generated clinical note response
 * @throws Error if user lacks permissions, wrong role, or if generation fails
 */
export async function generateClinicalNote(
  params: ClinicalNoteRequest,
  context: ClinicalDocumentationContext
): Promise<ClinicalNoteResponse> {
  const startTime = Date.now();
  const actionName = 'generateClinicalNote';

  try {
    // 1. Validate request parameters
    const validationErrors = validateClinicalNoteRequest(params);
    if (validationErrors.length > 0) {
      const error = `Validation failed: ${validationErrors.join('; ')}`;
      logger.warn({ userId: context.userId, errors: validationErrors }, 'Request validation failed');

      // Log the failed attempt (non-blocking)
      logAction({
        userId: context.userId,
        actionName,
        parameters: { noteType: params.noteType },
        error,
        permissionsChecked: GENERATE_NOTE_PERMISSIONS,
        success: false,
        executionTimeMs: Date.now() - startTime,
      }).catch((e) => logger.error({ error: e }, 'Failed to log audit'));

      throw new Error(error);
    }

    // 2. Check if user has a clinical staff role (CRITICAL: physician, nurse, medical_assistant ONLY)
    logger.debug(
      { userId: context.userId, role: context.role },
      'Checking clinical staff role'
    );

    const hasAllowedRole = await hasAnyRole(context.userId, ALLOWED_CLINICAL_ROLES);
    if (!hasAllowedRole) {
      const error = `Access denied. This action is restricted to clinical staff only (${ALLOWED_CLINICAL_ROLES.join(', ')})`;
      logger.warn(
        { userId: context.userId, role: context.role, allowedRoles: ALLOWED_CLINICAL_ROLES },
        'Clinical staff role check failed'
      );

      // Log the failed attempt (non-blocking)
      logAction({
        userId: context.userId,
        actionName,
        parameters: { noteType: params.noteType },
        error,
        permissionsChecked: GENERATE_NOTE_PERMISSIONS,
        success: false,
        executionTimeMs: Date.now() - startTime,
      }).catch((e) => logger.error({ error: e }, 'Failed to log audit'));

      throw new Error(error);
    }

    // 3. Check required permissions (llm:use, records:create)
    logger.debug(
      { userId: context.userId, permissions: GENERATE_NOTE_PERMISSIONS },
      'Checking permissions'
    );

    const hasPermissions = await hasAllPermissions(
      context.userId,
      GENERATE_NOTE_PERMISSIONS
    );

    if (!hasPermissions) {
      const error = `Missing required permissions: ${GENERATE_NOTE_PERMISSIONS.join(', ')}`;
      logger.warn(
        { userId: context.userId, requiredPermissions: GENERATE_NOTE_PERMISSIONS },
        'Permission check failed'
      );

      // Log the failed attempt (non-blocking)
      logAction({
        userId: context.userId,
        actionName,
        parameters: { noteType: params.noteType },
        error,
        permissionsChecked: GENERATE_NOTE_PERMISSIONS,
        success: false,
        executionTimeMs: Date.now() - startTime,
      }).catch((e) => logger.error({ error: e }, 'Failed to log audit'));

      throw new Error(error);
    }

    // 4. Build the prompt
    const { systemPrompt, userPrompt } = buildClinicalNotePrompt(params);

    logger.info(
      {
        userId: context.userId,
        noteType: params.noteType,
        contextLength: params.patientContext.length,
      },
      'Generating clinical note via LLM Service'
    );

    // 5. Call LLM Service (port 8003) with OpenAI-compatible API
    // 30-second timeout is configured in the llmClient
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const llmResponse = await llmClient.generateCompletion(
      messages,
      {
        model: CLINICAL_NOTE_MODEL,
        maxTokens: 4096, // Clinical notes can be lengthy
        temperature: 0.3, // Lower temperature for consistent, professional output
      },
      context.token // Pass JWT for downstream authentication
    );

    const generatedContent = llmResponse.choices[0]?.message?.content || '';

    if (!generatedContent) {
      throw new Error('LLM Service returned empty content');
    }

    // 6. Build response
    const response: ClinicalNoteResponse = {
      content: generatedContent,
      noteType: params.noteType,
      generatedAt: new Date().toISOString(),
      model: llmResponse.model,
      usage: {
        promptTokens: llmResponse.usage.prompt_tokens,
        completionTokens: llmResponse.usage.completion_tokens,
        totalTokens: llmResponse.usage.total_tokens,
      },
      warnings: [],
    };

    // Add warnings if applicable
    if (llmResponse.choices[0]?.finish_reason === 'length') {
      response.warnings?.push(
        'Note may be incomplete due to token limit. Consider breaking into smaller sections.'
      );
    }

    const executionTimeMs = Date.now() - startTime;

    // 7. Log successful action (non-blocking audit logging)
    logAction({
      userId: context.userId,
      actionName,
      parameters: {
        noteType: params.noteType,
        contextLength: params.patientContext.length,
        hasAdditionalInstructions: !!params.additionalInstructions,
      },
      result: {
        model: response.model,
        usage: response.usage,
        contentLength: response.content.length,
      },
      permissionsChecked: GENERATE_NOTE_PERMISSIONS,
      success: true,
      executionTimeMs,
    }).catch((e) => logger.error({ error: e }, 'Failed to log audit'));

    logger.info(
      {
        userId: context.userId,
        noteType: params.noteType,
        model: response.model,
        contentLength: response.content.length,
        executionTimeMs,
      },
      'Clinical note generated successfully'
    );

    return response;
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;

    // Handle LLM Service specific errors
    if (error instanceof LLMServiceError) {
      logger.error(
        {
          userId: context.userId,
          noteType: params.noteType,
          errorCode: error.code,
          statusCode: error.statusCode,
          message: error.message,
          executionTimeMs,
        },
        'LLM Service error during clinical note generation'
      );

      // Log the failed attempt (non-blocking)
      logAction({
        userId: context.userId,
        actionName,
        parameters: { noteType: params.noteType },
        error: `LLM Service Error (${error.code}): ${error.message}`,
        permissionsChecked: GENERATE_NOTE_PERMISSIONS,
        success: false,
        executionTimeMs,
      }).catch((e) => logger.error({ error: e }, 'Failed to log audit'));

      throw new Error(`Failed to generate clinical note: ${error.message}`);
    }

    // Handle other errors
    logger.error(
      {
        userId: context.userId,
        noteType: params.noteType,
        error: error.message,
        executionTimeMs,
      },
      'Clinical note generation failed'
    );

    // Log the failed attempt if not already logged (non-blocking)
    if (!error.message.includes('Validation failed') &&
        !error.message.includes('Access denied') &&
        !error.message.includes('Missing required permissions')) {
      logAction({
        userId: context.userId,
        actionName,
        parameters: { noteType: params.noteType },
        error: error.message,
        permissionsChecked: GENERATE_NOTE_PERMISSIONS,
        success: false,
        executionTimeMs,
      }).catch((e) => logger.error({ error: e }, 'Failed to log audit'));
    }

    throw error;
  }
}

/**
 * Get available clinical note types
 */
export function getAvailableNoteTypes(): ClinicalNoteType[] {
  return ['SOAP', 'Progress', 'Discharge', 'Consultation'];
}

/**
 * Get the prompt template for a specific note type (for preview/debugging)
 */
export function getNoteTypeTemplate(noteType: ClinicalNoteType): MedicalPromptTemplate | null {
  return MEDICAL_PROMPT_TEMPLATES[noteType] || null;
}

/**
 * Check if a role is allowed to generate clinical notes
 */
export function isAllowedClinicalRole(role: string): boolean {
  return ALLOWED_CLINICAL_ROLES.includes(role as typeof ALLOWED_CLINICAL_ROLES[number]);
}

/**
 * Action metadata for CopilotKit registration
 */
export const generateClinicalNoteAction = {
  name: 'generateClinicalNote',
  description:
    'Generate a clinical note (SOAP, Progress, Discharge, or Consultation) based on patient context. Restricted to clinical staff only (physician, nurse, medical_assistant).',
  parameters: {
    type: 'object',
    properties: {
      noteType: {
        type: 'string',
        enum: ['SOAP', 'Progress', 'Discharge', 'Consultation'],
        description: 'The type of clinical note to generate',
      },
      patientContext: {
        type: 'string',
        description: 'Patient context including symptoms, history, observations, vital signs, etc.',
      },
      additionalInstructions: {
        type: 'string',
        description: 'Optional additional instructions for customizing the note generation',
      },
    },
    required: ['noteType', 'patientContext'],
  },
  handler: generateClinicalNote,
};

// Export constants for use in other modules
export { GENERATE_NOTE_PERMISSIONS, ALLOWED_CLINICAL_ROLES, CLINICAL_NOTE_MODEL };
