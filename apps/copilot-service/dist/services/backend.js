"use strict";
/**
 * Backend API HTTP Client
 * Communicates with the FastAPI backend service (port 8000)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
// Timeout for backend requests (10 seconds as per spec)
const REQUEST_TIMEOUT = 10000;
/**
 * Backend API Client for patient and medical record operations
 */
class BackendClient {
    client;
    constructor() {
        this.client = axios_1.default.create({
            baseURL: env_1.config.backendApiUrl,
            timeout: REQUEST_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({
                method: config.method,
                url: config.url,
                params: config.params,
            }, 'Backend API request');
            return config;
        }, (error) => {
            logger_1.logger.error({ error: error.message }, 'Backend API request error');
            return Promise.reject(error);
        });
        // Add response interceptor for logging
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({
                status: response.status,
                url: response.config.url,
            }, 'Backend API response');
            return response;
        }, (error) => {
            logger_1.logger.error({
                error: error.message,
                status: error.response?.status,
                url: error.config?.url,
            }, 'Backend API response error');
            return Promise.reject(error);
        });
    }
    /**
     * Set JWT token for authenticated requests
     */
    setAuthToken(token) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    /**
     * Clear JWT token
     */
    clearAuthToken() {
        delete this.client.defaults.headers.common['Authorization'];
    }
    /**
     * Get a single patient by ID
     */
    async getPatient(patientId, token) {
        try {
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await this.client.get(`/api/patients/${patientId}`, { headers });
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'getPatient', { patientId });
            throw error;
        }
    }
    /**
     * Get list of patients with optional filters
     */
    async getPatients(filters = {}, token) {
        try {
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await this.client.get('/api/patients', {
                params: {
                    skip: filters.skip || 0,
                    limit: filters.limit || 100,
                },
                headers,
            });
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'getPatients', { filters });
            throw error;
        }
    }
    /**
     * Get medical records for a patient
     */
    async getMedicalRecords(patientId, filters = {}, token) {
        try {
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await this.client.get('/api/medical-records', {
                params: {
                    patient_id: patientId,
                    record_type: filters.recordType,
                    skip: filters.skip || 0,
                    limit: filters.limit || 100,
                },
                headers,
            });
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'getMedicalRecords', { patientId, filters });
            throw error;
        }
    }
    /**
     * Get a single medical record by ID
     */
    async getMedicalRecord(recordId, token) {
        try {
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await this.client.get(`/api/medical-records/${recordId}`, { headers });
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'getMedicalRecord', { recordId });
            throw error;
        }
    }
    /**
     * Find patient by user ID (for patient role ownership validation)
     */
    async findPatientByUserId(userId, token) {
        try {
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            // Get all patients and filter by user_id
            // In production, this should be a dedicated endpoint
            const patients = await this.getPatients({ limit: 1000 }, token);
            return patients.find((p) => p.user_id === userId) || null;
        }
        catch (error) {
            logger_1.logger.warn({ userId, error: error.message }, 'Failed to find patient by user ID');
            return null;
        }
    }
    /**
     * Handle API errors with consistent logging
     */
    handleError(error, operation, context) {
        const isAxiosError = axios_1.default.isAxiosError(error);
        const status = isAxiosError ? error.response?.status : undefined;
        const message = isAxiosError
            ? error.response?.data?.detail || error.message
            : error.message;
        logger_1.logger.error({
            operation,
            context,
            status,
            message,
            isTimeout: error.code === 'ECONNABORTED',
        }, `Backend API error: ${operation}`);
        // Transform error message for client consumption
        if (status === 404) {
            throw new Error(`Resource not found: ${operation}`);
        }
        else if (status === 401) {
            throw new Error('Authentication required');
        }
        else if (status === 403) {
            throw new Error('Access denied');
        }
        else if (error.code === 'ECONNABORTED') {
            throw new Error('Backend API request timed out');
        }
        else {
            throw new Error(`Backend API error: ${message}`);
        }
    }
}
// Export singleton instance
exports.backendClient = new BackendClient();
//# sourceMappingURL=backend.js.map