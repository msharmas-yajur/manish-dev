from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


# Chat Completion Models (OpenAI-compatible format)
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant", "function"]
    content: str
    name: str | None = None


class ChatRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=2048, ge=1, le=128000)
    top_p: float = Field(default=1.0, ge=0, le=1)
    frequency_penalty: float = Field(default=0.0, ge=-2, le=2)
    presence_penalty: float = Field(default=0.0, ge=-2, le=2)
    stream: bool = False
    user_id: str | None = None  # For fetching user's provider config
    pipeline: str | None = None  # Pipeline type for auto-routing


class ChatChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str | None


class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[ChatChoice]
    usage: Usage


# Embedding Models
class EmbeddingRequest(BaseModel):
    model: str = "text-embedding-3-small"
    input: str | list[str]
    user_id: str | None = None
    pipeline: str | None = None


class EmbeddingData(BaseModel):
    object: str = "embedding"
    index: int
    embedding: list[float]


class EmbeddingResponse(BaseModel):
    object: str = "list"
    data: list[EmbeddingData]
    model: str
    usage: Usage


# Model Information
class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    description: str | None
    context_window: int | None
    supports_vision: bool
    supports_function_calling: bool
    input_cost_per_1k: float | None
    output_cost_per_1k: float | None


# Provider Configuration
class ProviderConfig(BaseModel):
    provider_id: str
    name: str
    is_enabled: bool
    is_verified: bool
    has_api_key: bool
    custom_endpoint: str | None
    last_used_at: datetime | None


# Pipeline Configuration
class PipelineConfig(BaseModel):
    pipeline_type: str
    name: str
    description: str | None
    model_id: str
    provider_id: str
    temperature: float
    max_tokens: int
    top_p: float
    frequency_penalty: float
    presence_penalty: float
    system_prompt: str | None
    is_enabled: bool


# User Provider Setup
class ProviderSetupRequest(BaseModel):
    provider_id: str
    api_key: str | None = None
    custom_endpoint: str | None = None


class ProviderSetupResponse(BaseModel):
    provider_id: str
    is_verified: bool
    message: str


# User Pipeline Setup
class PipelineSetupRequest(BaseModel):
    pipeline_type: str
    model_id: str
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    system_prompt: str | None = None


# Health Check
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    postgres: str
    redis: str
    providers: dict[str, str]
