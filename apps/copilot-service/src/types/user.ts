/**
 * User-related TypeScript types for copilot-service
 */

/**
 * JWT token payload structure
 */
export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * User information attached to authenticated requests
 */
export interface UserInfo {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  authProvider: string;
}

/**
 * User context for copilot actions
 * This represents the authenticated user's context passed to CopilotKit actions
 */
export interface UserContext {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  permissions?: string[];
  roles?: string[];
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: UserInfo;
}

/**
 * User roles enum
 */
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  PHYSICIAN = 'physician',
  NURSE = 'nurse',
  MEDICAL_ASSISTANT = 'medical_assistant',
  PATIENT = 'patient',
  BILLING_STAFF = 'billing_staff',
  RECEPTIONIST = 'receptionist',
  USER = 'user',
}

/**
 * User permissions enum
 * Format: resource:action
 */
export enum Permission {
  // Patient permissions
  PATIENTS_READ = 'patients:read',
  PATIENTS_CREATE = 'patients:create',
  PATIENTS_UPDATE = 'patients:update',
  PATIENTS_DELETE = 'patients:delete',

  // Medical records permissions
  RECORDS_READ = 'records:read',
  RECORDS_CREATE = 'records:create',
  RECORDS_UPDATE = 'records:update',
  RECORDS_DELETE = 'records:delete',

  // Appointments permissions
  APPOINTMENTS_READ = 'appointments:read',
  APPOINTMENTS_CREATE = 'appointments:create',
  APPOINTMENTS_UPDATE = 'appointments:update',
  APPOINTMENTS_DELETE = 'appointments:delete',

  // LLM permissions
  LLM_USE = 'llm:use',
  LLM_CONFIGURE = 'llm:configure',

  // Role management permissions
  ROLES_READ = 'roles:read',
  ROLES_CREATE = 'roles:create',
  ROLES_UPDATE = 'roles:update',
  ROLES_DELETE = 'roles:delete',

  // User management permissions
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // Own data permissions (for patients)
  OWN_RECORDS_READ = 'own_records:read',
  OWN_RECORDS_UPDATE = 'own_records:update',
  OWN_APPOINTMENTS_READ = 'own_appointments:read',
  OWN_APPOINTMENTS_CREATE = 'own_appointments:create',
}
