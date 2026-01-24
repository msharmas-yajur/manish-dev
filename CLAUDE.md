# Caladrius Health AI Studio

## Project Overview
Healthcare application with multi-container microservices architecture.

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript (Material Design, desktop-only)
- **BFF**: Node.js + Express + TypeScript (port 3001)
- **Backend**: Python + FastAPI (port 8000)
- **Databases**: PostgreSQL, MongoDB, Redis
- **AI/ML**: Multi-provider LLM service (OpenAI, Anthropic, Ollama)
- **Healthcare**: Snowstorm (SNOMED CT), LiveKit (telehealth)

## Architecture
```
Frontend (8081) → BFF (3001) → Backend (8000) → Databases
                           ↘ LLM Service (8003) → Ollama/OpenAI/Anthropic
```

## Running Services
```bash
docker compose up -d                    # Start all services
docker compose ps                       # Check status
docker compose logs -f <service>        # View logs
```

## Project Structure
```
apps/
├── frontend/     # React app (Vite + TypeScript)
├── bff/          # Node.js API gateway
├── backend/      # Python FastAPI backend
├── llm-service/  # Multi-provider LLM router (Phase 3)
├── workers/      # Celery workers (Phase 3)
└── copilot/      # CopilotKit runtime (Phase 3)
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

## Implementation Phases
- [x] Phase 1: Core Infrastructure (PostgreSQL, MongoDB, Redis)
- [x] Phase 2: Backend Services (BFF, Python Backend)
- [ ] Phase 3: AI/ML Services (LLM Service, Ollama, CopilotKit)
- [ ] Phase 4: Real-time & Healthcare (LiveKit, Snowstorm)
- [ ] Phase 5: Frontend Integration
