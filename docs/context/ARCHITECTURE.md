# Architecture & Tech Stack

## Project Overview
Healthcare application with multi-container microservices architecture designed for clinical workflows, patient management, and AI-assisted medical decision support.

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript (Material Design 3, desktop-only)
- **BFF**: Node.js + Express + TypeScript (port 3001)
- **Backend**: Python + FastAPI (port 8000)
- **Databases**: PostgreSQL 16, MongoDB 7, Redis 7
- **AI/ML**: Multi-provider LLM service (OpenAI, Anthropic, Ollama)
- **Healthcare**: Snowstorm (SNOMED CT), LiveKit (telehealth)
- **Auth**: JWT + Google OAuth 2.0 + Frappe/ERPNext OAuth 2.0 + RBAC
- **ERP**: ERPNext v16 + Healthcare module (Frappe, port 8090)

## System Architecture
```
Frontend (8081) → Nginx → BFF (3001) → Backend (8000) → Databases
                              ↓
                        Copilot Service (8004) → LLM Service (8003) → Ollama/OpenAI/Anthropic
                              ↓
                        Snowstorm (8085) - SNOMED CT

Bidirectional Patient Sync:
  BFF (3001) ←→ ERPNext/Frappe (8090) via REST API + Webhooks
  Sync Key: ABHA ID | Loop Prevention: custom_caladrius_id flag
```

## Project Structure
```
apps/
├── frontend/         # React app (Vite + TypeScript) - Healthcare App
├── website/          # Next.js + GSAP - Company Website
├── bff/              # Node.js API gateway
│   └── src/services/ # frappeClient.ts, patientSync.ts (ERPNext sync)
│   └── src/routes/   # sync.ts (sync endpoints)
├── backend/          # Python FastAPI backend
├── llm-service/      # Multi-provider LLM router
├── workers/          # Celery workers
└── copilot-service/  # CopilotKit runtime (Node.js, port 8004) - Planned
infrastructure/
├── frappe/           # Frappe/ERPNext MariaDB config (utf8mb4)
├── postgres/         # PostgreSQL init scripts
├── mongo/            # MongoDB init scripts
└── livekit/          # LiveKit config
packages/
├── shared-types/     # Shared TypeScript types
├── shared-utils/     # Shared utilities
└── ui-components/    # Shared UI components
```

## Port Map
| Service | Port |
|---------|------|
| Frontend | 8081 |
| BFF | 3001 |
| Backend | 8000 |
| Copilot Service | 8004 |
| PostgreSQL | 5432 |
| MongoDB | 27018 |
| Redis | 6379 |
| LLM Service | 8003 |
| Ollama | 11434 |
| LiveKit | 7880 |
| Snowstorm | 8085 |
| WordPress | 8082 |
| MariaDB | 3307 |
| Website (Next.js) | 8084 |
| ERPNext (Frappe) | 8090 |
| Frappe MariaDB | 3308 |

## Running Services
```bash
docker compose up -d                    # Start all services
docker compose ps                       # Check status
docker compose logs -f <service>        # View logs
docker compose build --no-cache <svc>   # Rebuild service
```
