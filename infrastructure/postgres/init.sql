-- Healthcare Application Database Schema
-- PostgreSQL Initialization Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (supports both local and OAuth authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULL for OAuth-only users
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_picture VARCHAR(500),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    -- OAuth fields
    google_id VARCHAR(255) UNIQUE,
    frappe_id VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(50) DEFAULT 'local',  -- 'local', 'google', 'frappe'
    -- Password reset fields
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    medical_record_number VARCHAR(50) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_type VARCHAR(10),
    allergies TEXT[],
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    abha_id VARCHAR(50),
    abha_address VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'NOT_LINKED',
    erpnext_patient_id VARCHAR(100),
    sync_source VARCHAR(20) DEFAULT 'caladrius',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Practitioners table
CREATE TABLE IF NOT EXISTS practitioners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    license_number VARCHAR(100) UNIQUE,
    specialty VARCHAR(100),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    practitioner_id UUID REFERENCES practitioners(id),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled',
    appointment_type VARCHAR(50),
    notes TEXT,
    livekit_room_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    practitioner_id UUID REFERENCES practitioners(id),
    appointment_id UUID REFERENCES appointments(id),
    record_type VARCHAR(50) NOT NULL,
    snomed_codes TEXT[],
    diagnosis TEXT,
    treatment_plan TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LLM interactions log
CREATE TABLE IF NOT EXISTS llm_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    model VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    latency_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(medical_record_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_abha_id ON patients(abha_id) WHERE abha_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_erpnext_id ON patients(erpnext_patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_practitioner ON appointments(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_llm_interactions_user ON llm_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_interactions_created ON llm_interactions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practitioners_updated_at BEFORE UPDATE ON practitioners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- User LLM Provider Configurations
-- ===========================================

-- Supported LLM providers that users can configure
CREATE TABLE IF NOT EXISTS llm_providers (
    id VARCHAR(50) PRIMARY KEY,  -- 'openai', 'anthropic', 'ollama', 'azure', 'google'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_api_key BOOLEAN DEFAULT true,
    base_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default providers
INSERT INTO llm_providers (id, name, description, requires_api_key, base_url) VALUES
    ('openai', 'OpenAI', 'GPT-4, GPT-3.5, and other OpenAI models', true, 'https://api.openai.com/v1'),
    ('anthropic', 'Anthropic', 'Claude 3 family of models', true, 'https://api.anthropic.com'),
    ('ollama', 'Ollama', 'Self-hosted open source models (Llama, Mistral, etc.)', false, 'http://ollama:11434'),
    ('azure', 'Azure OpenAI', 'Microsoft Azure hosted OpenAI models', true, NULL),
    ('google', 'Google AI', 'Gemini and other Google AI models', true, 'https://generativelanguage.googleapis.com')
ON CONFLICT (id) DO NOTHING;

-- User's configured LLM providers (encrypted API keys)
CREATE TABLE IF NOT EXISTS user_llm_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL REFERENCES llm_providers(id),
    api_key_encrypted TEXT,  -- Encrypted API key
    custom_endpoint VARCHAR(500),  -- For custom/self-hosted endpoints
    is_enabled BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,  -- Has the key been tested successfully
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider_id)
);

-- Available models for each provider
CREATE TABLE IF NOT EXISTS llm_models (
    id VARCHAR(100) PRIMARY KEY,  -- e.g., 'gpt-4', 'claude-3-opus'
    provider_id VARCHAR(50) NOT NULL REFERENCES llm_providers(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    context_window INTEGER,
    supports_vision BOOLEAN DEFAULT false,
    supports_function_calling BOOLEAN DEFAULT false,
    input_cost_per_1k DECIMAL(10, 6),  -- Cost per 1000 tokens
    output_cost_per_1k DECIMAL(10, 6),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default models
INSERT INTO llm_models (id, provider_id, name, description, context_window, supports_vision, supports_function_calling, input_cost_per_1k, output_cost_per_1k) VALUES
    -- OpenAI models
    ('gpt-4o', 'openai', 'GPT-4o', 'Most capable multimodal model', 128000, true, true, 0.005, 0.015),
    ('gpt-4o-mini', 'openai', 'GPT-4o Mini', 'Fast and affordable', 128000, true, true, 0.00015, 0.0006),
    ('gpt-4-turbo', 'openai', 'GPT-4 Turbo', 'GPT-4 with vision and 128k context', 128000, true, true, 0.01, 0.03),
    ('gpt-3.5-turbo', 'openai', 'GPT-3.5 Turbo', 'Fast and cost-effective', 16385, false, true, 0.0005, 0.0015),
    -- Anthropic models
    ('claude-3-opus-20240229', 'anthropic', 'Claude 3 Opus', 'Most powerful Claude model', 200000, true, true, 0.015, 0.075),
    ('claude-3-sonnet-20240229', 'anthropic', 'Claude 3 Sonnet', 'Balanced performance and cost', 200000, true, true, 0.003, 0.015),
    ('claude-3-haiku-20240307', 'anthropic', 'Claude 3 Haiku', 'Fast and lightweight', 200000, true, true, 0.00025, 0.00125),
    ('claude-3-5-sonnet-20241022', 'anthropic', 'Claude 3.5 Sonnet', 'Latest Sonnet with improved performance', 200000, true, true, 0.003, 0.015),
    -- Ollama models (self-hosted, no cost)
    ('llama3', 'ollama', 'Llama 3', 'Meta Llama 3 8B', 8192, false, false, 0, 0),
    ('llama3:70b', 'ollama', 'Llama 3 70B', 'Meta Llama 3 70B', 8192, false, false, 0, 0),
    ('mistral', 'ollama', 'Mistral 7B', 'Mistral AI 7B model', 32768, false, false, 0, 0),
    ('codellama', 'ollama', 'Code Llama', 'Code-specialized Llama', 16384, false, false, 0, 0),
    ('mixtral', 'ollama', 'Mixtral 8x7B', 'Mistral MoE model', 32768, false, false, 0, 0),
    -- Google models
    ('gemini-1.5-pro', 'google', 'Gemini 1.5 Pro', 'Google most capable model', 1000000, true, true, 0.00125, 0.005),
    ('gemini-1.5-flash', 'google', 'Gemini 1.5 Flash', 'Fast and efficient', 1000000, true, true, 0.000075, 0.0003)
ON CONFLICT (id) DO NOTHING;

-- Pipeline types available in the application
CREATE TABLE IF NOT EXISTS pipeline_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_model_id VARCHAR(100) REFERENCES llm_models(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default pipeline types
INSERT INTO pipeline_types (id, name, description, default_model_id) VALUES
    ('chat', 'General Chat', 'General conversation and Q&A', 'gpt-4o-mini'),
    ('summarization', 'Summarization', 'Document and text summarization', 'gpt-4o-mini'),
    ('code_generation', 'Code Generation', 'Code writing and assistance', 'gpt-4o'),
    ('medical_coding', 'Medical Coding', 'SNOMED CT and ICD code suggestions', 'gpt-4o'),
    ('clinical_notes', 'Clinical Notes', 'Clinical documentation assistance', 'gpt-4o'),
    ('embeddings', 'Embeddings', 'Text embedding generation', 'gpt-4o-mini'),
    ('translation', 'Translation', 'Medical document translation', 'gpt-4o-mini'),
    ('extraction', 'Data Extraction', 'Extract structured data from text', 'gpt-4o')
ON CONFLICT (id) DO NOTHING;

-- User's pipeline configurations
CREATE TABLE IF NOT EXISTS user_pipeline_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pipeline_type_id VARCHAR(50) NOT NULL REFERENCES pipeline_types(id),
    model_id VARCHAR(100) NOT NULL REFERENCES llm_models(id),
    temperature DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    top_p DECIMAL(3, 2) DEFAULT 1.0,
    frequency_penalty DECIMAL(3, 2) DEFAULT 0.0,
    presence_penalty DECIMAL(3, 2) DEFAULT 0.0,
    system_prompt TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, pipeline_type_id)
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_user_llm_providers_user ON user_llm_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_llm_providers_provider ON user_llm_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_llm_models_provider ON llm_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_configs_user ON user_pipeline_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_configs_pipeline ON user_pipeline_configs(pipeline_type_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_frappe_id ON users(frappe_id);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Apply triggers to new tables
CREATE TRIGGER update_user_llm_providers_updated_at BEFORE UPDATE ON user_llm_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_pipeline_configs_updated_at BEFORE UPDATE ON user_pipeline_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Role-Based Access Control (RBAC)
-- ===========================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- User-Role mapping
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Create indexes for RBAC tables
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- Apply trigger to roles table
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Seed Default Roles
-- ===========================================

INSERT INTO roles (name, display_name, description, is_system) VALUES
    ('system_admin', 'System Administrator', 'Full system access with all permissions', true),
    ('physician', 'Physician', 'Licensed medical doctor with full clinical access', true),
    ('nurse', 'Nurse', 'Registered nurse with patient care access', true),
    ('medical_assistant', 'Medical Assistant', 'Clinical support staff with limited access', true),
    ('receptionist', 'Receptionist', 'Front desk staff with scheduling access', true),
    ('billing_staff', 'Billing Staff', 'Billing department with financial access', true),
    ('patient', 'Patient', 'Patient portal access to own records', true),
    ('user', 'User', 'Default role for new users with minimal access', true)
ON CONFLICT (name) DO NOTHING;

-- ===========================================
-- Seed Default Permissions
-- ===========================================

INSERT INTO permissions (name, display_name, description, resource, action) VALUES
    -- User permissions
    ('users:create', 'Create Users', 'Create new user accounts', 'users', 'create'),
    ('users:read', 'View Users', 'View user profiles', 'users', 'read'),
    ('users:update', 'Update Users', 'Update user profiles', 'users', 'update'),
    ('users:delete', 'Delete Users', 'Delete user accounts', 'users', 'delete'),

    -- Role permissions
    ('roles:create', 'Create Roles', 'Create new roles', 'roles', 'create'),
    ('roles:read', 'View Roles', 'View role definitions', 'roles', 'read'),
    ('roles:update', 'Update Roles', 'Update role permissions', 'roles', 'update'),
    ('roles:delete', 'Delete Roles', 'Delete roles', 'roles', 'delete'),
    ('roles:assign', 'Assign Roles', 'Assign roles to users', 'roles', 'assign'),

    -- Patient permissions
    ('patients:create', 'Create Patients', 'Create patient records', 'patients', 'create'),
    ('patients:read', 'View Patients', 'View patient information', 'patients', 'read'),
    ('patients:update', 'Update Patients', 'Update patient records', 'patients', 'update'),
    ('patients:delete', 'Delete Patients', 'Delete patient records', 'patients', 'delete'),

    -- Appointment permissions
    ('appointments:create', 'Create Appointments', 'Schedule appointments', 'appointments', 'create'),
    ('appointments:read', 'View Appointments', 'View appointment schedules', 'appointments', 'read'),
    ('appointments:update', 'Update Appointments', 'Modify appointments', 'appointments', 'update'),
    ('appointments:delete', 'Delete Appointments', 'Cancel appointments', 'appointments', 'delete'),

    -- Medical records permissions
    ('records:create', 'Create Records', 'Create medical records', 'records', 'create'),
    ('records:read', 'View Records', 'View medical records', 'records', 'read'),
    ('records:update', 'Update Records', 'Update medical records', 'records', 'update'),
    ('records:delete', 'Delete Records', 'Delete medical records', 'records', 'delete'),

    -- Prescription permissions
    ('prescriptions:create', 'Create Prescriptions', 'Write prescriptions', 'prescriptions', 'create'),
    ('prescriptions:read', 'View Prescriptions', 'View prescriptions', 'prescriptions', 'read'),
    ('prescriptions:update', 'Update Prescriptions', 'Modify prescriptions', 'prescriptions', 'update'),
    ('prescriptions:delete', 'Delete Prescriptions', 'Cancel prescriptions', 'prescriptions', 'delete'),

    -- Billing permissions
    ('billing:create', 'Create Bills', 'Create billing records', 'billing', 'create'),
    ('billing:read', 'View Bills', 'View billing information', 'billing', 'read'),
    ('billing:update', 'Update Bills', 'Update billing records', 'billing', 'update'),

    -- LLM permissions
    ('llm:use', 'Use LLM', 'Use AI/LLM features', 'llm', 'use'),
    ('llm:configure', 'Configure LLM', 'Configure LLM providers and models', 'llm', 'configure'),

    -- Admin permissions
    ('admin:access', 'Admin Access', 'Access admin dashboard', 'admin', 'access'),
    ('admin:audit', 'View Audit Logs', 'View system audit logs', 'admin', 'audit'),

    -- Own data permissions (for patients)
    ('own_records:read', 'View Own Records', 'View own medical records', 'own_records', 'read'),
    ('own_appointments:create', 'Book Own Appointments', 'Schedule own appointments', 'own_appointments', 'create'),
    ('own_appointments:read', 'View Own Appointments', 'View own appointments', 'own_appointments', 'read'),
    ('own_appointments:update', 'Update Own Appointments', 'Modify own appointments', 'own_appointments', 'update'),
    ('own_appointments:delete', 'Cancel Own Appointments', 'Cancel own appointments', 'own_appointments', 'delete'),
    ('own_profile:read', 'View Own Profile', 'View own user profile', 'own_profile', 'read'),
    ('own_profile:update', 'Update Own Profile', 'Update own user profile', 'own_profile', 'update')
ON CONFLICT (name) DO NOTHING;

-- ===========================================
-- Assign Permissions to Roles
-- ===========================================

-- System Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'system_admin'
ON CONFLICT DO NOTHING;

-- Physician: Clinical permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'physician' AND p.name IN (
    'patients:create', 'patients:read', 'patients:update',
    'appointments:create', 'appointments:read', 'appointments:update', 'appointments:delete',
    'records:create', 'records:read', 'records:update',
    'prescriptions:create', 'prescriptions:read', 'prescriptions:update', 'prescriptions:delete',
    'llm:use', 'llm:configure',
    'own_profile:read', 'own_profile:update'
)
ON CONFLICT DO NOTHING;

-- Nurse: Patient care permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'nurse' AND p.name IN (
    'patients:read', 'patients:update',
    'appointments:read', 'appointments:update',
    'records:create', 'records:read', 'records:update',
    'prescriptions:read',
    'llm:use',
    'own_profile:read', 'own_profile:update'
)
ON CONFLICT DO NOTHING;

-- Medical Assistant: Limited clinical permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'medical_assistant' AND p.name IN (
    'patients:read',
    'appointments:create', 'appointments:read', 'appointments:update',
    'records:read',
    'llm:use',
    'own_profile:read', 'own_profile:update'
)
ON CONFLICT DO NOTHING;

-- Receptionist: Scheduling permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'receptionist' AND p.name IN (
    'patients:read',
    'appointments:create', 'appointments:read', 'appointments:update', 'appointments:delete',
    'own_profile:read', 'own_profile:update'
)
ON CONFLICT DO NOTHING;

-- Billing Staff: Financial permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'billing_staff' AND p.name IN (
    'patients:read',
    'appointments:read',
    'billing:create', 'billing:read', 'billing:update',
    'own_profile:read', 'own_profile:update'
)
ON CONFLICT DO NOTHING;

-- Patient: Own data permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'patient' AND p.name IN (
    'own_records:read',
    'own_appointments:create', 'own_appointments:read', 'own_appointments:update', 'own_appointments:delete',
    'own_profile:read', 'own_profile:update',
    'llm:use'
)
ON CONFLICT DO NOTHING;

-- User: Minimal permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
    'own_profile:read', 'own_profile:update'
)
ON CONFLICT DO NOTHING;

-- ===========================================
-- CopilotKit Audit Tables (Phase 2)
-- ===========================================

-- Track all agent action executions
CREATE TABLE IF NOT EXISTS copilot_action_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_name VARCHAR(100) NOT NULL,
    parameters JSONB NOT NULL,
    result JSONB,
    error TEXT,
    permissions_checked VARCHAR(255)[],
    success BOOLEAN DEFAULT true,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_copilot_action_audit_user ON copilot_action_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_action_audit_action ON copilot_action_audit(action_name);
CREATE INDEX IF NOT EXISTS idx_copilot_action_audit_created ON copilot_action_audit(created_at);

-- Add comment
COMMENT ON TABLE copilot_action_audit IS 'Audit trail for all CopilotKit agent actions';
