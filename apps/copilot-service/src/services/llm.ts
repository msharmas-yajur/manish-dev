/**
 * LLM Service Client
 * HTTP client for the LLM Service (port 8003)
 * Supports OpenAI-compatible API format
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * Chat message format (OpenAI-compatible)
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Completion options for LLM requests
 */
export interface CompletionOptions {
  /** Model to use (e.g., 'gpt-4', 'claude-3-opus', 'llama3') */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for sampling (0-2) */
  temperature?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Stop sequences */
  stop?: string[];
  /** Presence penalty (-2 to 2) */
  presencePenalty?: number;
  /** Frequency penalty (-2 to 2) */
  frequencyPenalty?: number;
}

/**
 * Usage information from completion response
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Choice in completion response
 */
export interface CompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

/**
 * Completion response (OpenAI-compatible format)
 */
export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChoice[];
  usage: TokenUsage;
}

/**
 * LLM Service error
 */
export class LLMServiceError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'LLM_SERVICE_ERROR') {
    super(message);
    this.name = 'LLMServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Default completion options
 */
const DEFAULT_OPTIONS: CompletionOptions = {
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
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = config.llmServiceUrl;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(
          {
            status: response.status,
            model: response.data?.model,
            usage: response.data?.usage,
          },
          'LLM Service response received'
        );
        return response;
      },
      (error: AxiosError) => {
        logger.error(
          {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data,
          },
          'LLM Service request failed'
        );
        return Promise.reject(error);
      }
    );
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
  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
    authToken?: string
  ): Promise<CompletionResponse> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    logger.info(
      {
        model: mergedOptions.model,
        messageCount: messages.length,
        maxTokens: mergedOptions.maxTokens,
      },
      'Sending request to LLM Service'
    );

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
    const cleanedBody = Object.fromEntries(
      Object.entries(requestBody).filter(([_, v]) => v !== undefined)
    );

    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await this.client.post<CompletionResponse>(
        '/v1/chat/completions',
        cleanedBody,
        { headers }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ error?: { message?: string; code?: string } }>;

        // Handle timeout
        if (axiosError.code === 'ECONNABORTED') {
          throw new LLMServiceError(
            'LLM Service request timed out after 30 seconds',
            504,
            'TIMEOUT'
          );
        }

        // Handle connection errors
        if (axiosError.code === 'ECONNREFUSED') {
          throw new LLMServiceError(
            `Unable to connect to LLM Service at ${this.baseURL}`,
            503,
            'CONNECTION_REFUSED'
          );
        }

        // Handle HTTP errors
        const statusCode = axiosError.response?.status || 500;
        const errorMessage =
          axiosError.response?.data?.error?.message ||
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
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: CompletionOptions = {},
    authToken?: string
  ): Promise<{
    content: string;
    model: string;
    usage: TokenUsage;
  }> {
    const messages: ChatMessage[] = [];

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
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get available models from the LLM Service
   * @param authToken Optional JWT token for authentication
   * @returns List of available models
   */
  async getAvailableModels(authToken?: string): Promise<string[]> {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await this.client.get('/v1/models', { headers });
      return response.data.data?.map((m: { id: string }) => m.id) || [];
    } catch (error) {
      logger.warn({ error }, 'Failed to fetch available models');
      return [];
    }
  }
}

// Export singleton instance
export const llmClient = new LLMServiceClient();

// Export class for testing
export { LLMServiceClient };
