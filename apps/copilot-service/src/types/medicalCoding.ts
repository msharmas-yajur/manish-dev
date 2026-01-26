// Medical Coding Action Types

export interface MedicalCodeSearchParams {
  searchTerm: string;
  limit?: number; // Default 10, max 50
}

export interface SnomedConcept {
  conceptId: string;
  term: string;
  fsn: string; // Fully Specified Name
  definitionStatus: string;
}

export interface MedicalCodeSearchResult {
  codes: SnomedConcept[];
  total: number;
  searchTerm: string;
}

// Audit logging types
export interface ActionAuditLog {
  userId: string;
  actionName: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  permissionsChecked: string[];
  success: boolean;
  executionTimeMs: number;
}

// User context for actions
export interface ActionContext {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}
