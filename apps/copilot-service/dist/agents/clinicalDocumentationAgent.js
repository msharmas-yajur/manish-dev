"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSoapNote = generateSoapNote;
exports.summarizePatientHistory = summarizePatientHistory;
exports.saveDocument = saveDocument;
const rbac_1 = require("../services/rbac");
const audit_1 = require("../services/audit");
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const axios_1 = __importDefault(require("axios"));
const DOCUMENTATION_PERMISSIONS = ['records:create', 'records:update', 'llm:use'];
const READ_PERMISSIONS = ['records:read', 'llm:use'];
/**
 * Generate SOAP note using LLM service
 */
async function generateSoapNote(params, context) {
    const startTime = Date.now();
    try {
        // Validate required params
        if (!params.patientId || !params.visitId || !params.chiefComplaint) {
            throw new Error('patientId, visitId, and chiefComplaint are required');
        }
        // Check permissions
        logger_1.logger.debug({ userId: context.userId, permissions: DOCUMENTATION_PERMISSIONS }, 'Checking permissions');
        const hasPermissions = await (0, rbac_1.hasAllPermissions)(context.userId, DOCUMENTATION_PERMISSIONS);
        if (!hasPermissions) {
            const error = `Missing required permissions: ${DOCUMENTATION_PERMISSIONS.join(', ')}`;
            await (0, audit_1.logAction)({
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
        const patientResult = await database_1.pgPool.query('SELECT id, first_name, last_name FROM patients WHERE id = $1', [params.patientId]);
        if (patientResult.rows.length === 0) {
            throw new Error(`Patient not found: ${params.patientId}`);
        }
        // Build prompt for LLM
        const prompt = buildSoapNotePrompt(params, patientResult.rows[0]);
        // Call LLM service
        const llmResponse = await callLlmService(prompt, 'soap_note');
        // Parse LLM response
        const soapNote = parseSoapNoteResponse(llmResponse);
        const response = {
            patientId: params.patientId,
            visitId: params.visitId,
            note: soapNote,
            metadata: {
                model: 'gpt-4',
                executionTimeMs: Date.now() - startTime,
            },
        };
        // Audit log success
        await (0, audit_1.logAction)({
            userId: context.userId,
            actionName: 'generateSoapNote',
            parameters: { patientId: params.patientId, visitId: params.visitId },
            result: { noteGenerated: true, confidence: soapNote.confidence },
            permissionsChecked: DOCUMENTATION_PERMISSIONS,
            success: true,
            executionTimeMs: Date.now() - startTime,
        });
        logger_1.logger.info({
            userId: context.userId,
            patientId: params.patientId,
            visitId: params.visitId,
            executionTimeMs: Date.now() - startTime,
        }, 'SOAP note generated');
        return response;
    }
    catch (error) {
        await (0, audit_1.logAction)({
            userId: context.userId,
            actionName: 'generateSoapNote',
            parameters: { patientId: params.patientId, visitId: params.visitId },
            error: error.message,
            permissionsChecked: DOCUMENTATION_PERMISSIONS,
            success: false,
            executionTimeMs: Date.now() - startTime,
        });
        logger_1.logger.error({
            error: error.message,
            userId: context.userId,
            patientId: params.patientId,
        }, 'Failed to generate SOAP note');
        throw error;
    }
}
/**
 * Summarize patient history using LLM
 */
async function summarizePatientHistory(params, context) {
    const startTime = Date.now();
    try {
        // Validate required params
        if (!params.patientId || !params.summaryType) {
            throw new Error('patientId and summaryType are required');
        }
        // Check permissions
        const hasPermissions = await (0, rbac_1.hasAllPermissions)(context.userId, READ_PERMISSIONS);
        if (!hasPermissions) {
            const error = `Missing required permissions: ${READ_PERMISSIONS.join(', ')}`;
            await (0, audit_1.logAction)({
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
        await (0, audit_1.logAction)({
            userId: context.userId,
            actionName: 'summarizePatientHistory',
            parameters: params,
            result: { summaryGenerated: true, keyFindingsCount: summary.keyFindings.length },
            permissionsChecked: READ_PERMISSIONS,
            success: true,
            executionTimeMs: Date.now() - startTime,
        });
        logger_1.logger.info({
            userId: context.userId,
            patientId: params.patientId,
            summaryType: params.summaryType,
            executionTimeMs: Date.now() - startTime,
        }, 'Patient history summarized');
        return summary;
    }
    catch (error) {
        await (0, audit_1.logAction)({
            userId: context.userId,
            actionName: 'summarizePatientHistory',
            parameters: params,
            error: error.message,
            permissionsChecked: READ_PERMISSIONS,
            success: false,
            executionTimeMs: Date.now() - startTime,
        });
        logger_1.logger.error({
            error: error.message,
            userId: context.userId,
            patientId: params.patientId,
        }, 'Failed to summarize patient history');
        throw error;
    }
}
/**
 * Save clinical document to database
 */
async function saveDocument(params, context) {
    const startTime = Date.now();
    try {
        // Validate required params
        if (!params.patientId || !params.documentType || !params.content) {
            throw new Error('patientId, documentType, and content are required');
        }
        // Check permissions
        const hasPermissions = await (0, rbac_1.hasAllPermissions)(context.userId, DOCUMENTATION_PERMISSIONS);
        if (!hasPermissions) {
            const error = `Missing required permissions: ${DOCUMENTATION_PERMISSIONS.join(', ')}`;
            await (0, audit_1.logAction)({
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
        const result = await database_1.pgPool.query(`INSERT INTO clinical_documents (
        patient_id, visit_id, document_type, content, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, patient_id, document_type, status, created_at`, [params.patientId, params.visitId || null, params.documentType, JSON.stringify(params.content), status, context.userId]);
        const savedDoc = result.rows[0];
        const response = {
            documentId: savedDoc.id,
            patientId: savedDoc.patient_id,
            documentType: savedDoc.document_type,
            status: savedDoc.status,
            createdAt: savedDoc.created_at,
        };
        // Audit log success
        await (0, audit_1.logAction)({
            userId: context.userId,
            actionName: 'saveDocument',
            parameters: { patientId: params.patientId, documentType: params.documentType },
            result: { documentId: response.documentId, status: response.status },
            permissionsChecked: DOCUMENTATION_PERMISSIONS,
            success: true,
            executionTimeMs: Date.now() - startTime,
        });
        logger_1.logger.info({
            userId: context.userId,
            patientId: params.patientId,
            documentId: response.documentId,
            documentType: params.documentType,
            executionTimeMs: Date.now() - startTime,
        }, 'Clinical document saved');
        return response;
    }
    catch (error) {
        await (0, audit_1.logAction)({
            userId: context.userId,
            actionName: 'saveDocument',
            parameters: { patientId: params.patientId, documentType: params.documentType },
            error: error.message,
            permissionsChecked: DOCUMENTATION_PERMISSIONS,
            success: false,
            executionTimeMs: Date.now() - startTime,
        });
        logger_1.logger.error({
            error: error.message,
            userId: context.userId,
            patientId: params.patientId,
        }, 'Failed to save clinical document');
        throw error;
    }
}
// Helper functions
function buildSoapNotePrompt(params, patient) {
    let prompt = `Generate a SOAP note for the following patient encounter:

Patient: ${patient.first_name} ${patient.last_name}
Chief Complaint: ${params.chiefComplaint}
`;
    if (params.vitalSigns) {
        prompt += '\nVital Signs:\n';
        if (params.vitalSigns.bloodPressure)
            prompt += `- Blood Pressure: ${params.vitalSigns.bloodPressure}\n`;
        if (params.vitalSigns.heartRate)
            prompt += `- Heart Rate: ${params.vitalSigns.heartRate} bpm\n`;
        if (params.vitalSigns.temperature)
            prompt += `- Temperature: ${params.vitalSigns.temperature}F\n`;
        if (params.vitalSigns.respiratoryRate)
            prompt += `- Respiratory Rate: ${params.vitalSigns.respiratoryRate}/min\n`;
        if (params.vitalSigns.oxygenSaturation)
            prompt += `- Oxygen Saturation: ${params.vitalSigns.oxygenSaturation}%\n`;
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
function buildSummaryPrompt(summaryType, historyData) {
    let prompt = `Generate a ${summaryType} summary for the following patient data:\n\n`;
    prompt += JSON.stringify(historyData, null, 2);
    prompt += '\n\nProvide a concise summary with key findings.';
    return prompt;
}
async function callLlmService(prompt, taskType) {
    try {
        const response = await axios_1.default.post(`${env_1.config.llmServiceUrl}/api/generate`, {
            prompt,
            taskType,
            maxTokens: 1500,
            temperature: 0.3,
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data.text || response.data.content || '';
    }
    catch (error) {
        logger_1.logger.error({ error: error.message }, 'LLM service call failed');
        throw new Error(`LLM service error: ${error.message}`);
    }
}
function parseSoapNoteResponse(response) {
    // Default structure if parsing fails
    const defaultNote = {
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
    }
    catch {
        return defaultNote;
    }
}
function extractSection(text, sectionStart, sectionEnd) {
    const startRegex = new RegExp(`${sectionStart}[:\\s]*`, 'i');
    const startMatch = text.match(startRegex);
    if (!startMatch)
        return '';
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
function calculateConfidence(sections) {
    const filledSections = Object.values(sections).filter(s => s.length > 10).length;
    return Math.min(0.95, 0.5 + (filledSections * 0.1));
}
async function fetchPatientHistory(patientId, summaryType, periodDays) {
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
    const result = await database_1.pgPool.query(query, values);
    return result.rows;
}
function parseSummaryResponse(response, params) {
    // Extract key findings (bullet points or numbered items)
    const keyFindings = [];
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
//# sourceMappingURL=clinicalDocumentationAgent.js.map