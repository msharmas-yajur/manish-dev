"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
router.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        service: 'copilot-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        dependencies: {
            postgres: await (0, database_1.checkPostgresHealth)() ? 'connected' : 'disconnected',
            redis: await (0, database_1.checkRedisHealth)() ? 'connected' : 'disconnected',
            llmService: 'unknown' // Will check via HTTP
        }
    };
    // Check LLM Service
    try {
        await axios_1.default.get(`${env_1.config.llmServiceUrl}/health`, { timeout: 2000 });
        health.dependencies.llmService = 'healthy';
    }
    catch {
        health.dependencies.llmService = 'unhealthy';
    }
    const allHealthy = Object.values(health.dependencies).every(status => status === 'connected' || status === 'healthy');
    res.status(allHealthy ? 200 : 503).json(health);
});
exports.default = router;
//# sourceMappingURL=health.js.map