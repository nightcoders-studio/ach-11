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
    if model_id.startswith("lmstudio/"):
        return f"openai/{model_id.replace('lmstudio/', '')}"
    elif model_id.startswith("openrouter/"):
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

# List of rotated OpenRouter API keys for free tier models
OPENROUTER_KEYS = [
    "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",
    "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",
    "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"
]
current_key_index = 0

async def stream_completion(model: str, messages: list, max_tokens: int, temperature: float):
    """
    Memanggil upstream model completion secara asinkronus menggunakan LiteLLM.
    Mendukung rotasi otomatis 3 API Key OpenRouter jika terjadi error rate limit atau auth.
    """
    global current_key_index
    mapped_model = get_mapped_model_string(model)
    
    # Kumpulkan daftar key yang akan dicoba (dimulai dari current_key_index)
    keys_to_try = []
    if model.startswith("openrouter/"):
        # Prioritaskan rotation keys
        for i in range(len(OPENROUTER_KEYS)):
            idx = (current_key_index + i) % len(OPENROUTER_KEYS)
            keys_to_try.append((OPENROUTER_KEYS[idx], idx))
        # Jika settings.openrouter_api_key tidak ada di pool, tambahkan sebagai fallback terakhir
        if settings.openrouter_api_key and settings.openrouter_api_key not in OPENROUTER_KEYS:
            keys_to_try.append((settings.openrouter_api_key, -1))
    elif model.startswith("lmstudio/"):
        # LM Studio local key & endpoint
        keys_to_try.append(("lm-studio", -2))
    else:
        # Provider non-OpenRouter (Gemini, OpenAI, Anthropic direct)
        keys_to_try.append((None, -1))

    last_exception = None
    for api_key, key_idx in keys_to_try:
        try:
            logger.info(f"Mengirim request completion ke {mapped_model} menggunakan " + 
                        (f"OpenRouter Key Index {key_idx}" if key_idx >= 0 else ("LM Studio Local Endpoint" if key_idx == -2 else "Default Key")))
            
            # Persiapkan parameter pemanggilan LiteLLM
            call_kwargs = {
                "model": mapped_model,
                "messages": messages,
                "stream": True,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            # Gunakan key spesifik jika OpenRouter
            if model.startswith("openrouter/") and api_key:
                call_kwargs["api_key"] = api_key
            elif model.startswith("lmstudio/"):
                call_kwargs["api_key"] = "lm-studio"
                call_kwargs["api_base"] = "http://192.168.56.1:1234/v1"

            response = await litellm.acompletion(**call_kwargs)
            
            # Jika sukses, update current_key_index agar request berikutnya memakai key ini (atau setelahnya)
            if key_idx >= 0:
                current_key_index = key_idx
                
            return response
            
        except Exception as e:
            logger.warning(f"Gagal memanggil model dengan key (index {key_idx}): {str(e)}")
            last_exception = e
            # Jika ini bukan OpenRouter, tidak perlu mencoba key lain
            if not model.startswith("openrouter/"):
                break
            # Jika rate limit atau auth error, loop akan mencoba key berikutnya
            continue

    # Jika semua key dicoba dan gagal
    err_msg = str(last_exception).lower()
    logger.error(f"Semua API Key gagal digunakan: {err_msg}")
    if "rate limit" in err_msg:
        raise HTTPException(status_code=429, detail={"error": "upstream_rate_limit", "message": "Upstream rate limit terlampaui. Silakan coba sesaat lagi."})
    elif "authentication" in err_msg or "api key" in err_msg:
        raise HTTPException(status_code=502, detail={"error": "upstream_auth_error", "message": "Autentikasi ke upstream provider gagal"})
    elif "timeout" in err_msg:
        raise HTTPException(status_code=504, detail={"error": "upstream_timeout", "message": "Koneksi ke upstream provider kehabisan waktu (Timeout)"})
    else:
        raise HTTPException(status_code=502, detail={"error": "upstream_error", "message": f"Kesalahan dari upstream provider: {str(last_exception)}"})

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
