import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { SnomedConcept } from '../types/medicalCoding';

class SnowstormClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.snowstormUrl,
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  async searchConcepts(term: string, limit: number = 10): Promise<{
    items: SnomedConcept[];
    total: number;
  }> {
    try {
      logger.debug({ term, limit }, 'Searching SNOMED concepts');

      const response = await this.client.get('/MAIN/concepts', {
        params: {
          term,
          activeFilter: true,
          limit,
        },
      });

      const items = response.data.items.map((item: any) => ({
        conceptId: item.conceptId,
        term: item.pt?.term || item.fsn?.term,
        fsn: item.fsn?.term,
        definitionStatus: item.definitionStatus,
      }));

      return {
        items,
        total: response.data.total || items.length,
      };
    } catch (error: any) {
      logger.error({ error: error.message, term }, 'Snowstorm search failed');
      throw new Error(`Failed to search SNOMED codes: ${error.message}`);
    }
  }
}

export const snowstormClient = new SnowstormClient();
