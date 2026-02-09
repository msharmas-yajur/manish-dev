# Database Schema

## Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),      -- NULL for OAuth-only
  role VARCHAR(50) DEFAULT 'user', -- Legacy, use user_roles
  google_id VARCHAR(255),          -- For Google OAuth
  frappe_id VARCHAR(255),          -- For Frappe/ERPNext OAuth
  auth_provider VARCHAR(50),       -- 'local' | 'google' | 'frappe'
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP
)
```

## Patients Table
```sql
patients (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  medical_record_number VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_type VARCHAR(5),
  allergies TEXT[],
  -- Sync fields (added Feb 2026):
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  abha_id VARCHAR(50) UNIQUE,       -- ABHA sync key
  abha_address VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  status VARCHAR(20),               -- LINKED/NOT_LINKED/ACTIVE/INACTIVE
  erpnext_patient_id VARCHAR(100),  -- ERPNext Patient name
  sync_source VARCHAR(20),          -- 'caladrius' or 'erpnext'
  last_synced_at TIMESTAMPTZ
)
```

## RBAC Tables
```sql
roles (id, name, display_name, description, is_system, is_active)
permissions (id, name, display_name, resource, action)
role_permissions (role_id, permission_id)
user_roles (user_id, role_id, assigned_by, assigned_at)
```

## LLM Configuration Tables
```sql
llm_providers (id, name, requires_api_key, base_url)
user_llm_providers (user_id, provider_id, api_key_encrypted)
llm_models (id, provider_id, name, context_window, costs)
pipeline_types (id, name, default_model_id)
user_pipeline_configs (user_id, pipeline_type_id, model_id, temperature, ...)
```

## Copilot Audit Table
```sql
CREATE TABLE copilot_action_audit (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) CASCADE,
    action_name VARCHAR(100),
    parameters JSONB,
    result JSONB,
    error TEXT,
    permissions_checked VARCHAR(255)[],
    success BOOLEAN,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Indexes: user_id, action_name, created_at
```
