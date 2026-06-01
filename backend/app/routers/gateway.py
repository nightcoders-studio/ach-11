# app/routers/gateway.py
from fastapi import APIRouter, Header, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.models import ChatRequest, ModelInfo, HealthResponse
from app.services.auth import validate_api_key
from app.services.billing import check_balance, get_model_pricing, calculate_cost, deduct_balance
from app.services.llm import stream_completion, get_available_providers
from app.database import supabase
import uuid
import time
import json
import asyncio
import logging

logger = logging.getLogger("gatellm")
router = APIRouter()

@router.post("/v1/chat/completions")
async def chat_completions(
    request: ChatRequest,
    key_data: dict = Depends(validate_api_key)
):
    # 1. Pre-flight check balance
    user_id = key_data["user_id"]
    api_key_id = key_data["id"]
    await check_balance(user_id)

    # 2. Setup ID & Latency counter
    request_id = f"glm_req_{uuid.uuid4().hex}"
    start_time = time.time()

    # 3. Ambil model pricing schema
    pricing = await get_model_pricing(request.model)
    provider = pricing["provider"]

    # 4. SSE Streaming Generator
    async def generate_sse():
        nonlocal start_time
        prompt_tokens = 0
        completion_tokens = 0
        full_response = ""

        try:
            # Panggil stream completion
            litellm_stream = await stream_completion(
                model=request.model,
                messages=[{"role": m.role, "content": m.content} for m in request.messages],
                max_tokens=request.max_tokens,
                temperature=request.temperature
            )

            # Heartbeat task to keep connections alive
            async def send_heartbeat():
                while True:
                    await asyncio.sleep(15)
                    yield ": heartbeat\n\n"

            # Iterasi stream chunks
            async for chunk in litellm_stream:
                if not chunk.choices:
                    continue
                # LiteLLM format mapping
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    full_response += delta.content

                # Hitung usage tokens (juku token tracker dari metadata jika ada)
                if hasattr(chunk, "usage") and chunk.usage:
                    prompt_tokens = chunk.usage.prompt_tokens
                    completion_tokens = chunk.usage.completion_tokens

                yield f"data: {chunk.model_dump_json()}\n\n"

            # Tentukan default token count jika upstream provider tidak mengembalikan usage info
            if prompt_tokens == 0:
                # Estimasi kasar: 1 token = 4 karakter
                prompt_text = "".join([m.content for m in request.messages])
                prompt_tokens = max(1, len(prompt_text) // 4)
                completion_tokens = max(1, len(full_response) // 4)

            yield "data: [DONE]\n\n"

            # 5. Post-billing processing setelah stream selesai dengan sukses
            latency_ms = int((time.time() - start_time) * 1000)
            cost_usd, cost_deducted = calculate_cost(pricing, prompt_tokens, completion_tokens)
            
            deducted = await deduct_balance(
                user_id=user_id,
                api_key_id=api_key_id,
                model_name=request.model,
                provider=provider,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_usd=cost_usd,
                cost_deducted=cost_deducted,
                request_id=request_id,
                latency_ms=latency_ms
            )

            # Log structured request data
            logger.info(json.dumps({
                "event": "request_completed",
                "request_id": request_id,
                "user_id": user_id,
                "model": request.model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "cost_usd": cost_usd,
                "cost_deducted": cost_deducted,
                "latency_ms": latency_ms,
                "status": "success",
                "deducted": deducted
            }))

        except Exception as e:
            logger.error(f"Error pada SSE stream gateway: {str(e)}")
            err_payload = json.dumps({"code": "gateway_stream_error", "message": str(e)})
            yield f"data: [ERROR]{err_payload}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "X-GateLLM-Request-ID": request_id
        }
    )

@router.get("/v1/models")
async def list_models(key_data: dict = Depends(validate_api_key)):
    """
    Mengembalikan daftar model AI yang terdaftar di database.
    """
    try:
        res = supabase.table("model_pricing").select("*").eq("is_active", True).execute()
        models = []
        for m in res.data:
            models.append(ModelInfo(
                id=m["model_id"],
                display_name=m["display_name"],
                provider=m["provider"],
                input_price_per_1k_usd=float(m["input_price_per_1k"]),
                output_price_per_1k_usd=float(m["output_price_per_1k"]),
                context_window=m.get("context_window")
            ))
        return {"data": models}
    except Exception as e:
        logger.warning(f"Gagal mengambil model list dari database: {str(e)}")
        fallback_ids = [
            ("gemini/gemini-1.5-flash", "Gemini 1.5 Flash", "google", 0.000075, 0.000300, 1000000),
            ("gemini/gemini-1.5-pro", "Gemini 1.5 Pro", "google", 0.003500, 0.010500, 2000000),
            ("openai/gpt-3.5-turbo", "GPT-3.5 Turbo", "openai", 0.000500, 0.001500, 16385),
            ("openai/gpt-4o-mini", "GPT-4o Mini", "openai", 0.000150, 0.000600, 128000),
            ("anthropic/claude-3-haiku", "Claude 3 Haiku", "anthropic", 0.000250, 0.001250, 200000),
            ("openrouter/google/gemini-2.0-flash-lite-preview-02-05:free", "Gemini 2.0 Flash Lite Preview (Free)", "openrouter", 0.0, 0.0, 1048576),
            ("openrouter/poolside/laguna-m.1:free", "Poolside Laguna M.1 (Free)", "openrouter", 0.0, 0.0, 32768),
            ("lmstudio/liquid/lfm2.5-1.2b", "Liquid LFM 2.5 1.2B (LM Studio)", "lmstudio", 0.0, 0.0, 32768)
        ]
        models = [
            ModelInfo(
                id=fid,
                display_name=name,
                provider=prov,
                input_price_per_1k_usd=inp,
                output_price_per_1k_usd=out,
                context_window=cw
            ) for fid, name, prov, inp, out, cw in fallback_ids
        ]
        return {"data": models}

@router.get("/health")
async def health_check():
    """
    Kesehatan sistem Gateway.
    """
    db_ok = "unavailable"
    # Coba beberapa tabel — graceful jika migrations belum dijalankan
    for table_name in ["model_pricing", "api_keys", "wallets", "profiles"]:
        try:
            supabase.table(table_name).select("id").limit(1).execute()
            db_ok = "available"
            break
        except Exception:
            continue

    providers = get_available_providers()
    providers["supabase_db"] = db_ok

    # Degraded jika DB tidak tersambung, tapi OpenRouter tetap bisa serve
    status = "healthy" if db_ok == "available" else "degraded"

    return HealthResponse(
        status=status,
        version="1.0.0",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        providers=providers
    )
