# CopilotKit Integration

## Decision: Separate Microservice Architecture
- **Date**: Jan 2026
- **Context**: Need AI agent capabilities for medical coding, patient data retrieval, and clinical documentation
- **Choice**: Standalone Node.js service on port 8004 (similar to LLM Service pattern)
- **Rationale**:
  - Service isolation (independent scaling and deployment)
  - Follows existing microservice pattern
  - Dedicated health checks and monitoring
  - Clear separation of concerns from BFF

## Decision: Node.js + Express + TypeScript Framework
- **Context**: Choose between Node.js and Python for copilot service
- **Choice**: Node.js + Express + TypeScript
- **Rationale**:
  - Native CopilotKit SDK support (`@copilotkit/runtime` is Node.js-first)
  - Consistency with BFF architecture (reuse auth/RBAC patterns)
  - TypeScript integration with existing `@manish-dev/shared-types`
  - Team expertise in Node.js/Express stack
  - Better for I/O-bound agent tasks
- **Trade-off**: Python/FastAPI would require custom CopilotKit implementation

## Decision: User Permission Inheritance Security Model
- **Context**: How should agents respect user permissions and RBAC?
- **Choice**: Agents inherit RBAC permissions from authenticated user
- **Implementation**:
  - JWT validation on all copilot requests
  - User context (id, email, roles, permissions) passed to all agent actions
  - Every action validates required permissions before execution
  - Patients can only access own data (ownership validation)
  - Complete audit trail to PostgreSQL (`copilot_action_audit` table)
- **Rationale**: Most secure for healthcare data (HIPAA compliance)

## Decision: Route Through Existing LLM Service
- **Context**: How should CopilotKit access LLM providers?
- **Choice**: Route all LLM requests through existing LLM Service (port 8003)
- **Rationale**:
  - Centralized LLM provider management
  - Respects user-specific model configurations
  - Consistent token tracking and cost monitoring
  - Reuses existing OpenAI/Anthropic/Ollama infrastructure
- **Alternative Rejected**: Direct API calls (would bypass user configs)

## Agent Capabilities
| Agent Action | Purpose | Required Permissions | Data Source | Status |
|--------------|---------|---------------------|-------------|--------|
| `searchMedicalCodes` | SNOMED CT code lookup | `llm:use`, `records:read` | Snowstorm (8085) | Done |
| `getPatientData` | Patient info + records | `patients:read`, `records:read` | PostgreSQL | Phase 3 |
| `generateClinicalNote` | Generate SOAP/Progress notes | `llm:use`, `records:create` | LLM Service (8003) | Phase 4 |

**Special Rules:**
- `getPatientData`: Patients can only access own data (user_id validation)
- `generateClinicalNote`: Restricted to clinical staff only (physician, nurse, medical_assistant)

## Implementation Progress

### Phase 1: Service Foundation (Done - Jan 26, 2026)
- Dev time: 5 minutes (traditional: ~16 hours) via 5 parallel agents
- Express server with health checks
- JWT authentication middleware (matches BFF)
- PostgreSQL + Redis connection pooling
- Docker multi-stage build

### Phase 2: Medical Coding Agent (Done - Jan 26, 2026)
- Dev time: 5 minutes (traditional: ~20 hours) via 6 parallel agents
- 1,285 lines of code
- RBAC service (16 functions, Redis caching, 5-min TTL)
- Snowstorm HTTP client (SNOMED CT integration)
- Audit logging (PostgreSQL with JSONB, non-blocking)
- `searchMedicalCodes` action with full RBAC enforcement
- Database migration (copilot_action_audit table + indexes)

### Phase 3: Patient Data Agent — Pending
### Phase 4: Clinical Documentation Agent — Pending
### Phase 5: Frontend Integration — Pending
### Phase 6: Testing & Documentation — Pending
