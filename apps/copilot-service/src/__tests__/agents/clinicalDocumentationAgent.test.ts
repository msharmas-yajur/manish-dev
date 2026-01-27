/**
 * Unit Tests for Clinical Documentation Agent
 * Tests SOAP note generation, patient history summarization, and document saving
 */

import {
  generateSoapNote,
  summarizePatientHistory,
  saveDocument,
} from '../../agents/clinicalDocumentationAgent';
import { ActionContext } from '../../types/medicalCoding';

// Mock external dependencies
jest.mock('../../services/rbac', () => ({
  hasAllPermissions: jest.fn(),
  hasAnyRole: jest.fn(),
}));

jest.mock('../../services/audit', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../config/database', () => ({
  pgPool: {
    query: jest.fn(),
  },
}));

jest.mock('axios');

jest.mock('../../config/env', () => ({
  config: {
    llmServiceUrl: 'http://localhost:8003',
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import mocked modules
import { hasAllPermissions } from '../../services/rbac';
import { logAction } from '../../services/audit';
import { pgPool } from '../../config/database';
import { logger } from '../../config/logger';
import axios from 'axios';

describe('Clinical Documentation Agent', () => {
  // Test fixtures
  const mockPhysicianContext: ActionContext = {
    userId: 'physician-123',
    email: 'doctor@hospital.com',
    role: 'physician',
    permissions: ['records:create', 'records:update', 'records:read', 'llm:use'],
  };

  const mockPatientData = {
    id: 'patient-456',
    first_name: 'John',
    last_name: 'Doe',
  };

  const mockLlmResponse = {
    data: {
      text: `Subjective: Patient presents with headache for 3 days.
Objective: Vital signs stable. BP 120/80.
Assessment: Tension headache.
Plan: Prescribe ibuprofen, recommend rest.`,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.post as jest.Mock).mockResolvedValue(mockLlmResponse);
  });

  describe('generateSoapNote', () => {
    const validParams = {
      patientId: 'patient-456',
      visitId: 'visit-789',
      chiefComplaint: 'Headache for 3 days',
      vitalSigns: {
        bloodPressure: '120/80',
        heartRate: 72,
      },
      symptoms: ['headache', 'fatigue'],
    };

    describe('Parameter Validation', () => {
      it('should throw error when patientId is missing', async () => {
        const params = { ...validParams, patientId: '' };

        await expect(
          generateSoapNote(params, mockPhysicianContext)
        ).rejects.toThrow('patientId, visitId, and chiefComplaint are required');
      });

      it('should throw error when visitId is missing', async () => {
        const params = { ...validParams, visitId: '' };

        await expect(
          generateSoapNote(params, mockPhysicianContext)
        ).rejects.toThrow('patientId, visitId, and chiefComplaint are required');
      });

      it('should throw error when chiefComplaint is missing', async () => {
        const params = { ...validParams, chiefComplaint: '' };

        await expect(
          generateSoapNote(params, mockPhysicianContext)
        ).rejects.toThrow('patientId, visitId, and chiefComplaint are required');
      });
    });

    describe('Permission Checks', () => {
      it('should require records:create, records:update, and llm:use permissions', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });

        await generateSoapNote(validParams, mockPhysicianContext);

        expect(hasAllPermissions).toHaveBeenCalledWith(
          mockPhysicianContext.userId,
          ['records:create', 'records:update', 'llm:use']
        );
      });

      it('should throw error when user lacks required permissions', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(false);

        await expect(
          generateSoapNote(validParams, mockPhysicianContext)
        ).rejects.toThrow('Missing required permissions: records:create, records:update, llm:use');
      });

      it('should log audit entry when permission check fails', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(false);

        await expect(
          generateSoapNote(validParams, mockPhysicianContext)
        ).rejects.toThrow();

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockPhysicianContext.userId,
            actionName: 'generateSoapNote',
            success: false,
          })
        );
      });
    });

    describe('Patient Verification', () => {
      it('should verify patient exists before generating note', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        await expect(
          generateSoapNote(validParams, mockPhysicianContext)
        ).rejects.toThrow('Patient not found: patient-456');
      });

      it('should query database with patient ID', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });

        await generateSoapNote(validParams, mockPhysicianContext);

        expect(pgPool.query).toHaveBeenCalledWith(
          'SELECT id, first_name, last_name FROM patients WHERE id = $1',
          ['patient-456']
        );
      });
    });

    describe('LLM Integration', () => {
      it('should call LLM service with constructed prompt', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });

        await generateSoapNote(validParams, mockPhysicianContext);

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:8003/api/generate',
          expect.objectContaining({
            taskType: 'soap_note',
            maxTokens: 1500,
            temperature: 0.3,
          }),
          expect.any(Object)
        );
      });

      it('should include vital signs in prompt when provided', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });

        await generateSoapNote(validParams, mockPhysicianContext);

        const callArgs = (axios.post as jest.Mock).mock.calls[0];
        const prompt = callArgs[1].prompt;

        expect(prompt).toContain('Blood Pressure: 120/80');
        expect(prompt).toContain('Heart Rate: 72');
      });

      it('should include symptoms in prompt when provided', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });

        await generateSoapNote(validParams, mockPhysicianContext);

        const callArgs = (axios.post as jest.Mock).mock.calls[0];
        const prompt = callArgs[1].prompt;

        expect(prompt).toContain('headache, fatigue');
      });

      it('should handle LLM service errors', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });
        (axios.post as jest.Mock).mockRejectedValue(new Error('LLM service timeout'));

        await expect(
          generateSoapNote(validParams, mockPhysicianContext)
        ).rejects.toThrow('LLM service error: LLM service timeout');
      });
    });

    describe('Response Parsing', () => {
      it('should parse SOAP note sections from LLM response', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });

        const result = await generateSoapNote(validParams, mockPhysicianContext);

        expect(result.note).toHaveProperty('subjective');
        expect(result.note).toHaveProperty('objective');
        expect(result.note).toHaveProperty('assessment');
        expect(result.note).toHaveProperty('plan');
        expect(result.note).toHaveProperty('generatedAt');
        expect(result.note).toHaveProperty('confidence');
      });

      it('should include metadata in response', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });

        const result = await generateSoapNote(validParams, mockPhysicianContext);

        expect(result.metadata).toHaveProperty('model');
        expect(result.metadata).toHaveProperty('executionTimeMs');
        expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Audit Logging', () => {
      it('should log successful SOAP note generation', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockPatientData] });

        await generateSoapNote(validParams, mockPhysicianContext);

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockPhysicianContext.userId,
            actionName: 'generateSoapNote',
            parameters: expect.objectContaining({
              patientId: 'patient-456',
              visitId: 'visit-789',
            }),
            success: true,
          })
        );
      });

      it('should log failed SOAP note generation', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        await expect(
          generateSoapNote(validParams, mockPhysicianContext)
        ).rejects.toThrow();

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionName: 'generateSoapNote',
            success: false,
            error: expect.stringContaining('Patient not found'),
          })
        );
      });
    });
  });

  describe('summarizePatientHistory', () => {
    const validParams = {
      patientId: 'patient-456',
      summaryType: 'comprehensive' as const,
      periodDays: 365,
    };

    const mockHistoryRecords = [
      { id: '1', record_type: 'diagnosis', data: { diagnosis: 'Hypertension' } },
      { id: '2', record_type: 'medication', data: { medication: 'Lisinopril' } },
    ];

    beforeEach(() => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          text: `Summary of patient history:
- Diagnosed with Hypertension
- Currently taking Lisinopril`,
        },
      });
    });

    describe('Parameter Validation', () => {
      it('should throw error when patientId is missing', async () => {
        const params = { ...validParams, patientId: '' };

        await expect(
          summarizePatientHistory(params as any, mockPhysicianContext)
        ).rejects.toThrow('patientId and summaryType are required');
      });

      it('should throw error when summaryType is missing', async () => {
        const params = { patientId: 'patient-456', periodDays: 365 };

        await expect(
          summarizePatientHistory(params as any, mockPhysicianContext)
        ).rejects.toThrow('patientId and summaryType are required');
      });
    });

    describe('Permission Checks', () => {
      it('should require records:read and llm:use permissions', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockHistoryRecords });

        await summarizePatientHistory(validParams, mockPhysicianContext);

        expect(hasAllPermissions).toHaveBeenCalledWith(
          mockPhysicianContext.userId,
          ['records:read', 'llm:use']
        );
      });

      it('should throw error when user lacks required permissions', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(false);

        await expect(
          summarizePatientHistory(validParams, mockPhysicianContext)
        ).rejects.toThrow('Missing required permissions: records:read, llm:use');
      });
    });

    describe('History Fetching', () => {
      it('should fetch patient history from database', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockHistoryRecords });

        await summarizePatientHistory(validParams, mockPhysicianContext);

        expect(pgPool.query).toHaveBeenCalled();
      });

      it('should use default period of 365 days when not specified', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockHistoryRecords });

        const params = { patientId: 'patient-456', summaryType: 'recent' as const };
        await summarizePatientHistory(params, mockPhysicianContext);

        expect(pgPool.query).toHaveBeenCalled();
      });

      it('should filter by record type for medications summary', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

        const params = { patientId: 'patient-456', summaryType: 'medications' as const };
        await summarizePatientHistory(params, mockPhysicianContext);

        const queryCall = (pgPool.query as jest.Mock).mock.calls[0];
        expect(queryCall[0]).toContain("record_type = 'medication'");
      });
    });

    describe('Response Structure', () => {
      it('should return summary with key findings', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockHistoryRecords });

        const result = await summarizePatientHistory(validParams, mockPhysicianContext);

        expect(result).toHaveProperty('patientId');
        expect(result).toHaveProperty('summaryType');
        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('keyFindings');
        expect(result).toHaveProperty('generatedAt');
      });

      it('should extract key findings from bullet points', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockHistoryRecords });

        const result = await summarizePatientHistory(validParams, mockPhysicianContext);

        expect(result.keyFindings.length).toBeGreaterThan(0);
      });
    });

    describe('Audit Logging', () => {
      it('should log successful history summarization', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockHistoryRecords });

        await summarizePatientHistory(validParams, mockPhysicianContext);

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionName: 'summarizePatientHistory',
            success: true,
            result: expect.objectContaining({
              summaryGenerated: true,
            }),
          })
        );
      });
    });
  });

  describe('saveDocument', () => {
    const validParams = {
      patientId: 'patient-456',
      visitId: 'visit-789',
      documentType: 'soap_note' as const,
      content: { subjective: 'Test', objective: 'Test', assessment: 'Test', plan: 'Test' },
      status: 'draft' as const,
    };

    const mockSavedDoc = {
      id: 'doc-123',
      patient_id: 'patient-456',
      document_type: 'soap_note',
      status: 'draft',
      created_at: '2024-01-15T10:00:00Z',
    };

    beforeEach(() => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [mockSavedDoc] });
    });

    describe('Parameter Validation', () => {
      it('should throw error when patientId is missing', async () => {
        const params = { ...validParams, patientId: '' };

        await expect(
          saveDocument(params as any, mockPhysicianContext)
        ).rejects.toThrow('patientId, documentType, and content are required');
      });

      it('should throw error when documentType is missing', async () => {
        const params = { ...validParams, documentType: '' };

        await expect(
          saveDocument(params as any, mockPhysicianContext)
        ).rejects.toThrow('patientId, documentType, and content are required');
      });

      it('should throw error when content is missing', async () => {
        const params = { ...validParams, content: null };

        await expect(
          saveDocument(params as any, mockPhysicianContext)
        ).rejects.toThrow('patientId, documentType, and content are required');
      });
    });

    describe('Permission Checks', () => {
      it('should require records:create, records:update, and llm:use permissions', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);

        await saveDocument(validParams, mockPhysicianContext);

        expect(hasAllPermissions).toHaveBeenCalledWith(
          mockPhysicianContext.userId,
          ['records:create', 'records:update', 'llm:use']
        );
      });

      it('should throw error when user lacks required permissions', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(false);

        await expect(
          saveDocument(validParams, mockPhysicianContext)
        ).rejects.toThrow('Missing required permissions: records:create, records:update, llm:use');
      });
    });

    describe('Document Persistence', () => {
      it('should insert document into database', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);

        await saveDocument(validParams, mockPhysicianContext);

        expect(pgPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO clinical_documents'),
          expect.arrayContaining([
            validParams.patientId,
            validParams.visitId,
            validParams.documentType,
            JSON.stringify(validParams.content),
            validParams.status,
            mockPhysicianContext.userId,
          ])
        );
      });

      it('should use draft status when not specified', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);

        const params = { ...validParams };
        delete (params as any).status;

        await saveDocument(params, mockPhysicianContext);

        const queryCall = (pgPool.query as jest.Mock).mock.calls[0];
        expect(queryCall[1]).toContain('draft');
      });

      it('should handle database errors', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

        await expect(
          saveDocument(validParams, mockPhysicianContext)
        ).rejects.toThrow('Database connection lost');
      });
    });

    describe('Response Structure', () => {
      it('should return saved document information', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);

        const result = await saveDocument(validParams, mockPhysicianContext);

        expect(result).toEqual({
          documentId: mockSavedDoc.id,
          patientId: mockSavedDoc.patient_id,
          documentType: mockSavedDoc.document_type,
          status: mockSavedDoc.status,
          createdAt: mockSavedDoc.created_at,
        });
      });
    });

    describe('Audit Logging', () => {
      it('should log successful document save', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);

        await saveDocument(validParams, mockPhysicianContext);

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionName: 'saveDocument',
            success: true,
            result: expect.objectContaining({
              documentId: mockSavedDoc.id,
              status: 'draft',
            }),
          })
        );
      });

      it('should log failed document save', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (pgPool.query as jest.Mock).mockRejectedValue(new Error('Insert failed'));

        await expect(
          saveDocument(validParams, mockPhysicianContext)
        ).rejects.toThrow();

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            actionName: 'saveDocument',
            success: false,
            error: 'Insert failed',
          })
        );
      });
    });
  });
});
