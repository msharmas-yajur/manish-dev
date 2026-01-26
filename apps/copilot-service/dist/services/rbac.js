"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPermissions = getUserPermissions;
exports.getUserRoles = getUserRoles;
exports.getUserRoleInfo = getUserRoleInfo;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.hasAllPermissions = hasAllPermissions;
exports.hasRole = hasRole;
exports.hasAnyRole = hasAnyRole;
exports.invalidateUserCache = invalidateUserCache;
exports.assignRolesToUser = assignRolesToUser;
exports.addRoleToUser = addRoleToUser;
exports.removeRoleFromUser = removeRoleFromUser;
exports.getAllRoles = getAllRoles;
exports.getAllPermissions = getAllPermissions;
exports.getRolePermissions = getRolePermissions;
exports.assignDefaultRole = assignDefaultRole;
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'rbac:';
/**
 * Get all permissions for a user (with Redis caching)
 */
async function getUserPermissions(userId) {
    const cacheKey = `${CACHE_PREFIX}permissions:${userId}`;
    try {
        // Try cache first
        if (database_1.redis) {
            const cached = await database_1.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        // Query database
        const result = await database_1.pgPool.query(`SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`, [userId]);
        const permissions = result.rows.map((row) => row.name);
        // Cache result
        if (database_1.redis) {
            await database_1.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permissions));
        }
        return permissions;
    }
    catch (error) {
        logger_1.logger.error({ error, userId }, 'Failed to get user permissions');
        return [];
    }
}
/**
 * Get all roles for a user
 */
async function getUserRoles(userId) {
    const cacheKey = `${CACHE_PREFIX}roles:${userId}`;
    try {
        // Try cache first
        if (database_1.redis) {
            const cached = await database_1.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        // Query database
        const result = await database_1.pgPool.query(`SELECT r.name
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.is_active = true`, [userId]);
        const roles = result.rows.map((row) => row.name);
        // Cache result
        if (database_1.redis) {
            await database_1.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(roles));
        }
        return roles;
    }
    catch (error) {
        logger_1.logger.error({ error, userId }, 'Failed to get user roles');
        return [];
    }
}
/**
 * Get both roles and permissions for a user
 */
async function getUserRoleInfo(userId) {
    const [roles, permissions] = await Promise.all([
        getUserRoles(userId),
        getUserPermissions(userId),
    ]);
    return { roles, permissions };
}
/**
 * Check if user has a specific permission
 */
async function hasPermission(userId, permission) {
    const permissions = await getUserPermissions(userId);
    return permissions.includes(permission);
}
/**
 * Check if user has any of the specified permissions
 */
async function hasAnyPermission(userId, permissionList) {
    const permissions = await getUserPermissions(userId);
    return permissionList.some((p) => permissions.includes(p));
}
/**
 * Check if user has all of the specified permissions
 */
async function hasAllPermissions(userId, permissionList) {
    const permissions = await getUserPermissions(userId);
    return permissionList.every((p) => permissions.includes(p));
}
/**
 * Check if user has a specific role
 */
async function hasRole(userId, role) {
    const roles = await getUserRoles(userId);
    return roles.includes(role);
}
/**
 * Check if user has any of the specified roles
 */
async function hasAnyRole(userId, roleList) {
    const roles = await getUserRoles(userId);
    return roleList.some((r) => roles.includes(r));
}
/**
 * Invalidate user's RBAC cache (call after role changes)
 */
async function invalidateUserCache(userId) {
    if (!database_1.redis)
        return;
    try {
        await Promise.all([
            database_1.redis.del(`${CACHE_PREFIX}permissions:${userId}`),
            database_1.redis.del(`${CACHE_PREFIX}roles:${userId}`),
        ]);
        logger_1.logger.info({ userId }, 'Invalidated RBAC cache for user');
    }
    catch (error) {
        logger_1.logger.error({ error, userId }, 'Failed to invalidate RBAC cache');
    }
}
/**
 * Assign roles to a user
 */
async function assignRolesToUser(userId, roleNames, assignedBy) {
    const client = await database_1.pgPool.connect();
    try {
        await client.query('BEGIN');
        // Remove existing roles
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
        // Get role IDs
        const rolesResult = await client.query('SELECT id, name FROM roles WHERE name = ANY($1) AND is_active = true', [roleNames]);
        // Insert new role assignments
        for (const role of rolesResult.rows) {
            await client.query(`INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`, [userId, role.id, assignedBy]);
        }
        await client.query('COMMIT');
        // Invalidate cache
        await invalidateUserCache(userId);
        logger_1.logger.info({ userId, roles: roleNames, assignedBy }, 'Assigned roles to user');
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_1.logger.error({ error, userId, roleNames }, 'Failed to assign roles');
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Add a single role to a user
 */
async function addRoleToUser(userId, roleName, assignedBy) {
    try {
        const roleResult = await database_1.pgPool.query('SELECT id FROM roles WHERE name = $1 AND is_active = true', [roleName]);
        if (roleResult.rows.length === 0) {
            return false;
        }
        await database_1.pgPool.query(`INSERT INTO user_roles (user_id, role_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`, [userId, roleResult.rows[0].id, assignedBy]);
        await invalidateUserCache(userId);
        return true;
    }
    catch (error) {
        logger_1.logger.error({ error, userId, roleName }, 'Failed to add role to user');
        throw error;
    }
}
/**
 * Remove a role from a user
 */
async function removeRoleFromUser(userId, roleName) {
    try {
        const result = await database_1.pgPool.query(`DELETE FROM user_roles
       WHERE user_id = $1
       AND role_id = (SELECT id FROM roles WHERE name = $2)`, [userId, roleName]);
        await invalidateUserCache(userId);
        return result.rowCount !== null && result.rowCount > 0;
    }
    catch (error) {
        logger_1.logger.error({ error, userId, roleName }, 'Failed to remove role from user');
        throw error;
    }
}
/**
 * Get all available roles
 */
async function getAllRoles() {
    const result = await database_1.pgPool.query(`SELECT id, name, display_name, description, is_system, is_active
     FROM roles
     WHERE is_active = true
     ORDER BY name`);
    return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        isSystem: row.is_system,
        isActive: row.is_active,
    }));
}
/**
 * Get all available permissions
 */
async function getAllPermissions() {
    const result = await database_1.pgPool.query(`SELECT id, name, display_name, description, resource, action
     FROM permissions
     ORDER BY resource, action`);
    return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        resource: row.resource,
        action: row.action,
    }));
}
/**
 * Get permissions for a specific role
 */
async function getRolePermissions(roleName) {
    const result = await database_1.pgPool.query(`SELECT p.name
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN roles r ON rp.role_id = r.id
     WHERE r.name = $1`, [roleName]);
    return result.rows.map((row) => row.name);
}
/**
 * Assign default role to new user
 */
async function assignDefaultRole(userId) {
    try {
        const roleResult = await database_1.pgPool.query("SELECT id FROM roles WHERE name = 'user' AND is_active = true");
        if (roleResult.rows.length > 0) {
            await database_1.pgPool.query(`INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`, [userId, roleResult.rows[0].id]);
            logger_1.logger.info({ userId }, 'Assigned default role to user');
        }
    }
    catch (error) {
        logger_1.logger.error({ error, userId }, 'Failed to assign default role');
    }
}
//# sourceMappingURL=rbac.js.map