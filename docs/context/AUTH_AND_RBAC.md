# Authentication & Authorization

## Decision: JWT + Multi-Provider OAuth
- **Date**: Jan 2026 (updated Feb 2026)
- **Context**: Need secure authentication for healthcare app with optional ERPNext SSO
- **Choice**: JWT tokens with 24h expiry + Google OAuth 2.0 + Frappe/ERPNext OAuth 2.0
- **Rationale**:
  - JWT for stateless auth, works across microservices
  - Google OAuth for enterprise SSO, HIPAA-friendly
  - Frappe OAuth for ERPNext SSO (loosely coupled, optional)
  - Session-less design (no server-side sessions)

## Decision: Frappe/ERPNext OAuth Integration (Loose Coupling)
- **Date**: Feb 2026
- **Context**: Use ERPNext's user base for authentication without tight coupling
- **Choice**: Frappe as OAuth2 provider via Authorization Code grant
- **Rationale**:
  - Follows same pattern as Google OAuth (additive, no existing code modified)
  - App works without Frappe running (button hidden when provider unavailable)
  - Account linking: existing email users auto-linked on first Frappe login
  - Manual OAuth2 flow (no passport strategy needed)
- **Endpoints Used**:
  - Authorize: `GET /api/method/frappe.integrations.oauth2.authorize`
  - Token: `POST /api/method/frappe.integrations.oauth2.get_token`
  - Profile: `GET /api/method/frappe.integrations.oauth2.openid_profile`
- **Setup**: Create OAuth Client in Frappe admin, set env vars `FRAPPE_OAUTH_CLIENT_ID` and `FRAPPE_OAUTH_CLIENT_SECRET`

## Decision: Role-Based Access Control (RBAC)
- **Date**: Jan 2026
- **Context**: Need authorization for different user types (physicians, nurses, patients)
- **Choice**: RBAC over ABAC (Attribute-Based Access Control)
- **Rationale**:
  - Simpler to implement and audit
  - Sufficient for initial healthcare workflows
  - Can add ABAC features incrementally (patient-provider relationships)

## RBAC Roles
| Role | Description | Permission Count |
|------|-------------|------------------|
| system_admin | Full access | 39 (all) |
| physician | Clinical access | 18 |
| nurse | Patient care | 11 |
| medical_assistant | Limited clinical | 8 |
| patient | Own data only | 8 |
| billing_staff | Financial | 7 |
| receptionist | Scheduling | 7 |
| user | Default (minimal) | 2 |

## Permission Format
- Pattern: `resource:action` (e.g., `patients:read`, `appointments:create`)
- Own data: `own_resource:action` for patient self-service

## RBAC Implementation
- BFF service layer with Redis caching (5-min TTL)
- Middleware: `requirePermission`, `requireRole`, `requireAdmin`, `requireOwnership`
- Role management API endpoints (see API_REFERENCE.md)
- Auth returns roles and permissions on login/register

## Password Reset Flow
- **Decision**: Google-Style Reset (email link with secure token)
- SHA-256 hashed tokens stored in DB
- 1-hour expiry
- Same response for existing/non-existing emails (prevents enumeration)
- **Dev Mode**: Reset links logged to console (no email service yet)
