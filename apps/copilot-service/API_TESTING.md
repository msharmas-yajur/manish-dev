# Copilot Service API Testing Guide

## Base URL
```
http://localhost:8004
```

## Authentication
All agent endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

Get a token by logging in through the BFF:
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"your_password"}'
```

## Available Endpoints

### 1. List Available Actions
**GET** `/api/agents/actions`

Returns metadata about all available agent actions.

**Example:**
```bash
curl http://localhost:8004/api/agents/actions \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "actions": [
      {
        "name": "searchMedicalCodes",
        "description": "Search for SNOMED CT medical codes using Snowstorm",
        "requiredPermissions": ["llm:use", "records:read"],
        "parameters": {
          "searchTerm": {
            "type": "string",
            "required": true,
            "description": "The clinical term to search for"
          },
          "limit": {
            "type": "number",
            "required": false,
            "default": 10,
            "max": 50,
            "description": "Maximum number of results to return"
          }
        },
        "responseType": "MedicalCodeSearchResult"
      }
    ]
  }
}
```

### 2. Search Medical Codes
**POST** `/api/agents/search-medical-codes`

Search for SNOMED CT medical codes.

**Required Permissions:**
- `llm:use`
- `records:read`

**Allowed Roles:**
- physician
- nurse
- medical_assistant
- system_admin

**Request Body:**
```json
{
  "searchTerm": "diabetes",
  "limit": 10
}
```

**Example:**
```bash
curl -X POST http://localhost:8004/api/agents/search-medical-codes \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"searchTerm":"diabetes","limit":5}'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "codes": [
      {
        "conceptId": "73211009",
        "term": "Diabetes mellitus",
        "fsn": "Diabetes mellitus (disorder)",
        "definitionStatus": "Fully defined"
      }
    ],
    "total": 42,
    "searchTerm": "diabetes"
  }
}
```

**Error Responses:**

*Missing Authentication (401):*
```json
{
  "success": false,
  "error": {
    "message": "No token provided",
    "code": "UNAUTHORIZED"
  }
}
```

*Missing Permissions (403):*
```json
{
  "success": false,
  "error": {
    "message": "Missing required permissions: llm:use, records:read",
    "code": "PERMISSION_DENIED"
  }
}
```

*Invalid Parameters (400):*
```json
{
  "success": false,
  "error": {
    "message": "searchTerm is required and must be a string",
    "code": "INVALID_PARAMS"
  }
}
```

## Testing Checklist

### Prerequisites
- [ ] copilot-service running on port 8004
- [ ] postgres healthy
- [ ] redis healthy
- [ ] llm-service healthy
- [ ] Snowstorm running on port 8085 (for actual SNOMED searches)

### Test 1: Authentication
```bash
# Should fail with 401 Unauthorized
curl http://localhost:8004/api/agents/actions
```

### Test 2: List Actions (Valid Token)
```bash
# Should return action metadata
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8004/api/agents/actions
```

### Test 3: RBAC Enforcement
```bash
# Login as regular user (no medical permissions)
USER_TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"regular@user.com","password":"password"}' | jq -r '.data.token')

# Should fail with 403 Permission Denied
curl -X POST http://localhost:8004/api/agents/search-medical-codes \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"diabetes"}'
```

### Test 4: Medical Coding (Physician Role)
```bash
# Login as physician
PHYSICIAN_TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@hospital.com","password":"password"}' | jq -r '.data.token')

# Should succeed (if Snowstorm is running)
curl -X POST http://localhost:8004/api/agents/search-medical-codes \
  -H "Authorization: Bearer $PHYSICIAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"diabetes","limit":5}'
```

### Test 5: Audit Logging
```bash
# Check audit logs after making requests
docker exec manish-postgres psql -U manish -d manish_dev \
  -c "SELECT user_id, action_name, success, execution_time_ms, created_at
      FROM copilot_action_audit
      ORDER BY created_at DESC
      LIMIT 10;"
```

## Known Limitations

1. **Snowstorm Not Running**: If Snowstorm service is not configured (Task #10), medical code searches will fail with:
   ```
   Error: Failed to search SNOMED codes: getaddrinfo ENOTFOUND snowstorm
   ```

2. **Redis Cache**: User permissions are cached for 5 minutes. After role changes, clear cache:
   ```bash
   docker exec manish-redis redis-cli -a YOUR_PASSWORD \
     DEL "rbac:permissions:USER_ID" "rbac:roles:USER_ID"
   ```

3. **JWT Expiry**: Tokens expire after 24 hours. Login again to get fresh token.

## Curl Tips

**Issue**: Token not being recognized
```bash
# ❌ Wrong (variable not expanded)
TOKEN=abc123
curl -H "Authorization: Bearer $TOKEN" ...

# ✅ Correct (use single quotes for literal token)
curl -H 'Authorization: Bearer abc123' ...

# ✅ Or export the variable
export TOKEN=abc123
curl -H "Authorization: Bearer $TOKEN" ...
```

## Next Steps

- [ ] Complete Task #10: Add Snowstorm to docker-compose
- [ ] Complete Task #12: Integrate CopilotKit runtime
- [ ] Add more agent actions (getPatientData, generateClinicalNote)
- [ ] Add integration tests
- [ ] Add E2E tests with Playwright
