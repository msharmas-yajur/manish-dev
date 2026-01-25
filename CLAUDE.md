# Caladrius Health AI Studio

## Project Overview
Healthcare application with multi-container microservices architecture designed for clinical workflows, patient management, and AI-assisted medical decision support.

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript (Material Design 3, desktop-only)
- **BFF**: Node.js + Express + TypeScript (port 3001)
- **Backend**: Python + FastAPI (port 8000)
- **Databases**: PostgreSQL 16, MongoDB 7, Redis 7
- **AI/ML**: Multi-provider LLM service (OpenAI, Anthropic, Ollama)
- **Healthcare**: Snowstorm (SNOMED CT), LiveKit (telehealth)
- **Auth**: JWT + Google OAuth 2.0 + RBAC

## Architecture
```
Frontend (8081) → Nginx → BFF (3001) → Backend (8000) → Databases
                              ↘ LLM Service (8003) → Ollama/OpenAI/Anthropic
```

## Running Services
```bash
docker compose up -d                    # Start all services
docker compose ps                       # Check status
docker compose logs -f <service>        # View logs
docker compose build --no-cache <svc>   # Rebuild service
```

## Project Structure
```
apps/
├── frontend/     # React app (Vite + TypeScript)
├── bff/          # Node.js API gateway
├── backend/      # Python FastAPI backend
├── llm-service/  # Multi-provider LLM router
├── workers/      # Celery workers
└── copilot/      # CopilotKit runtime (Phase 4)
packages/
├── shared-types/ # Shared TypeScript types
├── shared-utils/ # Shared utilities
└── ui-components/ # Shared UI components
infrastructure/
├── postgres/     # PostgreSQL init scripts
├── mongo/        # MongoDB init scripts
└── livekit/      # LiveKit config
```

## Design Guidelines
- Material Design 3 for web
- Desktop/laptop only (min-width: 1024px)
- No mobile responsiveness required
- Healthcare-focused UI/UX

## Ports
| Service    | Port  |
|------------|-------|
| Frontend   | 8081  |
| BFF        | 3001  |
| Backend    | 8000  |
| PostgreSQL | 5432  |
| MongoDB    | 27018 |
| Redis      | 6379  |
| LLM Service| 8003  |
| Ollama     | 11434 |
| LiveKit    | 7880  |
| Snowstorm  | 8085  |

---

## Development Decisions

### Authentication & Authorization

#### Decision: JWT + Google OAuth
- **Date**: Jan 2026
- **Context**: Need secure authentication for healthcare app
- **Choice**: JWT tokens with 24h expiry + Google OAuth 2.0
- **Rationale**:
  - JWT for stateless auth, works across microservices
  - Google OAuth for enterprise SSO, HIPAA-friendly
  - Session-less design (no server-side sessions)

#### Decision: Role-Based Access Control (RBAC)
- **Date**: Jan 2026
- **Context**: Need authorization for different user types (physicians, nurses, patients)
- **Choice**: RBAC over ABAC (Attribute-Based Access Control)
- **Rationale**:
  - Simpler to implement and audit
  - Sufficient for initial healthcare workflows
  - Can add ABAC features incrementally (patient-provider relationships)

### RBAC Roles
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

### Permission Format
- Pattern: `resource:action` (e.g., `patients:read`, `appointments:create`)
- Own data: `own_resource:action` for patient self-service

### LLM Provider Strategy

#### Decision: User-Defined API Keys
- **Date**: Jan 2026
- **Context**: Need to support multiple LLM providers
- **Choice**: Users configure their own API keys (encrypted with AES-256)
- **Rationale**:
  - No central API key management costs
  - Users control their own usage/billing
  - Supports OpenAI, Anthropic, Ollama, Google AI, Azure OpenAI

#### Decision: Multi-Provider Router
- **Context**: Different models for different tasks
- **Choice**: Unified LLM service that routes to providers
- **Rationale**:
  - Single API endpoint for frontend
  - Model selection per pipeline type (chat, summarization, coding)
  - Easy to add new providers

### Password Reset Flow

#### Decision: Google-Style Reset
- **Date**: Jan 2026
- **Choice**: Email link with secure token
- **Implementation**:
  - SHA-256 hashed tokens stored in DB
  - 1-hour expiry
  - Same response for existing/non-existing emails (prevents enumeration)
- **Dev Mode**: Reset links logged to console (no email service yet)

### Frontend Architecture

#### Decision: Vite over Create React App
- **Rationale**: Faster builds, better ESM support, smaller bundle

#### Decision: Desktop-Only
- **Rationale**: Healthcare professionals use desktop/laptop workstations
- **Implementation**: min-width: 1024px, no responsive breakpoints

---

## Implementation Progress

### Completed
- [x] Phase 1: Core Infrastructure (PostgreSQL, MongoDB, Redis)
- [x] Phase 2: Backend Services (BFF, Python Backend)
- [x] Phase 3a: LLM Service (multi-provider routing)
- [x] Phase 3b: Celery Workers (embeddings, summarization, medical coding)
- [x] Authentication: Login, Register, Google OAuth, Password Reset
- [x] RBAC: Database schema, roles, permissions, role-permission mappings
- [x] RBAC: BFF service layer with Redis caching (5-min TTL)
- [x] RBAC: Middleware (requirePermission, requireRole, requireAdmin, requireOwnership)
- [x] RBAC: Role management API endpoints
- [x] RBAC: Auth returns roles and permissions on login/register

### Pending
- [ ] Phase 4: CopilotKit, LiveKit telehealth
- [ ] Phase 5: Frontend integration with all services
- [ ] Admin UI for role management
- [ ] Email service for password reset
- [ ] Apply RBAC middleware to protect existing routes (patients, appointments, etc.)

---

## Database Schema Highlights

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),      -- NULL for OAuth-only
  role VARCHAR(50) DEFAULT 'user', -- Legacy, use user_roles
  google_id VARCHAR(255),          -- For OAuth
  auth_provider VARCHAR(50),       -- 'local' | 'google'
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP
)
```

### RBAC Tables
```sql
roles (id, name, display_name, description, is_system, is_active)
permissions (id, name, display_name, resource, action)
role_permissions (role_id, permission_id)
user_roles (user_id, role_id, assigned_by, assigned_at)
```

### LLM Configuration
```sql
llm_providers (id, name, requires_api_key, base_url)
user_llm_providers (user_id, provider_id, api_key_encrypted)
llm_models (id, provider_id, name, context_window, costs)
pipeline_types (id, name, default_model_id)
user_pipeline_configs (user_id, pipeline_type_id, model_id, temperature, ...)
```

---

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login, returns JWT
- `GET /api/auth/me` - Current user info
- `POST /api/auth/logout` - Logout
- `GET /api/auth/google` - Start Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/providers` - Available auth methods
- `POST /api/auth/forgot-password` - Request reset
- `GET /api/auth/verify-reset-token/:token` - Verify token
- `POST /api/auth/reset-password` - Reset with token

### Health
- `GET /api/health` - BFF health
- `GET /api/public/health` - Backend services health

### Roles (RBAC)
- `GET /api/roles` - List all roles (requires: roles:read)
- `POST /api/roles` - Create role (requires: roles:create)
- `GET /api/roles/:roleId` - Get role details with permissions
- `PUT /api/roles/:roleId` - Update role
- `DELETE /api/roles/:roleId` - Delete role (non-system only)
- `GET /api/roles/:roleId/permissions` - Get role permissions
- `PUT /api/roles/:roleId/permissions` - Update role permissions
- `GET /api/roles/permissions/all` - List all permissions
- `GET /api/users/:userId/roles` - Get user's roles
- `GET /api/users/:userId/permissions` - Get user's permissions
- `PUT /api/users/:userId/roles` - Assign roles to user (replaces all)
- `POST /api/users/:userId/roles/:roleName` - Add role to user
- `DELETE /api/users/:userId/roles/:roleName` - Remove role from user

---

## Testing

### Test User
```bash
# Register
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### Password Reset (Dev)
```bash
# Request reset
curl -X POST http://localhost:8081/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check BFF logs for reset link
docker logs manish-bff 2>&1 | grep "Reset URL"
```

### RBAC Testing
```bash
# Login as admin to get token
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sysadmin@example.com","password":"admin123456"}' | jq -r '.data.token')

# List all roles
curl -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/roles

# Get user's roles and permissions
curl -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/users/{userId}/roles

# Assign physician role to user
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8081/api/users/{userId}/roles/physician

# Clear Redis RBAC cache (if needed)
docker exec manish-redis redis-cli -a change_me_in_production \
  DEL "rbac:permissions:{userId}" "rbac:roles:{userId}"
```

---

## Environment Variables

See `.env.example` for full list. Key variables:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth
- `JWT_SECRET` - Token signing
- `ENCRYPTION_KEY` - API key encryption (32 chars)
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - LLM providers
