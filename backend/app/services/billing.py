# app/services/billing.py
from app.database import supabase
from app.config import settings
from fastapi import HTTPException
import logging

logger = logging.getLogger("gatellm")

# Cache in-memory model pricing dengan TTL 60 detik
import time
_pricing_cache: dict = {}
_pricing_cache_time: dict = {}
PRICING_CACHE_TTL = 60  # detik

# Default minimum pricing untuk semua model (agar semua bersifat paid)
DEFAULT_MIN_INPUT_PRICE = 0.001000   # $0.001 per 1k tokens
DEFAULT_MIN_OUTPUT_PRICE = 0.002000  # $0.002 per 1k tokens
DEFAULT_MARKUP_RATE = 1.20


async def get_model_pricing(model_id: str) -> dict:
    """
    Mengambil skema pricing per model dari database.
    Cache selama 60 detik, lalu refresh dari DB.
    """
    now = time.time()
    if model_id in _pricing_cache and (now - _pricing_cache_time.get(model_id, 0)) < PRICING_CACHE_TTL:
        return _pricing_cache[model_id]

    pricing_dict = None
    try:
        res = supabase.table("model_pricing").select("*").eq("model_id", model_id).eq("is_active", True).execute()
        if res.data:
            pricing = res.data[0]
            pricing_dict = {
                "model_id": pricing["model_id"],
                "input_price_per_1k": float(pricing["input_price_per_1k"]),
                "output_price_per_1k": float(pricing["output_price_per_1k"]),
                "markup_rate": float(pricing.get("markup_rate", DEFAULT_MARKUP_RATE)),
                "provider": pricing["provider"]
            }
    except Exception as e:
        logger.warning(f"Gagal query pricing DB untuk {model_id}: {str(e)}")

    if not pricing_dict:
        logger.warning(f"Model {model_id} tidak ditemukan di database, menggunakan fallback default pricing.")
        pricing_dict = {
            "model_id": model_id,
            "input_price_per_1k": DEFAULT_MIN_INPUT_PRICE,
            "output_price_per_1k": DEFAULT_MIN_OUTPUT_PRICE,
            "markup_rate": DEFAULT_MARKUP_RATE,
            "provider": "openrouter" if "openrouter" in model_id else ("lmstudio" if "lmstudio" in model_id else "google")
        }

    # Pastikan harga tidak nol — semua model harus paid
    if pricing_dict["input_price_per_1k"] <= 0:
        logger.warning(f"Model {model_id}: input_price=0, dipaksa ke minimum {DEFAULT_MIN_INPUT_PRICE}")
        pricing_dict["input_price_per_1k"] = DEFAULT_MIN_INPUT_PRICE
    if pricing_dict["output_price_per_1k"] <= 0:
        logger.warning(f"Model {model_id}: output_price=0, dipaksa ke minimum {DEFAULT_MIN_OUTPUT_PRICE}")
        pricing_dict["output_price_per_1k"] = DEFAULT_MIN_OUTPUT_PRICE
    if pricing_dict["markup_rate"] <= 0:
        pricing_dict["markup_rate"] = DEFAULT_MARKUP_RATE

    logger.info(
        f"Pricing untuk {model_id}: "
        f"input={pricing_dict['input_price_per_1k']}/1k, "
        f"output={pricing_dict['output_price_per_1k']}/1k, "
        f"markup={pricing_dict['markup_rate']}"
    )

    _pricing_cache[model_id] = pricing_dict
    _pricing_cache_time[model_id] = now
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

    logger.info(
        f"Kalkulasi biaya: prompt={prompt_tokens}tok, completion={completion_tokens}tok, "
        f"cost_usd=${cost_usd:.8f}, cost_deducted=${cost_deducted:.8f}"
    )
    return cost_usd, cost_deducted


async def check_balance(user_id: str) -> float:
    """
    Memeriksa ketersediaan saldo sebelum request diproses (Pre-flight).
    """
    try:
        res = supabase.table("wallets").select("balance").eq("user_id", user_id).execute()
    except Exception as e:
        logger.error(f"Gagal query wallet untuk check_balance user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": "db_error", "message": "Gagal memeriksa saldo"})

    if not res.data:
        raise HTTPException(status_code=402, detail={"error": "insufficient_balance", "message": "Wallet tidak ditemukan, registrasi belum komplit"})

    balance = float(res.data[0]["balance"])
    logger.info(f"Pre-flight balance check untuk {user_id}: ${balance:.6f}")

    if balance < settings.min_balance_threshold:
        raise HTTPException(status_code=402, detail={"error": "insufficient_balance", "message": f"Saldo tidak mencukupi (${balance:.6f}). Silakan top-up terlebih dahulu."})
    return balance


async def get_wallet_balance(user_id: str) -> float:
    """
    Mengambil saldo wallet saat ini untuk user tertentu (untuk polling frontend).
    Returns float USD balance, atau -1 jika gagal.
    """
    try:
        res = supabase.table("wallets").select("balance").eq("user_id", user_id).execute()
        if res.data:
            return float(res.data[0]["balance"])
    except Exception as e:
        logger.warning(f"Gagal get_wallet_balance untuk {user_id}: {str(e)}")
    return -1.0


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
    Mengurangi saldo wallet dan mencatat log penggunaan.
    Menggunakan REST API langsung (lebih andal daripada RPC stored function).
    """
    logger.info(
        f"[BILLING START] user={user_id}, model={model_name}, "
        f"tokens=({prompt_tokens}+{completion_tokens}), "
        f"cost_deducted=${cost_deducted:.8f}"
    )

    # ── Langkah 1: Coba RPC stored function ──────────────────────────────────
    try:
        rpc_res = supabase.rpc("deduct_balance_and_log", {
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
        if rpc_res.data:
            logger.info(f"[BILLING OK via RPC] user={user_id}, deducted=${cost_deducted:.8f}")
            return True
        logger.warning(f"[BILLING RPC] returned empty data, falling back to REST...")
    except Exception as e:
        logger.warning(f"[BILLING RPC FAILED] {str(e)} → switching to REST fallback")

    # ── Langkah 2: REST fallback langsung ────────────────────────────────────
    try:
        # 2a. Baca saldo terkini
        wallet_res = supabase.table("wallets").select("id, balance").eq("user_id", user_id).execute()
        if not wallet_res.data:
            logger.error(f"[BILLING FAILED] Wallet tidak ditemukan untuk user {user_id}")
            return False

        wallet = wallet_res.data[0]
        current_balance = float(wallet["balance"])
        logger.info(f"[BILLING REST] Saldo saat ini: ${current_balance:.6f}, akan dikurangi ${cost_deducted:.8f}")

        if current_balance < cost_deducted:
            logger.warning(f"[BILLING SKIP] Saldo tidak cukup: ${current_balance:.6f} < ${cost_deducted:.8f}")
            return False

        # 2b. Update saldo baru
        new_balance = current_balance - cost_deducted
        update_res = supabase.table("wallets").update({"balance": new_balance}).eq("user_id", user_id).execute()

        if not update_res.data:
            logger.error(f"[BILLING FAILED] Update wallet gagal untuk user {user_id}")
            return False

        logger.info(f"[BILLING REST OK] Saldo berkurang: ${current_balance:.6f} → ${new_balance:.6f}")

        # 2c. Catat log pemakaian — coba full schema dulu, fallback ke minimal
        try:
            supabase.table("usage_logs").insert({
                "user_id": user_id,
                "api_key_id": api_key_id,
                "model_name": model_name,
                "provider": provider,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "cost_usd": cost_usd,
                "cost_deducted": cost_deducted,
                "request_id": request_id,
                "latency_ms": latency_ms,
                "status": "success"
            }).execute()
            logger.info(f"[BILLING LOG] Usage log berhasil dicatat untuk {request_id}")
        except Exception as le:
            logger.warning(f"[BILLING LOG WARN] Full schema insert gagal ({str(le)}), mencoba schema minimal...")
            # Fallback: insert minimal tanpa kolom opsional (untuk schema lama)
            try:
                supabase.table("usage_logs").insert({
                    "user_id": user_id,
                    "model_name": model_name,
                    "provider": provider,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens,
                    "cost_usd": cost_usd,
                    "cost_deducted": cost_deducted,
                    "latency_ms": latency_ms,
                    "status": "success"
                }).execute()
                logger.info(f"[BILLING LOG] Usage log (schema minimal) berhasil dicatat untuk {request_id}")
            except Exception as le2:
                logger.warning(f"[BILLING LOG WARN] Schema minimal juga gagal ({str(le2)}), skip log.")

        # 2d. Update last_used_at pada api_key
        try:
            supabase.table("api_keys").update({"last_used_at": "now()"}).eq("id", api_key_id).execute()
        except Exception:
            pass

        return True

    except Exception as fe:
        logger.error(f"[BILLING FATAL] REST fallback gagal: {str(fe)}")
        return False
