export interface Role {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
}
export interface Permission {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    resource: string;
    action: string;
}
export interface UserRoleInfo {
    roles: string[];
    permissions: string[];
}
/**
 * Get all permissions for a user (with Redis caching)
 */
export declare function getUserPermissions(userId: string): Promise<string[]>;
/**
 * Get all roles for a user
 */
export declare function getUserRoles(userId: string): Promise<string[]>;
/**
 * Get both roles and permissions for a user
 */
export declare function getUserRoleInfo(userId: string): Promise<UserRoleInfo>;
/**
 * Check if user has a specific permission
 */
export declare function hasPermission(userId: string, permission: string): Promise<boolean>;
/**
 * Check if user has any of the specified permissions
 */
export declare function hasAnyPermission(userId: string, permissionList: string[]): Promise<boolean>;
/**
 * Check if user has all of the specified permissions
 */
export declare function hasAllPermissions(userId: string, permissionList: string[]): Promise<boolean>;
/**
 * Check if user has a specific role
 */
export declare function hasRole(userId: string, role: string): Promise<boolean>;
/**
 * Check if user has any of the specified roles
 */
export declare function hasAnyRole(userId: string, roleList: string[]): Promise<boolean>;
/**
 * Invalidate user's RBAC cache (call after role changes)
 */
export declare function invalidateUserCache(userId: string): Promise<void>;
/**
 * Assign roles to a user
 */
export declare function assignRolesToUser(userId: string, roleNames: string[], assignedBy: string): Promise<void>;
/**
 * Add a single role to a user
 */
export declare function addRoleToUser(userId: string, roleName: string, assignedBy: string): Promise<boolean>;
/**
 * Remove a role from a user
 */
export declare function removeRoleFromUser(userId: string, roleName: string): Promise<boolean>;
/**
 * Get all available roles
 */
export declare function getAllRoles(): Promise<Role[]>;
/**
 * Get all available permissions
 */
export declare function getAllPermissions(): Promise<Permission[]>;
/**
 * Get permissions for a specific role
 */
export declare function getRolePermissions(roleName: string): Promise<string[]>;
/**
 * Assign default role to new user
 */
export declare function assignDefaultRole(userId: string): Promise<void>;
//# sourceMappingURL=rbac.d.ts.map