/**
 * Settings feature type definitions for Caladrius Health AI Studio
 */

// ============================================================================
// Profile Settings Types
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  organization?: string;
  department?: string;
  timezone: string;
  authProvider: 'local' | 'google';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  organization?: string;
  department?: string;
  timezone?: string;
}

// ============================================================================
// Security Settings Types
// ============================================================================

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorSettings {
  isEnabled: boolean;
  method?: 'app' | 'sms';
  phoneNumber?: string;
  lastUpdated?: string;
}

export interface ActiveSession {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  lastUsed?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expiresIn?: number; // days
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  secret: string; // Only shown once
}

// ============================================================================
// LLM Configuration Types
// ============================================================================

export type LLMProvider = 'openai' | 'anthropic' | 'azure' | 'google' | 'ollama';

export interface LLMProviderConfig {
  id: string;
  provider: LLMProvider;
  name: string;
  description: string;
  requiresApiKey: boolean;
  isConfigured: boolean;
  isEnabled: boolean;
  baseUrl?: string;
  models: LLMModel[];
}

export interface LLMModel {
  id: string;
  name: string;
  displayName: string;
  contextWindow: number;
  costPer1kInputTokens?: number;
  costPer1kOutputTokens?: number;
  capabilities: string[];
}

export interface LLMSettings {
  selectedProvider: LLMProvider;
  selectedModel: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface UpdateLLMSettingsRequest {
  provider?: LLMProvider;
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface LLMConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelInfo?: {
    name: string;
    provider: string;
  };
}

// ============================================================================
// Connector Settings Types
// ============================================================================

export type EHRProvider = 'epic' | 'cerner' | 'meditech' | 'allscripts' | 'athena' | 'eclinicalworks';

export type ConnectorStatus = 'connected' | 'disconnected' | 'pending' | 'error';

export interface EHRConnector {
  id: string;
  provider: EHRProvider;
  name: string;
  description: string;
  status: ConnectorStatus;
  lastSync?: string;
  errorMessage?: string;
  configuration: EHRConnectorConfig;
  capabilities: string[];
}

export interface EHRConnectorConfig {
  clientId?: string;
  baseUrl?: string;
  environment: 'sandbox' | 'production';
  scopes?: string[];
}

export interface ConnectEHRRequest {
  provider: EHRProvider;
  clientId: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
  scopes?: string[];
}

// ============================================================================
// Tools Settings Types
// ============================================================================

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'component' | 'iframe' | 'link';
  url?: string;
  isBuiltIn: boolean;
  isEnabled: boolean;
  isCustom: boolean;
  order: number;
  requiredPermissions?: string[];
}

export interface CustomToolRequest {
  name: string;
  description: string;
  url: string;
  icon: string;
}

export interface UpdateToolOrderRequest {
  toolId: string;
  newOrder: number;
}

// ============================================================================
// Settings Section Types
// ============================================================================

export type SettingsSection =
  | 'profile'
  | 'security'
  | 'llm-config'
  | 'connectors'
  | 'tools';

export interface SettingsSectionConfig {
  id: SettingsSection;
  label: string;
  icon: string;
  description: string;
}

// ============================================================================
// Settings State Types
// ============================================================================

export interface SettingsState {
  activeSection: SettingsSection;
  profile: UserProfile | null;
  twoFactor: TwoFactorSettings | null;
  sessions: ActiveSession[];
  apiKeys: ApiKey[];
  llmProviders: LLMProviderConfig[];
  llmSettings: LLMSettings | null;
  connectors: EHRConnector[];
  tools: ToolConfig[];
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Timezone Options
// ============================================================================

export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
] as const;
