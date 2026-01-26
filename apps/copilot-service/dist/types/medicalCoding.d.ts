export interface MedicalCodeSearchParams {
    searchTerm: string;
    limit?: number;
}
export interface SnomedConcept {
    conceptId: string;
    term: string;
    fsn: string;
    definitionStatus: string;
}
export interface MedicalCodeSearchResult {
    codes: SnomedConcept[];
    total: number;
    searchTerm: string;
}
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
export interface ActionContext {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
}
//# sourceMappingURL=medicalCoding.d.ts.map