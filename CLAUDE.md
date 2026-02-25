# Caladrius Health AI Studio

---
## >>> RESUME HERE <<<

**Current Focus:** API Documentation & Developer Experience
**Task File:** `/docs/PROJECT_TASKS.md`
**Code Review:** `/docs/CODE_REVIEW_REPORT.md`

**Completed (Feb 25, 2026):**
- Unified Swagger API documentation at `/api/docs`
- Combined BFF (42+ endpoints) + Backend (20+ endpoints) specs
- Dynamic spec merging with 60-second cache
- JSDoc annotations added to all BFF route files
- Nginx routing fix (`^~` modifier) for API priority
- Docker DNS config for external API access (Google OAuth)

**Completed (Feb 8, 2026):**
- Frappe/ERPNext v16 provisioned (8-container stack, Healthcare module)
- Frappe OAuth2 login integration (Authorization Code grant)
- Bidirectional Patient Sync (Caladrius <-> ERPNext) — all 6 phases
- Frappe custom app `caladrius_integration` installed
- End-to-end sync verified (loop prevention working)

**Completed (Jan 28, 2026):**
- Phase 1-3: Frontend layout (Foundation, Core Components, Assembly)
- Patient List Feature (A-020, A-021), Settings Page (A-024)
- Code Review - 8.5/10 score, 2 major issues fixed

**Next Tasks to Pick Up:**
1. FHIR Patient India IG alignment (patient data model)
2. A-013: Update App.tsx to use MainLayout
3. A-014: Delete old Navbar.tsx, Sidebar.tsx
4. P-015: CopilotKit Frontend Integration
5. A-022: Patient Detail Page

---

## Project Overview

Healthcare application with multi-container microservices architecture designed for clinical workflows, patient management, and AI-assisted medical decision support.

**Tech Stack**: React 19 + Vite | Node.js BFF | Python FastAPI | PostgreSQL 16 | MongoDB 7 | Redis 7 | ERPNext v16

**Architecture**:
```
Frontend (8081) → Nginx → BFF (3001) → Backend (8000) → Databases
                              ↓
                        Copilot Service (8004) → LLM Service (8003) → Ollama/OpenAI/Anthropic
                              ↓
                        Snowstorm (8085) - SNOMED CT
```

## Running Services
```bash
docker compose up -d                    # Start all services
docker compose ps                       # Check status
docker compose logs -f <service>        # View logs
docker compose build --no-cache <svc>   # Rebuild service
```

---

## Context Sub-Files

Detailed documentation is split into topic-based files under `docs/context/`:

| File | Contents |
|------|----------|
| [`ARCHITECTURE.md`](docs/context/ARCHITECTURE.md) | Tech stack, system architecture, project structure, port map |
| [`AUTH_AND_RBAC.md`](docs/context/AUTH_AND_RBAC.md) | JWT + OAuth decisions, Frappe OAuth flow, RBAC roles/permissions, password reset |
| [`ERPNEXT_INTEGRATION.md`](docs/context/ERPNEXT_INTEGRATION.md) | Frappe/ERPNext setup, containers, volumes, gotchas, bidirectional patient sync, env vars |
| [`DATABASE_SCHEMA.md`](docs/context/DATABASE_SCHEMA.md) | All table schemas — users, patients, RBAC, LLM config, copilot audit |
| [`API_REFERENCE.md`](docs/context/API_REFERENCE.md) | All API endpoints — auth, health, sync, RBAC, Swagger docs |
| [`COPILOTKIT.md`](docs/context/COPILOTKIT.md) | CopilotKit architecture decisions, agent capabilities, implementation phases |
| [`FRONTEND_DESIGN.md`](docs/context/FRONTEND_DESIGN.md) | Material Design 3 guidelines, layout dimensions, screen design references |
| [`COMPANY_WEBSITE.md`](docs/context/COMPANY_WEBSITE.md) | Website planning, design language, WordPress + Next.js architecture, MVP pages |
| [`CMS_COMPARISON.md`](docs/context/CMS_COMPARISON.md) | Evaluation of 7 CMS options (WordPress chosen) |
| [`TESTING.md`](docs/context/TESTING.md) | Health check scripts, test users, RBAC testing commands |
| [`DEV_PRINCIPLES.md`](docs/context/DEV_PRINCIPLES.md) | Backward compatibility rules, LLM provider strategy, env variables |
| [`VELOCITY_METRICS.md`](docs/context/VELOCITY_METRICS.md) | Development speed tracking, Claude Code vs traditional comparison |

**Other docs:**
- `/docs/PROJECT_TASKS.md` — Master task tracking file
- `/docs/CODE_REVIEW_REPORT.md` — Code review findings
- `/docs/DATA_LAKEHOUSE_IMPLEMENTATION.md` — Data lakehouse design

---

## Quick Reference

### Port Map
| Service | Port | Service | Port |
|---------|------|---------|------|
| Frontend | 8081 | LLM Service | 8003 |
| BFF | 3001 | Copilot Service | 8004 |
| Backend | 8000 | Snowstorm | 8085 |
| PostgreSQL | 5432 | ERPNext | 8090 |
| MongoDB | 27018 | WordPress | 8082 |
| Redis | 6379 | Website (Next.js) | 8084 |
| Ollama | 11434 | LiveKit | 7880 |
| MariaDB | 3307 | Frappe MariaDB | 3308 |

### Design Guidelines
- Material Design 3 for web, desktop-only (min-width: 1024px)
- See [`FRONTEND_DESIGN.md`](docs/context/FRONTEND_DESIGN.md) for layout dimensions

### Sprint Status
| Phase | Status |
|-------|--------|
| Frontend Layout (A-001 to A-012) | Done |
| Frontend Integration (A-013, A-014) | Ready |
| Patient List (A-020, A-021) | Done |
| Settings (A-024) | Done |
| ERPNext Provisioning | Done |
| Frappe OAuth2 Login | Done |
| Patient Sync (Phases 1-6) | Done |
| FHIR Patient India IG | Next |
| CopilotKit Phases 3-6 | Pending |

---

## Implementation Progress

### Completed
- [x] Core Infrastructure (PostgreSQL, MongoDB, Redis)
- [x] Backend Services (BFF, Python Backend)
- [x] LLM Service (multi-provider routing)
- [x] Celery Workers (embeddings, summarization, medical coding)
- [x] Authentication (Login, Register, Google OAuth, Frappe OAuth, Password Reset)
- [x] RBAC (schema, roles, permissions, middleware, API endpoints)
- [x] CopilotKit Phase 1 (Service Foundation) & Phase 2 (Medical Coding Agent)
- [x] Frappe/ERPNext v16 (8-container stack, Healthcare module)
- [x] Bidirectional Patient Sync (all 6 phases)
- [x] Unified Swagger API Documentation (BFF + Backend merged)

### Pending
- [ ] FHIR Patient India IG alignment
- [ ] CopilotKit Phases 3-6 (Patient Data, Clinical Docs, Frontend, Testing)
- [ ] LiveKit telehealth integration
- [ ] Frontend integration with all services
- [ ] Admin UI for role management
- [ ] Email service for password reset
- [ ] RBAC middleware on existing routes
- [ ] Company Website (CMS)

---

## Development Principles (Summary)

> Full details: [`DEV_PRINCIPLES.md`](docs/context/DEV_PRINCIPLES.md)

1. **Service Isolation** — New services don't modify existing code
2. **Additive Changes Only** — Migrations add, never alter
3. **Regression Testing** — Test before, during, and after implementation
4. **Health Checks** — Independent per service, no cascading failures
5. **Incremental Integration** — Use existing patterns (BFF proxy, JWT, shared types)
6. **No tight coupling** — Services communicate via APIs only
