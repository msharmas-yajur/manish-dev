import { AuthenticatedRequest } from '../middleware/auth';
import { hasAllPermissions } from '../services/rbac';
import { snowstormClient } from '../services/snowstorm';
import { logAction } from '../services/audit';
import { logger } from '../config/logger';
import {
  MedicalCodeSearchParams,
  MedicalCodeSearchResult,
  ActionContext
} from '../types/medicalCoding';

const REQUIRED_PERMISSIONS = ['llm:use', 'records:read'];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

export async function searchMedicalCodes(
  params: MedicalCodeSearchParams,
  context: ActionContext
): Promise<MedicalCodeSearchResult> {
  const startTime = Date.now();

  try {
    // 1. Validate parameters
    if (!params.searchTerm || params.searchTerm.trim().length === 0) {
      throw new Error('searchTerm is required');
    }

    const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);

    // 2. Check permissions
    logger.debug({ userId: context.userId, permissions: REQUIRED_PERMISSIONS }, 'Checking permissions');

    const hasPermissions = await hasAllPermissions(
      context.userId,
      REQUIRED_PERMISSIONS
    );

    if (!hasPermissions) {
      const error = `Missing required permissions: ${REQUIRED_PERMISSIONS.join(', ')}`;
      await logAction({
        userId: context.userId,
        actionName: 'searchMedicalCodes',
        parameters: params,
        error,
        permissionsChecked: REQUIRED_PERMISSIONS,
        success: false,
        executionTimeMs: Date.now() - startTime,
      });
      throw new Error(error);
    }

    // 3. Search SNOMED concepts
    logger.info({ searchTerm: params.searchTerm, limit }, 'Searching SNOMED concepts');

    const result = await snowstormClient.searchConcepts(
      params.searchTerm,
      limit
    );

    // 4. Format response
    const response: MedicalCodeSearchResult = {
      codes: result.items,
      total: result.total,
      searchTerm: params.searchTerm,
    };

    // 5. Audit log success
    await logAction({
      userId: context.userId,
      actionName: 'searchMedicalCodes',
      parameters: params,
      result: { count: result.items.length, total: result.total },
      permissionsChecked: REQUIRED_PERMISSIONS,
      success: true,
      executionTimeMs: Date.now() - startTime,
    });

    logger.info(
      {
        userId: context.userId,
        searchTerm: params.searchTerm,
        resultCount: result.items.length,
        executionTimeMs: Date.now() - startTime
      },
      'Medical code search completed'
    );

    return response;
  } catch (error: any) {
    // Log failure
    await logAction({
      userId: context.userId,
      actionName: 'searchMedicalCodes',
      parameters: params,
      error: error.message,
      permissionsChecked: REQUIRED_PERMISSIONS,
      success: false,
      executionTimeMs: Date.now() - startTime,
    });

    logger.error(
      {
        error: error.message,
        userId: context.userId,
        searchTerm: params.searchTerm
      },
      'Medical code search failed'
    );

    throw error;
  }
}
