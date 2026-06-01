# app/models.py
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import List, Optional, Any

# --- Request Schemas ---

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str = Field(..., max_length=100000)

class ChatRequest(BaseModel):
    model: str = Field(..., max_length=150)
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=100)
    stream: bool = True
    max_tokens: int = Field(default=1000, ge=1, le=8192)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        allowed = [
            "gemini/gemini-1.5-flash",
            "gemini/gemini-1.5-pro",
            "openai/gpt-3.5-turbo",
            "openai/gpt-4o-mini",
            "anthropic/claude-3-haiku",
            "openrouter/google/gemini-2.0-flash-lite-preview-02-05:free",
            "openrouter/poolside/laguna-m.1:free",
            "openrouter/google/gemma-4-26b-a4b-it:free",
            "openrouter/google/gemma-4-31b-it:free",
            "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
            "openrouter/liquid/lfm-2.5-1.2b-thinking:free",
            "openrouter/liquid/lfm-2.5-1.2b-instruct:free",
            "openrouter/nvidia/nemotron-3-nano-30b-a3b:free",
            "openrouter/nvidia/nemotron-nano-12b-v2-vl:free",
            "openrouter/qwen/qwen3-next-80b-a3b-instruct:free",
            "openrouter/nvidia/nemotron-nano-9b-v2:free",
            "openrouter/openai/gpt-oss-120b:free",
            "openrouter/openai/gpt-oss-20b:free",
            "openrouter/z-ai/glm-4.5-air:free",
            "openrouter/qwen/qwen3-coder:free",
            "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
            "openrouter/meta-llama/llama-3.3-70b-instruct:free",
            "openrouter/meta-llama/llama-3.2-3b-instruct:free",
            "openrouter/nousresearch/hermes-3-llama-3.1-405b:free",
            "lmstudio/liquid/lfm2.5-1.2b"
        ]
        if v not in allowed:
            raise ValueError(f"Model '{v}' tidak didukung atau belum terdaftar.")
        return v

class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class TopUpRequest(BaseModel):
    amount: float = Field(..., gt=0, le=1000)


# --- Response Schemas ---

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    status: str
    created_at: datetime
    last_used_at: Optional[datetime] = None

class ApiKeyCreateResponse(ApiKeyResponse):
    raw_key: str  # Tampil hanya sekali saat create!

class WalletResponse(BaseModel):
    balance: float
    currency: str
    total_spent: float
    total_topup: float

class ModelInfo(BaseModel):
    id: str
    display_name: str
    provider: str
    input_price_per_1k_usd: float
    output_price_per_1k_usd: float
    context_window: Optional[int] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    providers: dict[str, str]

class ErrorResponse(BaseModel):
    error: str
    status: int
    detail: Optional[Any] = None
