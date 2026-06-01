# app/services/billing.py
from app.database import supabase
from app.config import settings
from fastapi import HTTPException
import logging

logger = logging.getLogger("gatellm")

# Cache in-memory model pricing untuk optimasi performa
_pricing_cache = {}

async def get_model_pricing(model_id: str) -> dict:
    """
    Mengambil skema pricing per model.
    """
    if model_id in _pricing_cache:
        return _pricing_cache[model_id]

    res = supabase.table("model_pricing").select("*").eq("model_id", model_id).eq("is_active", True).execute()
    if not res.data:
        # Fallback pricing default jika model terlewat di database seeding
        fallback = {
            "model_id": model_id,
            "input_price_per_1k": 0.000150,
            "output_price_per_1k": 0.000600,
            "markup_rate": 1.20,
            "provider": "openrouter" if "openrouter" in model_id else "google"
        }
        return fallback

    pricing = res.data[0]
    # Konversi data numerik dari Decimal ke float
    pricing_dict = {
        "model_id": pricing["model_id"],
        "input_price_per_1k": float(pricing["input_price_per_1k"]),
        "output_price_per_1k": float(pricing["output_price_per_1k"]),
        "markup_rate": float(pricing["markup_rate"]),
        "provider": pricing["provider"]
    }
    _pricing_cache[model_id] = pricing_dict
    return pricing_dict

def calculate_cost(model_pricing: dict, prompt_tokens: int, completion_tokens: int) -> tuple[float, float]:
    """
    Menghitung biaya pemakaian API.
    Returns:
        tuple[float, float]: (cost_usd, cost_deducted)
    """
    input_price = model_pricing["input_price_per_1k"]
    output_price = model_pricing["output_price_per_1k"]
    markup_rate = model_pricing["markup_rate"]

    cost_usd = ((prompt_tokens / 1000.0) * input_price) + ((completion_tokens / 1000.0) * output_price)
    cost_deducted = cost_usd * markup_rate

    return cost_usd, cost_deducted

async def check_balance(user_id: str):
    """
    Memeriksa ketersediaan saldo sebelum request diproses (Pre-flight).
    """
    res = supabase.table("wallets").select("balance").eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=402, detail={"error": "insufficient_balance", "message": "Wallet tidak ditemukan, registrasi belum komplit"})

    balance = float(res.data[0]["balance"])
    if balance < settings.min_balance_threshold:
        raise HTTPException(status_code=402, detail={"error": "insufficient_balance", "message": "Saldo tidak mencukupi untuk memproses request"})
    return balance

async def deduct_balance(
    user_id: str,
    api_key_id: str,
    model_name: str,
    provider: str,
    prompt_tokens: int,
    completion_tokens: int,
    cost_usd: float,
    cost_deducted: float,
    request_id: str,
    latency_ms: int
) -> bool:
    """
    Memanggil PostgreSQL Stored Function 'deduct_balance_and_log' secara atomic.
    """
    try:
        res = supabase.rpc("deduct_balance_and_log", {
            "p_user_id": user_id,
            "p_api_key_id": api_key_id,
            "p_model_name": model_name,
            "p_provider": provider,
            "p_prompt_tokens": prompt_tokens,
            "p_completion_tokens": completion_tokens,
            "p_cost_usd": cost_usd,
            "p_cost_deducted": cost_deducted,
            "p_request_id": request_id,
            "p_latency_ms": latency_ms
        }).execute()
        return bool(res.data)
    except Exception as e:
        logger.error(f"Gagal melakukan post-billing deduction: {str(e)}")
        return False
