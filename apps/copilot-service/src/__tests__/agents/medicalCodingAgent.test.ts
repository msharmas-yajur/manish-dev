/**
 * Unit Tests for Medical Coding Agent
 * Tests SNOMED code search functionality with RBAC and audit logging
 */

import { searchMedicalCodes } from '../../agents/medicalCodingAgent';
import { ActionContext } from '../../types/medicalCoding';

// Mock external dependencies
jest.mock('../../services/rbac', () => ({
  hasAllPermissions: jest.fn(),
}));

jest.mock('../../services/snowstorm', () => ({
  snowstormClient: {
    searchConcepts: jest.fn(),
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
import { hasAllPermissions } from '../../services/rbac';
import { snowstormClient } from '../../services/snowstorm';
import { logAction } from '../../services/audit';
import { logger } from '../../config/logger';

describe('Medical Coding Agent', () => {
  // Test context setup
  const mockContext: ActionContext = {
    userId: 'user-123',
    email: 'doctor@hospital.com',
    role: 'physician',
    permissions: ['llm:use', 'records:read'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchMedicalCodes', () => {
    describe('Parameter Validation', () => {
      it('should throw error when searchTerm is missing', async () => {
        await expect(
          searchMedicalCodes({ searchTerm: '' }, mockContext)
        ).rejects.toThrow('searchTerm is required');
      });

      it('should throw error when searchTerm is whitespace only', async () => {
        await expect(
          searchMedicalCodes({ searchTerm: '   ' }, mockContext)
        ).rejects.toThrow('searchTerm is required');
      });

      it('should use default limit when not specified', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [],
          total: 0,
        });

        await searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext);

        expect(snowstormClient.searchConcepts).toHaveBeenCalledWith('diabetes', 10);
      });

      it('should cap limit at MAX_LIMIT (50)', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [],
          total: 0,
        });

        await searchMedicalCodes({ searchTerm: 'diabetes', limit: 100 }, mockContext);

        expect(snowstormClient.searchConcepts).toHaveBeenCalledWith('diabetes', 50);
      });
    });

    describe('Permission Checks', () => {
      it('should check required permissions (llm:use, records:read)', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [],
          total: 0,
        });

        await searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext);

        expect(hasAllPermissions).toHaveBeenCalledWith(
          mockContext.userId,
          ['llm:use', 'records:read']
        );
      });

      it('should throw error when user lacks required permissions', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(false);

        await expect(
          searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext)
        ).rejects.toThrow('Missing required permissions: llm:use, records:read');
      });

      it('should log audit entry when permission check fails', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(false);

        await expect(
          searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext)
        ).rejects.toThrow();

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockContext.userId,
            actionName: 'searchMedicalCodes',
            success: false,
            error: expect.stringContaining('Missing required permissions'),
          })
        );
      });
    });

    describe('Snowstorm Integration', () => {
      const mockSnomedResults = {
        items: [
          {
            conceptId: '73211009',
            term: 'Diabetes mellitus',
            fsn: 'Diabetes mellitus (disorder)',
            definitionStatus: 'FULLY_DEFINED',
          },
          {
            conceptId: '46635009',
            term: 'Diabetes mellitus type 1',
            fsn: 'Type 1 diabetes mellitus (disorder)',
            definitionStatus: 'FULLY_DEFINED',
          },
        ],
        total: 2,
      };

      it('should return formatted search results', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue(mockSnomedResults);

        const result = await searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext);

        expect(result).toEqual({
          codes: mockSnomedResults.items,
          total: 2,
          searchTerm: 'diabetes',
        });
      });

      it('should handle empty search results', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [],
          total: 0,
        });

        const result = await searchMedicalCodes(
          { searchTerm: 'nonexistent-code-xyz' },
          mockContext
        );

        expect(result.codes).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it('should propagate Snowstorm service errors', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockRejectedValue(
          new Error('Snowstorm service unavailable')
        );

        await expect(
          searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext)
        ).rejects.toThrow('Snowstorm service unavailable');
      });
    });

    describe('Audit Logging', () => {
      it('should log successful searches', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [{ conceptId: '123', term: 'Test' }],
          total: 1,
        });

        await searchMedicalCodes({ searchTerm: 'test' }, mockContext);

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockContext.userId,
            actionName: 'searchMedicalCodes',
            parameters: { searchTerm: 'test' },
            result: { count: 1, total: 1 },
            permissionsChecked: ['llm:use', 'records:read'],
            success: true,
            executionTimeMs: expect.any(Number),
          })
        );
      });

      it('should log failed searches with error message', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockRejectedValue(
          new Error('Service timeout')
        );

        await expect(
          searchMedicalCodes({ searchTerm: 'test' }, mockContext)
        ).rejects.toThrow();

        expect(logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockContext.userId,
            actionName: 'searchMedicalCodes',
            error: 'Service timeout',
            success: false,
          })
        );
      });

      it('should include execution time in audit log', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ items: [], total: 0 }), 50))
        );

        await searchMedicalCodes({ searchTerm: 'test' }, mockContext);

        const auditCall = (logAction as jest.Mock).mock.calls[0][0];
        expect(auditCall.executionTimeMs).toBeGreaterThanOrEqual(50);
      });
    });

    describe('Logging', () => {
      it('should log debug info when checking permissions', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [],
          total: 0,
        });

        await searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext);

        expect(logger.debug).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockContext.userId,
            permissions: ['llm:use', 'records:read'],
          }),
          'Checking permissions'
        );
      });

      it('should log info when search is initiated', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [],
          total: 0,
        });

        await searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext);

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: 'diabetes',
            limit: 10,
          }),
          'Searching SNOMED concepts'
        );
      });

      it('should log error when search fails', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockRejectedValue(
          new Error('Connection refused')
        );

        await expect(
          searchMedicalCodes({ searchTerm: 'test' }, mockContext)
        ).rejects.toThrow();

        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Connection refused',
            userId: mockContext.userId,
            searchTerm: 'test',
          }),
          'Medical code search failed'
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle special characters in search term', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [],
          total: 0,
        });

        await searchMedicalCodes({ searchTerm: "Crohn's disease" }, mockContext);

        expect(snowstormClient.searchConcepts).toHaveBeenCalledWith("Crohn's disease", 10);
      });

      it('should handle numeric codes in search term', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [{ conceptId: '73211009', term: 'Diabetes mellitus' }],
          total: 1,
        });

        await searchMedicalCodes({ searchTerm: '73211009' }, mockContext);

        expect(snowstormClient.searchConcepts).toHaveBeenCalledWith('73211009', 10);
      });

      it('should handle concurrent requests', async () => {
        (hasAllPermissions as jest.Mock).mockResolvedValue(true);
        (snowstormClient.searchConcepts as jest.Mock).mockResolvedValue({
          items: [],
          total: 0,
        });

        const requests = [
          searchMedicalCodes({ searchTerm: 'diabetes' }, mockContext),
          searchMedicalCodes({ searchTerm: 'hypertension' }, mockContext),
          searchMedicalCodes({ searchTerm: 'asthma' }, mockContext),
        ];

        await expect(Promise.all(requests)).resolves.toHaveLength(3);
      });
    });
  });
});
