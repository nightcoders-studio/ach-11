# app/services/llm.py
import litellm
from app.config import settings
from fastapi import HTTPException
import logging

logger = logging.getLogger("gatellm")

# Set up API keys untuk LiteLLM
litellm.google_api_key = settings.google_api_key
litellm.openai_api_key = settings.openai_api_key
litellm.anthropic_api_key = settings.anthropic_api_key
# openrouter dipetakan menggunakan environment key OPENROUTER_API_KEY
import os
os.environ["OPENROUTER_API_KEY"] = settings.openrouter_api_key

# Matikan telemetry untuk kepatuhan privasi data
litellm.telemetry = False

def get_mapped_model_string(model_id: str) -> str:
    """
    Memetakan model standar GateLLM ke format upstream provider milik LiteLLM/OpenRouter.
    """
    if model_id.startswith("openrouter/"):
        # Misal: openrouter/google/gemini-2.0-flash-lite-preview-02-05:free
        # format LiteLLM untuk OpenRouter adalah "openrouter/<model-name-di-openrouter>"
        return model_id
    elif model_id.startswith("gemini/"):
        return model_id.replace("gemini/", "gemini/")
    elif model_id.startswith("openai/"):
        return model_id.replace("openai/", "")
    elif model_id.startswith("anthropic/"):
        return model_id.replace("anthropic/", "")
    return model_id

async def stream_completion(model: str, messages: list, max_tokens: int, temperature: float):
    """
    Memanggil upstream model completion secara asinkronus menggunakan LiteLLM.
    """
    mapped_model = get_mapped_model_string(model)
    try:
        response = await litellm.acompletion(
            model=mapped_model,
            messages=messages,
            stream=True,
            max_tokens=max_tokens,
            temperature=temperature
        )
        return response
    except Exception as e:
        logger.error(f"LiteLLM error ketika menghubungi upstream model: {str(e)}")
        # Mapping standard error ke HTTPException
        err_msg = str(e).lower()
        if "rate limit" in err_msg:
            raise HTTPException(status_code=429, detail={"error": "upstream_rate_limit", "message": "Upstream rate limit terlampaui. Silakan coba sesaat lagi."})
        elif "authentication" in err_msg or "api key" in err_msg:
            raise HTTPException(status_code=502, detail={"error": "upstream_auth_error", "message": "Autentikasi ke upstream provider gagal"})
        elif "timeout" in err_msg:
            raise HTTPException(status_code=504, detail={"error": "upstream_timeout", "message": "Koneksi ke upstream provider kehabisan waktu (Timeout)"})
        else:
            raise HTTPException(status_code=502, detail={"error": "upstream_error", "message": f"Kesalahan dari upstream provider: {str(e)}"})

def get_available_providers() -> dict:
    """
    Menghasilkan metadata status provider berdasarkan environment keys yang tersedia.
    """
    return {
        "google": "available" if settings.google_api_key else "unavailable",
        "openai": "available" if settings.openai_api_key else "unavailable",
        "anthropic": "available" if settings.anthropic_api_key else "unavailable",
        "openrouter": "available" if settings.openrouter_api_key else "unavailable"
    }
