# Development Principles

## Backward Compatibility & Non-Breaking Changes

**Core Principle**: Every new feature or service must be implemented without breaking existing functionality.

### Implementation Guidelines
1. **Service Isolation**: New services (e.g., CopilotKit) are separate microservices that don't modify existing service code
2. **Additive Changes Only**: Database migrations add new tables/columns without altering existing schema
3. **Regression Testing**: Test existing features before and after implementing new ones
4. **Health Checks**: All services maintain independent health checks - new service failures shouldn't cascade
5. **Incremental Integration**: New features integrate through existing patterns (BFF proxy, shared types, JWT auth)
6. **API Versioning**: Consider versioning for breaking API changes (future consideration)

### Testing Approach
- **Before Implementation**: Verify all existing services are healthy and functional
- **During Implementation**: Run integration tests on existing endpoints after each phase
- **After Implementation**: Full regression test suite covering auth, RBAC, and all existing APIs
- **Continuous Monitoring**: Health check endpoints for all services in docker-compose

### Example - CopilotKit Integration
- New service on separate port (8004) - doesn't touch BFF/Backend code
- New database tables only (`copilot_action_audit`, `copilot_conversations`) - doesn't alter existing schema
- Reuses existing patterns (JWT auth, RBAC service, PostgreSQL pool) - proven and tested
- Optional integration (frontend can work without copilot service running)
- BFF proxy is additive (`/api/copilot` route) - doesn't modify existing routes
- Independent health checks - copilot service failure doesn't affect auth or patient data APIs

### Red Flags to Avoid
- Modifying existing database tables (use migrations carefully)
- Changing existing API response formats without versioning
- Removing or renaming existing environment variables
- Altering shared middleware behavior without testing all consumers
- Tightly coupling new services to existing ones (use loose coupling via APIs)

## LLM Provider Strategy

### Decision: User-Defined API Keys
- Users configure their own API keys (encrypted with AES-256)
- No central API key management costs
- Supports OpenAI, Anthropic, Ollama, Google AI, Azure OpenAI

### Decision: Multi-Provider Router
- Unified LLM service that routes to providers
- Single API endpoint for frontend
- Model selection per pipeline type (chat, summarization, coding)
- Easy to add new providers

## Environment Variables
See `.env.example` for full list. Key variables:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FRAPPE_OAUTH_CLIENT_ID` / `FRAPPE_OAUTH_CLIENT_SECRET` - Frappe OAuth
- `FRAPPE_URL` / `FRAPPE_INTERNAL_URL` / `FRAPPE_CALLBACK_URL` - Frappe OAuth URLs
- `JWT_SECRET` - Token signing
- `ENCRYPTION_KEY` - API key encryption (32 chars)
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - LLM providers
