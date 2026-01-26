import { SnomedConcept } from '../types/medicalCoding';
declare class SnowstormClient {
    private client;
    constructor();
    searchConcepts(term: string, limit?: number): Promise<{
        items: SnomedConcept[];
        total: number;
    }>;
}
export declare const snowstormClient: SnowstormClient;
export {};
//# sourceMappingURL=snowstorm.d.ts.map