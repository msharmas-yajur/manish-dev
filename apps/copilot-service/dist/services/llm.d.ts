/**
 * LLM Service Client
 * HTTP client for the LLM Service (port 8003)
 * Supports OpenAI-compatible API format
 */
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
export declare class LLMServiceError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
/**
 * LLM Service Client class
 * Handles communication with the LLM Service
 */
declare class LLMServiceClient {
    private client;
    private baseURL;
    constructor();
    /**
     * Generate a chat completion using the LLM Service
     * Uses OpenAI-compatible API format: POST /v1/chat/completions
     *
     * @param messages Array of chat messages
     * @param options Completion options
     * @param authToken Optional JWT token for authentication
     * @returns Completion response
     */
    generateCompletion(messages: ChatMessage[], options?: CompletionOptions, authToken?: string): Promise<CompletionResponse>;
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
    generateText(prompt: string, systemPrompt?: string, options?: CompletionOptions, authToken?: string): Promise<{
        content: string;
        model: string;
        usage: TokenUsage;
    }>;
    /**
     * Check if the LLM Service is healthy
     * @returns true if service is reachable
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get available models from the LLM Service
     * @param authToken Optional JWT token for authentication
     * @returns List of available models
     */
    getAvailableModels(authToken?: string): Promise<string[]>;
}
export declare const llmClient: LLMServiceClient;
export { LLMServiceClient };
//# sourceMappingURL=llm.d.ts.map