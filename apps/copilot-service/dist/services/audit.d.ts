import { ActionAuditLog } from '../types/medicalCoding';
export declare function logAction(audit: ActionAuditLog): Promise<void>;
export declare function getRecentActions(userId: string, limit?: number): Promise<any[]>;
//# sourceMappingURL=audit.d.ts.map