#!/bin/bash

# Health Check Script for All Services
# Run this before starting new feature implementation to establish baseline
# Usage: ./scripts/health-check-all-services.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "🏥 Caladrius Health AI Studio - Health Check"
echo "=================================================="
echo ""

# Track failures
FAILURES=0

# Function to check HTTP endpoint
check_http() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Checking $name... "

    if response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1); then
        if [ "$response" = "$expected_code" ]; then
            echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        else
            echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_code)"
            ((FAILURES++))
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Connection failed)"
        ((FAILURES++))
    fi
}

# Function to check docker service
check_docker_service() {
    local service=$1
    echo -n "Checking Docker service: $service... "

    if docker compose ps | grep -q "$service.*running"; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not Running${NC}"
        ((FAILURES++))
    fi
}

echo "=== Docker Services Status ==="
echo ""

# Check if docker compose is running
if ! docker compose ps > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker Compose is not running. Please start services with 'docker compose up -d'${NC}"
    exit 1
fi

# Check core services
check_docker_service "manish-postgres"
check_docker_service "manish-mongodb"
check_docker_service "manish-redis"
check_docker_service "manish-bff"
check_docker_service "manish-backend"
check_docker_service "manish-llm-service"

echo ""
echo "=== Database Connectivity ==="
echo ""

# PostgreSQL
echo -n "PostgreSQL connection... "
if docker exec manish-postgres pg_isready -U manish > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# Redis
echo -n "Redis connection... "
if docker exec manish-redis redis-cli -a change_me_in_production ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

# MongoDB
echo -n "MongoDB connection... "
if docker exec manish-mongodb mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q "1"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILURES++))
fi

echo ""
echo "=== HTTP Health Endpoints ==="
echo ""

# Check HTTP endpoints
check_http "BFF Health" "http://localhost:3001/health"
check_http "BFF Public Health" "http://localhost:8081/api/public/health"
check_http "Backend Health" "http://localhost:8000/health"
check_http "LLM Service Health" "http://localhost:8003/health"

echo ""
echo "=== Authentication Test ==="
echo ""

# Test authentication flow
echo -n "Testing user registration... "
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"healthcheck-$(date +%s)@example.com\",\"password\":\"test123456\",\"firstName\":\"Health\",\"lastName\":\"Check\"}" 2>&1)

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ OK${NC}"

    # Extract token for further tests
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$TOKEN" ]; then
        echo -n "Testing JWT authentication... "
        AUTH_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/auth/me)

        if echo "$AUTH_CHECK" | grep -q '"success":true'; then
            echo -e "${GREEN}✓ OK${NC}"
        else
            echo -e "${RED}✗ FAIL${NC}"
            ((FAILURES++))
        fi

        echo -n "Testing RBAC endpoints... "
        RBAC_CHECK=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/roles)

        if echo "$RBAC_CHECK" | grep -q '"success":true'; then
            echo -e "${GREEN}✓ OK${NC}"
        else
            echo -e "${RED}✗ FAIL${NC}"
            ((FAILURES++))
        fi
    else
        echo -e "${YELLOW}⚠ Could not extract token${NC}"
    fi
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $REGISTER_RESPONSE"
    ((FAILURES++))
fi

echo ""
echo "=== Database Statistics ==="
echo ""

# PostgreSQL stats
echo "PostgreSQL:"
USER_COUNT=$(docker exec manish-postgres psql -U manish -d manish_dev -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "N/A")
ROLE_COUNT=$(docker exec manish-postgres psql -U manish -d manish_dev -tAc "SELECT COUNT(*) FROM roles;" 2>/dev/null || echo "N/A")
PERMISSION_COUNT=$(docker exec manish-postgres psql -U manish -d manish_dev -tAc "SELECT COUNT(*) FROM permissions;" 2>/dev/null || echo "N/A")

echo "  - Users: $USER_COUNT"
echo "  - Roles: $ROLE_COUNT"
echo "  - Permissions: $PERMISSION_COUNT"

# Redis stats
echo ""
echo "Redis:"
REDIS_MEMORY=$(docker exec manish-redis redis-cli -a change_me_in_production INFO memory 2>/dev/null | grep "used_memory_human" | cut -d':' -f2 | tr -d '\r' || echo "N/A")
REDIS_KEYS=$(docker exec manish-redis redis-cli -a change_me_in_production DBSIZE 2>/dev/null | cut -d':' -f2 | tr -d '\r' || echo "N/A")

echo "  - Memory Usage: $REDIS_MEMORY"
echo "  - Total Keys: $REDIS_KEYS"

echo ""
echo "=== Performance Baseline ==="
echo ""

# Measure response times
echo -n "Auth endpoint response time: "
AUTH_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:8081/api/auth/providers 2>/dev/null || echo "N/A")
echo "${AUTH_TIME}s"

echo -n "Health endpoint response time: "
HEALTH_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3001/health 2>/dev/null || echo "N/A")
echo "${HEALTH_TIME}s"

echo ""
echo "=== Summary ==="
echo ""

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! System is healthy.${NC}"
    echo ""
    echo "Baseline metrics recorded:"
    echo "  - Users in DB: $USER_COUNT"
    echo "  - Roles in DB: $ROLE_COUNT"
    echo "  - Redis Memory: $REDIS_MEMORY"
    echo "  - Auth Response Time: ${AUTH_TIME}s"
    echo ""
    echo "✅ Safe to proceed with new feature implementation"
    exit 0
else
    echo -e "${RED}✗ $FAILURES check(s) failed. Please fix issues before proceeding.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Ensure all services are running: docker compose ps"
    echo "  2. Check service logs: docker compose logs [service-name]"
    echo "  3. Restart services: docker compose restart"
    echo "  4. Full restart: docker compose down && docker compose up -d"
    exit 1
fi
