# app/routers/dashboard.py
from fastapi import APIRouter, Header, HTTPException, Depends
from app.models import ApiKeyResponse, ApiKeyCreateResponse, WalletResponse, TopUpRequest, CreateApiKeyRequest
from app.services.auth import verify_supabase_jwt, generate_api_key
from app.database import supabase
from datetime import datetime
import logging

logger = logging.getLogger("gatellm")
router = APIRouter()

@router.post("/api-keys", response_model=ApiKeyCreateResponse)
async def create_key(
    request: CreateApiKeyRequest,
    user_data: dict = Depends(verify_supabase_jwt)
):
    user_id = user_data["user_id"]
    
    # 1. Cek kuota active key (Maksimal 5)
    res_count = supabase.table("api_keys").select("id", count="exact").eq("user_id", user_id).eq("status", "active").execute()
    count = res_count.count if hasattr(res_count, "count") else len(res_count.data)
    
    if count >= 5:
        raise HTTPException(status_code=400, detail={"error": "max_keys_reached", "message": "Anda telah mencapai batas maksimal 5 API Key aktif"})

    # 2. Hasilkan API Key baru
    raw_key, hashed_key, key_prefix = generate_api_key()

    # 3. Insert ke database
    insert_res = supabase.table("api_keys").insert({
        "user_id": user_id,
        "name": request.name,
        "key_hash": hashed_key,
        "key_prefix": key_prefix,
        "status": "active"
    }).execute()

    if not insert_res.data:
        raise HTTPException(status_code=500, detail={"error": "db_error", "message": "Gagal menyimpan API Key baru"})

    key_record = insert_res.data[0]
    return ApiKeyCreateResponse(
        id=key_record["id"],
        name=key_record["name"],
        key_prefix=key_record["key_prefix"],
        status=key_record["status"],
        created_at=datetime.fromisoformat(key_record["created_at"].replace("Z", "+00:00")),
        raw_key=raw_key
    )

@router.delete("/api-keys/{key_id}")
async def revoke_key(
    key_id: str,
    user_data: dict = Depends(verify_supabase_jwt)
):
    user_id = user_data["user_id"]

    # Cari key record
    res = supabase.table("api_keys").select("id").eq("id", key_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail={"error": "key_not_found", "message": "API Key tidak ditemukan atau bukan milik Anda"})

    # Update status revoked
    update_res = supabase.table("api_keys").update({
        "status": "revoked",
        "revoked_at": datetime.utcnow().isoformat()
    }).eq("id", key_id).execute()

    if not update_res.data:
        raise HTTPException(status_code=500, detail={"error": "db_error", "message": "Gagal menonaktifkan API Key"})

    return {"message": "API Key berhasil dinonaktifkan", "key_id": key_id}

@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_keys(user_data: dict = Depends(verify_supabase_jwt)):
    user_id = user_data["user_id"]
    res = supabase.table("api_keys").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    
    keys = []
    for k in res.data:
        last_used = None
        if k.get("last_used_at"):
            last_used = datetime.fromisoformat(k["last_used_at"].replace("Z", "+00:00"))
        
        keys.append(ApiKeyResponse(
            id=k["id"],
            name=k["name"],
            key_prefix=k["key_prefix"],
            status=k["status"],
            created_at=datetime.fromisoformat(k["created_at"].replace("Z", "+00:00")),
            last_used_at=last_used
        ))
    return keys

@router.post("/topup", response_model=WalletResponse)
async def mock_topup(
    request: TopUpRequest,
    user_data: dict = Depends(verify_supabase_jwt)
):
    user_id = user_data["user_id"]
    amount = request.amount

    # Hanya terima preset tertentu (simulasi agar balance tidak di abuse)
    allowed_presets = [0.60, 3.00, 6.00]  # Ekuivalen Rp 10k, 50k, 100k
    # Longgarkan presisi toleransi floating point
    is_preset = any(abs(amount - p) < 0.01 for p in allowed_presets)
    if not is_preset:
         raise HTTPException(status_code=400, detail={"error": "invalid_amount", "message": "Top up hanya diizinkan menggunakan nominal simulasi: $0.60, $3.00, atau $6.00"})

    # 1. Update wallet balance
    # Cari wallet user
    res_wallet = supabase.table("wallets").select("*").eq("user_id", user_id).execute()
    if not res_wallet.data:
        raise HTTPException(status_code=404, detail={"error": "wallet_not_found", "message": "Wallet belum diinisialisasi untuk user Anda"})

    wallet = res_wallet.data[0]
    new_balance = float(wallet["balance"]) + amount
    new_total_topup = float(wallet["total_topup"]) + amount

    update_res = supabase.table("wallets").update({
        "balance": new_balance,
        "total_topup": new_total_topup
    }).eq("user_id", user_id).execute()

    if not update_res.data:
        raise HTTPException(status_code=500, detail={"error": "db_error", "message": "Gagal memproses penambahan saldo"})

    # 2. Catat logs topup
    supabase.table("topup_logs").insert({
        "user_id": user_id,
        "amount": amount,
        "method": "SIMULATION",
        "status": "completed",
        "note": "Simulated balance replenishment from dashboard"
    }).execute()

    updated_wallet = update_res.data[0]
    return WalletResponse(
        balance=float(updated_wallet["balance"]),
        currency=updated_wallet["currency"],
        total_spent=float(updated_wallet["total_spent"]),
        total_topup=float(updated_wallet["total_topup"])
    )

@router.get("/wallet", response_model=WalletResponse)
async def get_wallet(user_data: dict = Depends(verify_supabase_jwt)):
    user_id = user_data["user_id"]
    res = supabase.table("wallets").select("*").eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail={"error": "wallet_not_found", "message": "Wallet belum diinisialisasi"})
    
    w = res.data[0]
    return WalletResponse(
        balance=float(w["balance"]),
        currency=w["currency"],
        total_spent=float(w["total_spent"]),
        total_topup=float(w["total_topup"])
    )
