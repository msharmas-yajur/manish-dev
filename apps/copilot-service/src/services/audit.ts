import { pgPool } from '../config/database';
import { logger } from '../config/logger';
import { ActionAuditLog } from '../types/medicalCoding';

export async function logAction(audit: ActionAuditLog): Promise<void> {
  try {
    await pgPool.query(
      `INSERT INTO copilot_action_audit (
        user_id,
        action_name,
        parameters,
        result,
        error,
        permissions_checked,
        success,
        execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        audit.userId,
        audit.actionName,
        JSON.stringify(audit.parameters),
        audit.result ? JSON.stringify(audit.result) : null,
        audit.error || null,
        audit.permissionsChecked,
        audit.success,
        audit.executionTimeMs,
      ]
    );

    logger.debug({
      userId: audit.userId,
      action: audit.actionName,
      success: audit.success
    }, 'Action logged to audit trail');
  } catch (error: any) {
    // Non-blocking - log error but don't throw
    logger.error({
      error: error.message,
      audit
    }, 'Failed to log action to audit trail');
  }
}

export async function getRecentActions(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const result = await pgPool.query(
      `SELECT
        id,
        action_name,
        parameters,
        result,
        success,
        execution_time_ms,
        created_at
       FROM copilot_action_audit
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (error: any) {
    logger.error({ error: error.message, userId }, 'Failed to fetch audit logs');
    return [];
  }
}
