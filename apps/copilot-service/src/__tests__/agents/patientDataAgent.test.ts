/**
 * Unit Tests for Patient Data Agent
 * Tests patient data retrieval with RBAC, ownership validation, and audit logging
 */

import { getPatientData } from '../../agents/patientDataAgent';
import { ActionContext } from '../../types/medicalCoding';

// Mock external dependencies
jest.mock('../../services/rbac', () => ({
  hasAllPermissions: jest.fn(),
  getUserRoles: jest.fn(),
}));

jest.mock('../../services/backend', () => ({
  backendClient: {
    getPatient: jest.fn(),
    getMedicalRecords: jest.fn(),
    findPatientByUserId: jest.fn(),
  },
}));

jest.mock('../../services/audit', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
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
import { hasAllPermissions, getUserRoles } from '../../services/rbac';
import { backendClient } from '../../services/backend';
import { logAction } from '../../services/audit';
import { logger } from '../../config/logger';

describe('Patient Data Agent', () => {
  // Test fixtures
  const mockPhysicianContext: ActionContext = {
    userId: 'physician-123',
    email: 'doctor@hospital.com',
    role: 'physician',
    permissions: ['patients:read', 'records:read'],
  };

  const mockPatientContext: ActionContext = {
    userId: 'patient-456',
    email: 'patient@email.com',
    role: 'patient',
    permissions: ['own_records:read'],
  };

  const mockPatient = {
    id: 'patient-record-789',
    user_id: 'patient-456',
    medical_record_number: 'MRN-001',
    date_of_birth: '1990-01-15',
    gender: 'M',
    blood_type: 'A+',
    allergies: ['Penicillin'],
    created_at: '2023-01-01T00:00:00Z',
  };

  const mockMedicalRecords = [
    {
      id: 'record-1',
      patient_id: 'patient-record-789',
      record_type: 'consultation',
      diagnosis: 'Common cold',
      notes: 'Rest and fluids recommended',
      created_at: '2024-01-15T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should reject invalid UUID format for patientId', async () => {
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);

      await expect(
        getPatientData({ patientId: 'invalid-uuid', includeRecords: false }, mockPhysicianContext)
      ).rejects.toThrow('Invalid patientId format - must be a valid UUID');
    });

    it('should accept valid UUID format for patientId', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      await expect(
        getPatientData({ patientId: validUUID, includeRecords: false }, mockPhysicianContext)
      ).resolves.toBeDefined();
    });

    it('should require patientId for non-patient roles', async () => {
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);

      await expect(
        getPatientData({ includeRecords: false }, mockPhysicianContext)
      ).rejects.toThrow('patientId is required for non-patient roles');
    });
  });

  describe('Permission Checks', () => {
    it('should check patients:read and records:read permissions', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      await getPatientData({ patientId: validUUID, includeRecords: false }, mockPhysicianContext);

      expect(hasAllPermissions).toHaveBeenCalledWith(
        mockPhysicianContext.userId,
        ['patients:read', 'records:read']
      );
    });

    it('should throw error when user lacks required permissions', async () => {
      (hasAllPermissions as jest.Mock).mockResolvedValue(false);

      await expect(
        getPatientData({ patientId: '550e8400-e29b-41d4-a716-446655440000', includeRecords: false }, mockPhysicianContext)
      ).rejects.toThrow('Missing required permissions: patients:read, records:read');
    });

    it('should log audit entry when permission check fails', async () => {
      (hasAllPermissions as jest.Mock).mockResolvedValue(false);

      await expect(
        getPatientData({ patientId: '550e8400-e29b-41d4-a716-446655440000', includeRecords: false }, mockPhysicianContext)
      ).rejects.toThrow();

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockPhysicianContext.userId,
          actionName: 'getPatientData',
          success: false,
          error: expect.stringContaining('Missing required permissions'),
        })
      );
    });
  });

  describe('Patient Role Ownership Validation', () => {
    it('should allow patient to access their own data without specifying patientId', async () => {
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['patient']);
      (backendClient.findPatientByUserId as jest.Mock).mockResolvedValue(mockPatient);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      const result = await getPatientData(
        { includeRecords: false },
        mockPatientContext
      );

      expect(result.patient).toBeDefined();
      expect(backendClient.findPatientByUserId).toHaveBeenCalledWith(
        mockPatientContext.userId,
        undefined
      );
    });

    it('should allow patient to access their own data when specifying their patientId', async () => {
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['patient']);
      (backendClient.findPatientByUserId as jest.Mock).mockResolvedValue(mockPatient);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      const result = await getPatientData(
        { patientId: mockPatient.id, includeRecords: false },
        mockPatientContext
      );

      expect(result.patient.id).toBe(mockPatient.id);
    });

    it('should deny patient access to other patients data', async () => {
      const otherPatientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['patient']);
      (backendClient.findPatientByUserId as jest.Mock).mockResolvedValue(mockPatient);

      await expect(
        getPatientData({ patientId: otherPatientId, includeRecords: false }, mockPatientContext)
      ).rejects.toThrow('Patients can only access their own data');
    });

    it('should deny access when patient has no linked patient record', async () => {
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['patient']);
      (backendClient.findPatientByUserId as jest.Mock).mockResolvedValue(null);

      await expect(
        getPatientData({ includeRecords: false }, mockPatientContext)
      ).rejects.toThrow('No patient record found for this user');
    });
  });

  describe('Non-Patient Role Access', () => {
    it('should allow physician to access any patient data', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      const result = await getPatientData(
        { patientId, includeRecords: false },
        mockPhysicianContext
      );

      expect(result.patient).toBeDefined();
      expect(backendClient.findPatientByUserId).not.toHaveBeenCalled();
    });

    it('should allow nurse to access any patient data', async () => {
      const nurseContext: ActionContext = {
        userId: 'nurse-123',
        email: 'nurse@hospital.com',
        role: 'nurse',
        permissions: ['patients:read', 'records:read'],
      };
      const patientId = '550e8400-e29b-41d4-a716-446655440000';

      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['nurse']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      const result = await getPatientData(
        { patientId, includeRecords: false },
        nurseContext
      );

      expect(result.patient).toBeDefined();
    });
  });

  describe('Medical Records Retrieval', () => {
    it('should include medical records when includeRecords is true', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);
      (backendClient.getMedicalRecords as jest.Mock).mockResolvedValue(mockMedicalRecords);

      const result = await getPatientData(
        { patientId, includeRecords: true },
        mockPhysicianContext
      );

      expect(result.medicalRecords).toEqual(mockMedicalRecords);
      expect(backendClient.getMedicalRecords).toHaveBeenCalledWith(patientId);
    });

    it('should not include medical records when includeRecords is false', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      const result = await getPatientData(
        { patientId, includeRecords: false },
        mockPhysicianContext
      );

      expect(result.medicalRecords).toBeUndefined();
      expect(backendClient.getMedicalRecords).not.toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    it('should log successful patient data retrieval', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      await getPatientData({ patientId, includeRecords: false }, mockPhysicianContext);

      // Allow for async audit logging
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockPhysicianContext.userId,
          actionName: 'getPatientData',
          parameters: expect.objectContaining({ patientId }),
          success: true,
        })
      );
    });

    it('should log access denial for ownership violations', async () => {
      const otherPatientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['patient']);
      (backendClient.findPatientByUserId as jest.Mock).mockResolvedValue(mockPatient);

      await expect(
        getPatientData({ patientId: otherPatientId, includeRecords: false }, mockPatientContext)
      ).rejects.toThrow();

      // Allow for async audit logging
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockPatientContext.userId,
          actionName: 'getPatientData',
          success: false,
        })
      );
    });

    it('should include isOwnData flag in audit for patient self-access', async () => {
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['patient']);
      (backendClient.findPatientByUserId as jest.Mock).mockResolvedValue(mockPatient);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      await getPatientData({ includeRecords: false }, mockPatientContext);

      // Allow for async audit logging
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            isOwnData: true,
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle backend service errors gracefully', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockRejectedValue(
        new Error('Backend service unavailable')
      );

      await expect(
        getPatientData({ patientId, includeRecords: false }, mockPhysicianContext)
      ).rejects.toThrow('Backend service unavailable');
    });

    it('should log errors with context information', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      await expect(
        getPatientData({ patientId, includeRecords: false }, mockPhysicianContext)
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Connection timeout',
          userId: mockPhysicianContext.userId,
          patientId,
        }),
        'getPatientData failed'
      );
    });
  });

  describe('Response Structure', () => {
    it('should include accessedAt timestamp in response', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      const result = await getPatientData(
        { patientId, includeRecords: false },
        mockPhysicianContext
      );

      expect(result.accessedAt).toBeDefined();
      expect(new Date(result.accessedAt).toISOString()).toBe(result.accessedAt);
    });

    it('should return complete patient object', async () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      (hasAllPermissions as jest.Mock).mockResolvedValue(true);
      (getUserRoles as jest.Mock).mockResolvedValue(['physician']);
      (backendClient.getPatient as jest.Mock).mockResolvedValue(mockPatient);

      const result = await getPatientData(
        { patientId, includeRecords: false },
        mockPhysicianContext
      );

      expect(result.patient).toMatchObject({
        id: mockPatient.id,
        user_id: mockPatient.user_id,
        medical_record_number: mockPatient.medical_record_number,
        date_of_birth: mockPatient.date_of_birth,
        gender: mockPatient.gender,
        blood_type: mockPatient.blood_type,
        allergies: mockPatient.allergies,
      });
    });
  });
});
