# API Reference

## Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/frappe` | Start Frappe/ERPNext OAuth |
| GET | `/api/auth/frappe/callback` | Frappe OAuth callback |
| GET | `/api/auth/providers` | Available auth methods (local, google, frappe) |
| POST | `/api/auth/forgot-password` | Request password reset |
| GET | `/api/auth/verify-reset-token/:token` | Verify reset token |
| POST | `/api/auth/reset-password` | Reset with token |

## Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | BFF health |
| GET | `/api/public/health` | Backend services health |

## Patient Sync
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sync/patients/:patientId/to-erpnext` | JWT | Trigger patient sync to ERPNext |
| POST | `/api/sync/webhook/erpnext/patient` | X-Webhook-Secret | ERPNext webhook receiver |
| GET | `/api/sync/status/:patientId` | JWT | Check patient sync status |

## Roles (RBAC)
| Method | Endpoint | Required Permission | Description |
|--------|----------|-------------------|-------------|
| GET | `/api/roles` | `roles:read` | List all roles |
| POST | `/api/roles` | `roles:create` | Create role |
| GET | `/api/roles/:roleId` | — | Get role details with permissions |
| PUT | `/api/roles/:roleId` | — | Update role |
| DELETE | `/api/roles/:roleId` | — | Delete role (non-system only) |
| GET | `/api/roles/:roleId/permissions` | — | Get role permissions |
| PUT | `/api/roles/:roleId/permissions` | — | Update role permissions |
| GET | `/api/roles/permissions/all` | — | List all permissions |
| GET | `/api/users/:userId/roles` | — | Get user's roles |
| GET | `/api/users/:userId/permissions` | — | Get user's permissions |
| PUT | `/api/users/:userId/roles` | — | Assign roles to user (replaces all) |
| POST | `/api/users/:userId/roles/:roleName` | — | Add role to user |
| DELETE | `/api/users/:userId/roles/:roleName` | — | Remove role from user |

## API Documentation (Swagger)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/docs` | Swagger UI with unified API documentation |
| GET | `/api/docs/openapi.json` | Merged OpenAPI spec (BFF + Backend) |
| GET | `/api/docs/bff/openapi.json` | BFF-only OpenAPI spec |

**Notes:**
- The merged spec combines BFF endpoints with Backend (FastAPI) endpoints
- Backend endpoints appear under `/backend/*` prefix with `Backend:` tag prefix
- Backend schemas are prefixed with `Backend_` to avoid conflicts
- Spec is cached for 60 seconds to avoid repeated Backend requests
