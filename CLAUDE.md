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
├── frontend/     # React app (Vite + TypeScript) - Healthcare App
├── website/      # Next.js + GSAP - Company Website
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
| WordPress  | 8082  |
| MariaDB    | 3307  |
| Website (Next.js) | 8084 |

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
- [ ] Company Website (CMS) - See Planning section below

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

---

## Company Website Planning

### Overview
Planning a company marketing website alongside the Caladrius application with:
- Modern design (Apple + Anthropic/Claude.ai inspired)
- GSAP animations for smooth interactions
- Responsive design (unlike the desktop-only app)
- CMS for content management
- Make.com integration for automated feature announcements

### Content Requirements
- **Pages**: Home, About, Products/Features, Pricing, Contact, Careers
- **Blog Posts**: Company news, industry insights
- **Feature Announcements**: Automated from GitHub releases
- **White Papers**: Downloadable PDFs with lead capture
- **Case Studies**: Customer success stories
- **Team Members**: Leadership and team profiles

### Design Language
**Apple-Inspired:**
- Ultra-clean, minimalist layouts
- Large hero sections with bold typography
- Scroll-triggered animations
- Parallax effects

**Anthropic/Claude.ai-Inspired:**
- Warm color palette (cream, terracotta, soft gradients)
- Organic shapes and soft curves
- Elegant serif + sans-serif typography
- Trust-focused, conversational tone

### Proposed Color Palette
```css
--cream: #FAF9F6;
--warm-white: #FEFDFB;
--terracotta: #D4A574;
--deep-brown: #3D3129;
--soft-coral: #E8B4A0;
--sage: #A8B5A0;
```

### Typography
- Headings: Fraunces (elegant serif)
- Body: Inter (clean sans-serif)
- Code: JetBrains Mono

### CMS Options Under Consideration
See "CMS Comparison" section for detailed analysis of:
1. WordPress (Headless) + React/Next.js
2. Strapi (Node.js headless CMS)
3. Payload CMS (TypeScript-native)
4. Sanity (Real-time collaborative)
5. Directus (SQL-based headless)
6. Ghost (Publishing-focused)
7. Keystatic (Git-based, Astro-friendly)

### Make.com Integration
```
GitHub Release → Make.com Scenario → CMS API → Website Rebuild
```
- Trigger: GitHub release webhook
- Action: Create feature announcement post
- Optional: Notify team via Slack/email

### Decisions Made
1. **CMS Choice**: WordPress (Headless) + React/Next.js frontend
2. **Database**: MariaDB (standard WordPress setup)
3. **Custom Fields**: Pods (free, all features included) - replaces ACF Pro
4. **Hosting**: Same Docker stack as Caladrius application
5. **Launch Priority**: MVP first (Home, About, Contact, then Features, Blog)
6. **Domain Structure**: Subdomain separation
   - `www.caladrius.com` → Company Website (Next.js + WordPress)
   - `app.caladrius.com` → Healthcare Application (React)

### Development Ports
| Service | Port | URL |
|---------|------|-----|
| Website Frontend (Next.js) | 8084 | localhost:8084 |
| WordPress Admin | 8082 | localhost:8082/wp-admin |
| Healthcare App | 8081 | localhost:8081 |
| BFF API | 3001 | localhost:3001 |

### MVP Pages (Priority Order)
| Priority | Page | Status |
|----------|------|--------|
| P0 | Home | Pending |
| P0 | About | Pending |
| P0 | Contact | Pending |
| P1 | Features | Pending |
| P1 | Blog | Pending |
| P2 | Pricing | Pending |
| P2 | Careers | Pending |
| P2 | White Papers | Pending |

### WordPress Plugin Stack
| Plugin | Purpose | License |
|--------|---------|---------|
| **Pods** | Custom post types + custom fields + relationships | Free (GPL) |
| **WP REST API** | Built-in, headless content delivery | Core |
| **Yoast SEO** | SEO management | Free |
| **WP GraphQL** | GraphQL API (optional, alternative to REST) | Free |
| **Application Passwords** | API authentication for Make.com | Core (WP 5.6+) |

### Final Architecture (Chosen)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Company Website Stack                         │
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────────────┐ │
│  │   WordPress (CMS)    │      │   Next.js Frontend           │ │
│  │   ├── Pods Plugin    │─────▶│   ├── GSAP Animations        │ │
│  │   ├── Yoast SEO      │ REST │   ├── Tailwind CSS           │ │
│  │   └── App Passwords  │ API  │   └── Apple/Claude Design    │ │
│  │   Port: 8082         │      │   Port: 8084                 │ │
│  └──────────────────────┘      └──────────────────────────────┘ │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────┐      ┌──────────────────────────────┐ │
│  │      MariaDB         │      │       Make.com               │ │
│  │   Port: 3307         │      │   └── GitHub → WP Posts      │ │
│  └──────────────────────┘      └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Steps
1. [ ] Add WordPress + MariaDB to docker-compose.yml
2. [ ] Create Next.js website app in `apps/website/`
3. [ ] Configure WordPress with Pods plugin
4. [ ] Build GSAP animation components
5. [ ] Create MVP pages (Home, About, Contact)
6. [ ] Set up Make.com integration for feature announcements

---

## CMS Comparison

### WordPress (Headless)
| Aspect | Details |
|--------|---------|
| **Type** | Traditional CMS, can be headless |
| **Database** | MySQL/MariaDB |
| **API** | REST API built-in, GraphQL via plugin |
| **Pros** | Huge ecosystem, familiar to content teams, ACF for custom fields |
| **Cons** | PHP stack (different from your Node/Python), security concerns, bloated |
| **GSAP** | Via custom frontend (React/Next.js) |
| **Best For** | Teams familiar with WordPress, need plugin ecosystem |

### Strapi
| Aspect | Details |
|--------|---------|
| **Type** | Headless CMS (Node.js) |
| **Database** | PostgreSQL, MySQL, SQLite, MongoDB |
| **API** | REST + GraphQL |
| **Pros** | Self-hosted, customizable, good admin UI, uses your existing PostgreSQL |
| **Cons** | Can be resource-heavy, v5 breaking changes |
| **GSAP** | Full control via Next.js frontend |
| **Best For** | Teams wanting Node.js stack, self-hosted control |

### Payload CMS
| Aspect | Details |
|--------|---------|
| **Type** | Headless CMS (TypeScript-native) |
| **Database** | MongoDB, PostgreSQL (v3+) |
| **API** | REST + GraphQL + Local API |
| **Pros** | TypeScript-first, excellent DX, code-based config, self-hosted |
| **Cons** | Smaller community, newer |
| **GSAP** | Full control, can embed in Next.js app |
| **Best For** | TypeScript teams, developers who want code-first approach |

### Sanity
| Aspect | Details |
|--------|---------|
| **Type** | Headless CMS (Hosted + Self-hosted studio) |
| **Database** | Sanity Cloud (hosted) |
| **API** | GROQ (custom query language) + GraphQL |
| **Pros** | Real-time collaboration, excellent content modeling, portable text |
| **Cons** | Hosted data (vendor lock-in), costs at scale, learning GROQ |
| **GSAP** | Full control via frontend |
| **Best For** | Content teams needing real-time collaboration |

### Directus
| Aspect | Details |
|--------|---------|
| **Type** | Headless CMS (wraps any SQL database) |
| **Database** | PostgreSQL, MySQL, SQLite, etc. |
| **API** | REST + GraphQL |
| **Pros** | Use existing database, beautiful admin, self-hosted |
| **Cons** | Less opinionated, setup complexity |
| **GSAP** | Full control via frontend |
| **Best For** | Teams with existing database, want flexibility |

### Ghost
| Aspect | Details |
|--------|---------|
| **Type** | Publishing platform (can be headless) |
| **Database** | MySQL/SQLite |
| **API** | Content API + Admin API |
| **Pros** | Beautiful editor, built for publishing, newsletters, memberships |
| **Cons** | Less flexible for non-blog content, limited custom fields |
| **GSAP** | Via headless frontend |
| **Best For** | Content-heavy sites, newsletters, memberships |

### Keystatic
| Aspect | Details |
|--------|---------|
| **Type** | Git-based CMS |
| **Database** | Git (files in repo) |
| **API** | Direct file access, works with Astro/Next.js |
| **Pros** | No database needed, version controlled content, free |
| **Cons** | Not for large teams, no real-time collab, content in code repo |
| **GSAP** | Full control via Astro/Next.js |
| **Best For** | Developer-managed content, static sites |

### Recommendation Matrix

| Requirement | Best Options |
|-------------|--------------|
| Matches existing stack (Node/TS) | **Payload**, Strapi, Directus |
| Uses existing PostgreSQL | **Directus**, Strapi, Payload v3 |
| Best developer experience | **Payload**, Sanity |
| Best for content teams | Sanity, WordPress, **Ghost** |
| Self-hosted, no vendor lock-in | **Payload**, Strapi, Directus, Ghost |
| Simplest setup | **Keystatic**, Ghost |
| Enterprise features | Sanity, WordPress, Strapi |
| TypeScript-native | **Payload** |

### Initial Recommendation
Given your stack (Node.js, TypeScript, PostgreSQL, React), consider:

1. **Payload CMS** - TypeScript-native, code-first, can use your PostgreSQL
2. **Directus** - Wraps your existing PostgreSQL, beautiful admin
3. **Strapi** - Popular, Node.js, good ecosystem

All three support GSAP via custom Next.js frontend and integrate well with Make.com via webhooks/REST API.
