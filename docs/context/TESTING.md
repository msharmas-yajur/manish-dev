# Testing & QA

## Health Check Script
Run before implementing new features to verify system health:
```bash
./scripts/health-check-all-services.sh
```

Checks:
- All Docker services running
- Database connectivity (PostgreSQL, MongoDB, Redis)
- HTTP health endpoints
- Authentication flow (register, login, JWT)
- RBAC endpoints
- Database statistics and baseline performance

See `scripts/README.md` for detailed documentation.

## Test User
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

## Password Reset (Dev Mode)
```bash
# Request reset
curl -X POST http://localhost:8081/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check BFF logs for reset link
docker logs manish-bff 2>&1 | grep "Reset URL"
```

## RBAC Testing
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
