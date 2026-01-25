# Caladrius Health AI Studio

A modern healthcare application with AI-powered clinical workflows, patient management, and multi-provider LLM integration built on a microservices architecture.

## Overview

Caladrius Health AI Studio is an enterprise healthcare platform designed for clinical professionals, featuring:

- **Multi-Provider LLM Integration** - OpenAI, Anthropic, Google AI, Azure, and self-hosted Ollama
- **Role-Based Access Control (RBAC)** - 8 healthcare-specific roles with 39 granular permissions
- **Healthcare Data Management** - Patients, practitioners, appointments, medical records
- **Real-time Telehealth** - LiveKit integration for video consultations
- **Medical Terminology** - SNOMED CT integration via Snowstorm

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React 19)                      │
│                    Material Design 3 + Vite                      │
│                         Port: 8081                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BFF (Node.js + Express)                       │
│              Authentication, RBAC, API Gateway                   │
│                         Port: 3001                               │
└───────┬─────────────────────────────────────┬───────────────────┘
        │                                     │
        ▼                                     ▼
┌───────────────────────┐         ┌───────────────────────────────┐
│   Backend (FastAPI)   │         │    LLM Service (FastAPI)      │
│   Healthcare APIs     │         │   Multi-Provider Router       │
│     Port: 8000        │         │       Port: 8003              │
└───────────────────────┘         └───────────────────────────────┘
        │                                     │
        ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  PostgreSQL 16  │  MongoDB 7  │  Redis 7  │  Ollama (LLM)       │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TypeScript, Material Design 3 |
| BFF | Node.js, Express, TypeScript, Passport.js |
| Backend | Python, FastAPI |
| LLM Service | Python, FastAPI, Multi-provider routing |
| Databases | PostgreSQL 16, MongoDB 7, Redis 7 |
| Task Queue | Celery + Redis |
| Healthcare | Snowstorm (SNOMED CT), LiveKit (Telehealth) |
| AI/ML | OpenAI, Anthropic, Google AI, Ollama |

## Features

### Authentication & Authorization

- **Local Authentication** - Email/password with bcrypt hashing
- **Google OAuth 2.0** - Enterprise SSO integration
- **JWT Tokens** - Stateless authentication (24-hour expiry)
- **Password Reset** - Secure token-based reset flow
- **RBAC** - Role-based access control with permission middleware

### Healthcare Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| System Admin | Full system access | 39 (all) |
| Physician | Licensed doctor | 18 |
| Nurse | Registered nurse | 11 |
| Medical Assistant | Clinical support | 8 |
| Patient | Own records access | 8 |
| Billing Staff | Financial access | 7 |
| Receptionist | Scheduling | 7 |
| User | Default role | 2 |

### LLM Integration

**Supported Providers:**
- OpenAI (GPT-4o, GPT-4 Turbo, GPT-3.5)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Google AI (Gemini 1.5 Pro/Flash)
- Azure OpenAI
- Ollama (Llama 3, Mistral, CodeLlama)

**Pipeline Types:**
- Chat & Conversation
- Document Summarization
- Code Generation
- Medical Coding (SNOMED CT, ICD-10)
- Clinical Notes
- Text Embeddings
- Medical Translation
- Data Extraction

### Healthcare Data

- **Patients** - Demographics, allergies, blood type, medical history
- **Practitioners** - License, specialty, department
- **Appointments** - Scheduling with LiveKit video integration
- **Medical Records** - Diagnoses, treatments, SNOMED codes

### Background Tasks (Celery)

- Batch embeddings generation
- Document summarization
- Medical code suggestions
- Async LLM processing

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- pnpm 8+ (package manager)

### Setup

1. **Clone and setup environment:**
```bash
git clone https://github.com/msharmas-yajur/manish-dev.git
cd manish-dev
cp .env.example .env
```

2. **Configure environment variables:**
```bash
# Edit .env with your settings
# Required for Google OAuth:
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional LLM API keys:
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

3. **Start all services:**
```bash
docker compose up -d
```

4. **Verify services are running:**
```bash
docker compose ps
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8081 |
| BFF API | http://localhost:3001 |
| Backend API | http://localhost:8000 |
| LLM Service | http://localhost:8003 |
| Ollama | http://localhost:11434 |
| Snowstorm | http://localhost:8085 |
| LiveKit | http://localhost:7880 |

## API Reference

### Authentication

```bash
# Register
POST /api/auth/register
{ "email": "...", "password": "...", "firstName": "...", "lastName": "..." }

# Login
POST /api/auth/login
{ "email": "...", "password": "..." }

# Get current user
GET /api/auth/me
Authorization: Bearer <token>

# Google OAuth
GET /api/auth/google

# Password Reset
POST /api/auth/forgot-password
{ "email": "..." }
```

### Role Management

```bash
# List roles
GET /api/roles

# Assign role to user
POST /api/users/:userId/roles/:roleName

# Get user permissions
GET /api/users/:userId/permissions
```

### LLM Service

```bash
# Chat completion (OpenAI-compatible)
POST /v1/chat/completions
{ "model": "gpt-4o", "messages": [...] }

# List available models
GET /v1/models

# Configure LLM provider
POST /api/llm/providers/setup
{ "provider_id": "openai", "api_key": "..." }
```

### Healthcare APIs

```bash
# Patients
GET    /api/patients
POST   /api/patients
GET    /api/patients/:id
PUT    /api/patients/:id
DELETE /api/patients/:id

# Appointments
GET    /api/appointments
POST   /api/appointments
GET    /api/appointments/:id
PUT    /api/appointments/:id
DELETE /api/appointments/:id

# Medical Records
GET    /api/medical-records
POST   /api/medical-records
GET    /api/medical-records/:id
PUT    /api/medical-records/:id
DELETE /api/medical-records/:id
```

## Project Structure

```
manish-dev/
├── apps/
│   ├── frontend/          # React 19 + Vite frontend
│   ├── bff/               # Node.js API gateway
│   ├── backend/           # Python FastAPI backend
│   ├── llm-service/       # Multi-provider LLM router
│   ├── workers/           # Celery background workers
│   └── copilot/           # CopilotKit runtime (Phase 4)
├── packages/
│   ├── shared-types/      # Shared TypeScript types
│   ├── shared-utils/      # Shared utilities
│   └── ui-components/     # Shared UI components
├── infrastructure/
│   ├── postgres/          # Database init scripts
│   ├── mongo/             # MongoDB init scripts
│   └── livekit/           # LiveKit configuration
├── docker-compose.yml     # Service orchestration
├── turbo.json             # Turborepo configuration
└── pnpm-workspace.yaml    # pnpm monorepo config
```

## Development

### Install dependencies

```bash
pnpm install
```

### Run services locally

```bash
# Start databases
docker compose up -d postgres mongodb redis

# Start BFF
cd apps/bff && pnpm dev

# Start Frontend
cd apps/frontend && pnpm dev
```

### Rebuild specific service

```bash
docker compose build --no-cache bff
docker compose up -d bff
```

### View logs

```bash
docker compose logs -f bff
docker compose logs -f backend
```

## Testing

### Test Authentication

```bash
# Register user
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### Test RBAC

```bash
# Get admin token first, then:
curl -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/roles
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | manish |
| `POSTGRES_PASSWORD` | PostgreSQL password | - |
| `POSTGRES_DB` | PostgreSQL database | manish_dev |
| `REDIS_PASSWORD` | Redis password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `SESSION_SECRET` | Express session secret | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `ENCRYPTION_KEY` | API key encryption (32 chars) | - |

## Security

- **Password Hashing** - bcryptjs with salt rounds
- **JWT Authentication** - HS256 signed tokens
- **RBAC Enforcement** - Middleware-based permission checking
- **API Key Encryption** - AES-256 for LLM provider keys
- **Rate Limiting** - 100 requests/15 min per IP
- **Helmet.js** - HTTP header security
- **CORS** - Configurable origin validation

## Implementation Status

### Completed

- [x] Core Infrastructure (PostgreSQL, MongoDB, Redis)
- [x] BFF with authentication and RBAC
- [x] Python Backend with healthcare APIs
- [x] Multi-provider LLM Service
- [x] Celery Workers for background tasks
- [x] Google OAuth 2.0 integration
- [x] Password reset flow
- [x] Role-based access control (8 roles, 39 permissions)

### In Progress

- [ ] Frontend integration with all backend services
- [ ] Admin UI for role management
- [ ] LiveKit telehealth integration
- [ ] CopilotKit AI assistant

### Planned

- [ ] Email service for notifications
- [ ] Audit logging dashboard
- [ ] Patient portal
- [ ] Billing system

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For issues and feature requests, please open an issue on GitHub.
