"use strict";
/**
 * User-related TypeScript types for copilot-service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = exports.UserRole = void 0;
/**
 * User roles enum
 */
var UserRole;
(function (UserRole) {
    UserRole["SYSTEM_ADMIN"] = "system_admin";
    UserRole["PHYSICIAN"] = "physician";
    UserRole["NURSE"] = "nurse";
    UserRole["MEDICAL_ASSISTANT"] = "medical_assistant";
    UserRole["PATIENT"] = "patient";
    UserRole["BILLING_STAFF"] = "billing_staff";
    UserRole["RECEPTIONIST"] = "receptionist";
    UserRole["USER"] = "user";
})(UserRole || (exports.UserRole = UserRole = {}));
/**
 * User permissions enum
 * Format: resource:action
 */
var Permission;
(function (Permission) {
    // Patient permissions
    Permission["PATIENTS_READ"] = "patients:read";
    Permission["PATIENTS_CREATE"] = "patients:create";
    Permission["PATIENTS_UPDATE"] = "patients:update";
    Permission["PATIENTS_DELETE"] = "patients:delete";
    // Medical records permissions
    Permission["RECORDS_READ"] = "records:read";
    Permission["RECORDS_CREATE"] = "records:create";
    Permission["RECORDS_UPDATE"] = "records:update";
    Permission["RECORDS_DELETE"] = "records:delete";
    // Appointments permissions
    Permission["APPOINTMENTS_READ"] = "appointments:read";
    Permission["APPOINTMENTS_CREATE"] = "appointments:create";
    Permission["APPOINTMENTS_UPDATE"] = "appointments:update";
    Permission["APPOINTMENTS_DELETE"] = "appointments:delete";
    // LLM permissions
    Permission["LLM_USE"] = "llm:use";
    Permission["LLM_CONFIGURE"] = "llm:configure";
    // Role management permissions
    Permission["ROLES_READ"] = "roles:read";
    Permission["ROLES_CREATE"] = "roles:create";
    Permission["ROLES_UPDATE"] = "roles:update";
    Permission["ROLES_DELETE"] = "roles:delete";
    // User management permissions
    Permission["USERS_READ"] = "users:read";
    Permission["USERS_CREATE"] = "users:create";
    Permission["USERS_UPDATE"] = "users:update";
    Permission["USERS_DELETE"] = "users:delete";
    // Own data permissions (for patients)
    Permission["OWN_RECORDS_READ"] = "own_records:read";
    Permission["OWN_RECORDS_UPDATE"] = "own_records:update";
    Permission["OWN_APPOINTMENTS_READ"] = "own_appointments:read";
    Permission["OWN_APPOINTMENTS_CREATE"] = "own_appointments:create";
})(Permission || (exports.Permission = Permission = {}));
//# sourceMappingURL=user.js.map