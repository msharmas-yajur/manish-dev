/**
 * Unit Tests for Audit Service
 * Tests audit logging functionality for copilot actions
 */

// Mock database module before importing
jest.mock('../../config/database', () => ({
  pgPool: {
    query: jest.fn(),
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

import { logAction, getRecentActions } from '../../services/audit';
import { pgPool } from '../../config/database';
import { logger } from '../../config/logger';
import { ActionAuditLog } from '../../types/medicalCoding';

describe('Audit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    const mockSuccessfulAudit: ActionAuditLog = {
      userId: 'user-123',
      actionName: 'searchMedicalCodes',
      parameters: { searchTerm: 'diabetes', limit: 10 },
      result: { count: 5, total: 100 },
      permissionsChecked: ['llm:use', 'records:read'],
      success: true,
      executionTimeMs: 150,
    };

    const mockFailedAudit: ActionAuditLog = {
      userId: 'user-456',
      actionName: 'getPatientData',
      parameters: { patientId: 'patient-789' },
      error: 'Permission denied',
      permissionsChecked: ['patients:read', 'records:read'],
      success: false,
      executionTimeMs: 50,
    };

    it('should insert audit log into database', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await logAction(mockSuccessfulAudit);

      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO copilot_action_audit'),
        expect.arrayContaining([
          mockSuccessfulAudit.userId,
          mockSuccessfulAudit.actionName,
          JSON.stringify(mockSuccessfulAudit.parameters),
          JSON.stringify(mockSuccessfulAudit.result),
          null, // no error
          mockSuccessfulAudit.permissionsChecked,
          mockSuccessfulAudit.success,
          mockSuccessfulAudit.executionTimeMs,
        ])
      );
    });

    it('should stringify parameters as JSON', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await logAction(mockSuccessfulAudit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[2]).toBe(JSON.stringify(mockSuccessfulAudit.parameters));
    });

    it('should stringify result as JSON when present', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await logAction(mockSuccessfulAudit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[3]).toBe(JSON.stringify(mockSuccessfulAudit.result));
    });

    it('should store null for result when not provided', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await logAction(mockFailedAudit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[3]).toBeNull();
    });

    it('should store error message when provided', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await logAction(mockFailedAudit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[4]).toBe('Permission denied');
    });

    it('should store null for error when not provided', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await logAction(mockSuccessfulAudit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[4]).toBeNull();
    });

    it('should log debug message on successful insert', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await logAction(mockSuccessfulAudit);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          userId: mockSuccessfulAudit.userId,
          action: mockSuccessfulAudit.actionName,
          success: mockSuccessfulAudit.success,
        },
        'Action logged to audit trail'
      );
    });

    it('should not throw on database error (non-blocking)', async () => {
      (pgPool.query as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

      await expect(logAction(mockSuccessfulAudit)).resolves.not.toThrow();
    });

    it('should log error when database insert fails', async () => {
      const dbError = new Error('Insert failed');
      (pgPool.query as jest.Mock).mockRejectedValue(dbError);

      await logAction(mockSuccessfulAudit);

      expect(logger.error).toHaveBeenCalledWith(
        {
          error: 'Insert failed',
          audit: mockSuccessfulAudit,
        },
        'Failed to log action to audit trail'
      );
    });

    it('should handle complex parameters with nested objects', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const complexAudit: ActionAuditLog = {
        ...mockSuccessfulAudit,
        parameters: {
          patient: { id: '123', name: 'John Doe' },
          filters: { startDate: '2024-01-01', endDate: '2024-12-31' },
          nested: { level1: { level2: { value: 'deep' } } },
        },
      };

      await logAction(complexAudit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(JSON.parse(insertCall[2])).toEqual(complexAudit.parameters);
    });

    it('should handle empty parameters', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const auditWithEmptyParams: ActionAuditLog = {
        ...mockSuccessfulAudit,
        parameters: {},
      };

      await logAction(auditWithEmptyParams);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[2]).toBe('{}');
    });

    it('should handle array in permissions checked', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await logAction(mockSuccessfulAudit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[5]).toEqual(['llm:use', 'records:read']);
    });

    it('should store execution time in milliseconds', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const auditWithLongExecution: ActionAuditLog = {
        ...mockSuccessfulAudit,
        executionTimeMs: 5000,
      };

      await logAction(auditWithLongExecution);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[7]).toBe(5000);
    });
  });

  describe('getRecentActions', () => {
    const mockUserId = 'user-123';

    const mockAuditRows = [
      {
        id: 'audit-1',
        action_name: 'searchMedicalCodes',
        parameters: { searchTerm: 'diabetes' },
        result: { count: 5 },
        success: true,
        execution_time_ms: 150,
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'audit-2',
        action_name: 'getPatientData',
        parameters: { patientId: 'patient-123' },
        result: null,
        success: false,
        execution_time_ms: 50,
        created_at: '2024-01-15T09:00:00Z',
      },
    ];

    it('should return recent audit logs for user', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: mockAuditRows });

      const result = await getRecentActions(mockUserId);

      expect(result).toEqual(mockAuditRows);
    });

    it('should query with user ID and default limit', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getRecentActions(mockUserId);

      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [mockUserId, 10]
      );
    });

    it('should use custom limit when provided', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getRecentActions(mockUserId, 25);

      expect(pgPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [mockUserId, 25]
      );
    });

    it('should order by created_at descending', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getRecentActions(mockUserId);

      const queryCall = (pgPool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('ORDER BY created_at DESC');
    });

    it('should return empty array on database error', async () => {
      (pgPool.query as jest.Mock).mockRejectedValue(new Error('Query failed'));

      const result = await getRecentActions(mockUserId);

      expect(result).toEqual([]);
    });

    it('should log error when query fails', async () => {
      (pgPool.query as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

      await getRecentActions(mockUserId);

      expect(logger.error).toHaveBeenCalledWith(
        { error: 'Connection timeout', userId: mockUserId },
        'Failed to fetch audit logs'
      );
    });

    it('should include all required fields in query', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getRecentActions(mockUserId);

      const queryCall = (pgPool.query as jest.Mock).mock.calls[0][0];
      expect(queryCall).toContain('id');
      expect(queryCall).toContain('action_name');
      expect(queryCall).toContain('parameters');
      expect(queryCall).toContain('result');
      expect(queryCall).toContain('success');
      expect(queryCall).toContain('execution_time_ms');
      expect(queryCall).toContain('created_at');
    });
  });

  describe('Audit Log Data Integrity', () => {
    it('should properly handle special characters in parameters', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const auditWithSpecialChars: ActionAuditLog = {
        userId: 'user-123',
        actionName: 'searchMedicalCodes',
        parameters: {
          searchTerm: "Crohn's disease with \"quotes\" and <html>",
          notes: 'Line1\nLine2\tTabbed',
        },
        permissionsChecked: ['llm:use'],
        success: true,
        executionTimeMs: 100,
      };

      await logAction(auditWithSpecialChars);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      const parsedParams = JSON.parse(insertCall[2]);
      expect(parsedParams.searchTerm).toBe("Crohn's disease with \"quotes\" and <html>");
      expect(parsedParams.notes).toBe('Line1\nLine2\tTabbed');
    });

    it('should handle very long action names', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const longActionName = 'a'.repeat(500);
      const audit: ActionAuditLog = {
        userId: 'user-123',
        actionName: longActionName,
        parameters: {},
        permissionsChecked: [],
        success: true,
        executionTimeMs: 100,
      };

      await logAction(audit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      expect(insertCall[1]).toBe(longActionName);
    });

    it('should handle unicode in parameters', async () => {
      (pgPool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const audit: ActionAuditLog = {
        userId: 'user-123',
        actionName: 'searchMedicalCodes',
        parameters: { diagnosis: 'Caf\u00e9 au lait spots - \u65e5\u672c\u8a9e' },
        permissionsChecked: [],
        success: true,
        executionTimeMs: 100,
      };

      await logAction(audit);

      const insertCall = (pgPool.query as jest.Mock).mock.calls[0][1];
      const parsedParams = JSON.parse(insertCall[2]);
      expect(parsedParams.diagnosis).toContain('Caf\u00e9');
    });
  });
});
