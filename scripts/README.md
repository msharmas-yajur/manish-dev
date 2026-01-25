# Utility Scripts

This directory contains helper scripts for development and operations.

## Health Check Script

### `health-check-all-services.sh`

Comprehensive health check for all services in the Caladrius Health AI Studio platform.

**Purpose**: Run before implementing new features to establish baseline and ensure existing functionality is intact.

**What it checks**:
- Docker service status (postgres, mongodb, redis, bff, backend, llm-service)
- Database connectivity (PostgreSQL, MongoDB, Redis)
- HTTP health endpoints (BFF, Backend, LLM Service)
- Authentication flow (registration, JWT validation)
- RBAC endpoints
- Database statistics (user count, role count, permissions)
- Performance baseline (response times)

**Usage**:
```bash
# From project root
./scripts/health-check-all-services.sh

# Or with explicit bash
bash scripts/health-check-all-services.sh
```

**Exit Codes**:
- `0`: All checks passed, safe to proceed
- `1`: One or more checks failed, troubleshooting required

**When to Run**:
1. **Before starting new feature implementation** (Phase 0)
2. **After completing each implementation phase** (regression testing)
3. **After merging changes** (CI/CD integration)
4. **When debugging issues** (system health verification)
5. **Before production deployment** (final verification)

**Example Output**:
```
==================================================
🏥 Caladrius Health AI Studio - Health Check
==================================================

=== Docker Services Status ===

Checking Docker service: manish-postgres... ✓ Running
Checking Docker service: manish-mongodb... ✓ Running
Checking Docker service: manish-redis... ✓ Running
Checking Docker service: manish-bff... ✓ Running
Checking Docker service: manish-backend... ✓ Running
Checking Docker service: manish-llm-service... ✓ Running

=== Database Connectivity ===

PostgreSQL connection... ✓ OK
Redis connection... ✓ OK
MongoDB connection... ✓ OK

=== HTTP Health Endpoints ===

Checking BFF Health... ✓ OK (HTTP 200)
Checking BFF Public Health... ✓ OK (HTTP 200)
Checking Backend Health... ✓ OK (HTTP 200)
Checking LLM Service Health... ✓ OK (HTTP 200)

=== Authentication Test ===

Testing user registration... ✓ OK
Testing JWT authentication... ✓ OK
Testing RBAC endpoints... ✓ OK

=== Database Statistics ===

PostgreSQL:
  - Users: 5
  - Roles: 8
  - Permissions: 39

Redis:
  - Memory Usage: 2.5M
  - Total Keys: 12

=== Performance Baseline ===

Auth endpoint response time: 0.045s
Health endpoint response time: 0.012s

=== Summary ===

✓ All checks passed! System is healthy.

Baseline metrics recorded:
  - Users in DB: 5
  - Roles in DB: 8
  - Redis Memory: 2.5M
  - Auth Response Time: 0.045s

✅ Safe to proceed with new feature implementation
```

**Integration with Implementation Plan**:

This script implements **Phase 0: Pre-Implementation Verification** from the CopilotKit integration plan. It ensures:
- ✅ No existing features break during development
- ✅ Baseline performance metrics are documented
- ✅ All dependencies are healthy before starting
- ✅ Regression testing after each phase

**Troubleshooting Failed Checks**:

If the script reports failures:

1. **Docker services not running**:
   ```bash
   docker compose up -d
   docker compose ps
   ```

2. **Database connectivity issues**:
   ```bash
   docker compose restart postgres redis mongodb
   docker compose logs postgres
   ```

3. **HTTP endpoint failures**:
   ```bash
   docker compose logs bff backend llm-service
   curl -v http://localhost:3001/health
   ```

4. **Authentication failures**:
   ```bash
   # Check BFF logs
   docker compose logs bff | grep -i error

   # Verify JWT_SECRET is set
   docker compose exec bff env | grep JWT_SECRET
   ```

5. **RBAC failures**:
   ```bash
   # Check database schema
   docker exec manish-postgres psql -U manish -d manish_dev -c "\dt"

   # Verify roles exist
   docker exec manish-postgres psql -U manish -d manish_dev -c "SELECT * FROM roles;"
   ```

## Future Scripts

Additional scripts planned:
- `backup-databases.sh` - Backup PostgreSQL and MongoDB
- `seed-test-data.sh` - Populate databases with test data
- `performance-benchmark.sh` - Comprehensive performance testing
- `security-audit.sh` - Security vulnerability scanning
- `rollback-migration.sh` - Rollback database migrations

## Contributing

When adding new scripts:
1. Make them executable: `chmod +x scripts/your-script.sh`
2. Add shebang: `#!/bin/bash`
3. Add error handling: `set -e`
4. Document in this README
5. Include usage examples
6. Add to `.gitignore` if generating temporary files
