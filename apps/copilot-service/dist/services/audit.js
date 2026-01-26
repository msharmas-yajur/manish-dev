"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = logAction;
exports.getRecentActions = getRecentActions;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
async function logAction(audit) {
    try {
        await database_1.pgPool.query(`INSERT INTO copilot_action_audit (
        user_id,
        action_name,
        parameters,
        result,
        error,
        permissions_checked,
        success,
        execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            audit.userId,
            audit.actionName,
            JSON.stringify(audit.parameters),
            audit.result ? JSON.stringify(audit.result) : null,
            audit.error || null,
            audit.permissionsChecked,
            audit.success,
            audit.executionTimeMs,
        ]);
        logger_1.logger.debug({
            userId: audit.userId,
            action: audit.actionName,
            success: audit.success
        }, 'Action logged to audit trail');
    }
    catch (error) {
        // Non-blocking - log error but don't throw
        logger_1.logger.error({
            error: error.message,
            audit
        }, 'Failed to log action to audit trail');
    }
}
async function getRecentActions(userId, limit = 10) {
    try {
        const result = await database_1.pgPool.query(`SELECT
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
       LIMIT $2`, [userId, limit]);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error({ error: error.message, userId }, 'Failed to fetch audit logs');
        return [];
    }
}
//# sourceMappingURL=audit.js.map