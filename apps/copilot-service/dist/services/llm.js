"use strict";
/**
 * LLM Service Client
 * HTTP client for the LLM Service (port 8003)
 * Supports OpenAI-compatible API format
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMServiceClient = exports.llmClient = exports.LLMServiceError = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
/**
 * LLM Service error
 */
class LLMServiceError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code = 'LLM_SERVICE_ERROR') {
        super(message);
        this.name = 'LLMServiceError';
        this.statusCode = statusCode;
        this.code = code;
    }
}
exports.LLMServiceError = LLMServiceError;
/**
 * Default completion options
 */
const DEFAULT_OPTIONS = {
    model: 'gpt-4',
    maxTokens: 2048,
    temperature: 0.3, // Lower temperature for clinical notes (more deterministic)
};
/**
 * Default timeout for LLM requests (30 seconds as specified)
 */
const DEFAULT_TIMEOUT = 30000;
/**
 * LLM Service Client class
 * Handles communication with the LLM Service
 */
class LLMServiceClient {
    client;
    baseURL;
    constructor() {
        this.baseURL = env_1.config.llmServiceUrl;
        this.client = axios_1.default.create({
            baseURL: this.baseURL,
            timeout: DEFAULT_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        // Add response interceptor for logging
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({
                status: response.status,
                model: response.data?.model,
                usage: response.data?.usage,
            }, 'LLM Service response received');
            return response;
        }, (error) => {
            logger_1.logger.error({
                status: error.response?.status,
                message: error.message,
                data: error.response?.data,
            }, 'LLM Service request failed');
            return Promise.reject(error);
        });
    }
    /**
     * Generate a chat completion using the LLM Service
     * Uses OpenAI-compatible API format: POST /v1/chat/completions
     *
     * @param messages Array of chat messages
     * @param options Completion options
     * @param authToken Optional JWT token for authentication
     * @returns Completion response
     */
    async generateCompletion(messages, options = {}, authToken) {
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        logger_1.logger.info({
            model: mergedOptions.model,
            messageCount: messages.length,
            maxTokens: mergedOptions.maxTokens,
        }, 'Sending request to LLM Service');
        const requestBody = {
            model: mergedOptions.model,
            messages,
            max_tokens: mergedOptions.maxTokens,
            temperature: mergedOptions.temperature,
            top_p: mergedOptions.topP,
            stop: mergedOptions.stop,
            presence_penalty: mergedOptions.presencePenalty,
            frequency_penalty: mergedOptions.frequencyPenalty,
        };
        // Remove undefined values
        const cleanedBody = Object.fromEntries(Object.entries(requestBody).filter(([_, v]) => v !== undefined));
        try {
            const headers = {};
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            const response = await this.client.post('/v1/chat/completions', cleanedBody, { headers });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                // Handle timeout
                if (axiosError.code === 'ECONNABORTED') {
                    throw new LLMServiceError('LLM Service request timed out after 30 seconds', 504, 'TIMEOUT');
                }
                // Handle connection errors
                if (axiosError.code === 'ECONNREFUSED') {
                    throw new LLMServiceError(`Unable to connect to LLM Service at ${this.baseURL}`, 503, 'CONNECTION_REFUSED');
                }
                // Handle HTTP errors
                const statusCode = axiosError.response?.status || 500;
                const errorMessage = axiosError.response?.data?.error?.message ||
                    axiosError.message ||
                    'Unknown LLM Service error';
                const errorCode = axiosError.response?.data?.error?.code || 'LLM_SERVICE_ERROR';
                throw new LLMServiceError(errorMessage, statusCode, errorCode);
            }
            // Re-throw non-Axios errors
            throw error;
        }
    }
    /**
     * Generate a simple text completion
     * Convenience method that returns just the generated text
     *
     * @param prompt User prompt
     * @param systemPrompt Optional system prompt
     * @param options Completion options
     * @param authToken Optional JWT token for authentication
     * @returns Generated text content
     */
    async generateText(prompt, systemPrompt, options = {}, authToken) {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });
        const response = await this.generateCompletion(messages, options, authToken);
        const content = response.choices[0]?.message?.content || '';
        return {
            content,
            model: response.model,
            usage: response.usage,
        };
    }
    /**
     * Check if the LLM Service is healthy
     * @returns true if service is reachable
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health', { timeout: 5000 });
            return response.status === 200;
        }
        catch {
            return false;
        }
    }
    /**
     * Get available models from the LLM Service
     * @param authToken Optional JWT token for authentication
     * @returns List of available models
     */
    async getAvailableModels(authToken) {
        try {
            const headers = {};
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            const response = await this.client.get('/v1/models', { headers });
            return response.data.data?.map((m) => m.id) || [];
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Failed to fetch available models');
            return [];
        }
    }
}
exports.LLMServiceClient = LLMServiceClient;
// Export singleton instance
exports.llmClient = new LLMServiceClient();
//# sourceMappingURL=llm.js.map