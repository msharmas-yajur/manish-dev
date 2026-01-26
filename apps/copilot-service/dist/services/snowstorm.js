"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.snowstormClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
class SnowstormClient {
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: env_1.config.snowstormUrl,
            timeout: 5000,
            headers: {
                'Accept': 'application/json',
            },
        });
    }
    async searchConcepts(term, limit = 10) {
        try {
            logger_1.logger.debug({ term, limit }, 'Searching SNOMED concepts');
            const response = await this.client.get('/MAIN/concepts', {
                params: {
                    term,
                    activeFilter: true,
                    limit,
                },
            });
            const items = response.data.items.map((item) => ({
                conceptId: item.conceptId,
                term: item.pt?.term || item.fsn?.term,
                fsn: item.fsn?.term,
                definitionStatus: item.definitionStatus,
            }));
            return {
                items,
                total: response.data.total || items.length,
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, term }, 'Snowstorm search failed');
            throw new Error(`Failed to search SNOMED codes: ${error.message}`);
        }
    }
}
exports.snowstormClient = new SnowstormClient();
//# sourceMappingURL=snowstorm.js.map