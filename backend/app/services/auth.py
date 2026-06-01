# app/services/auth.py
import hashlib
import secrets
from fastapi import Header, HTTPException, Depends
from app.database import supabase

def generate_api_key() -> tuple[str, str, str]:
    """
    Menghasilkan API Key KedaiAI secara acak.
    Returns:
        tuple[str, str, str]: (raw_key, hashed_key, key_prefix)
    """
    raw_key = "glm_" + secrets.token_urlsafe(30)
    hashed_key = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]
    return raw_key, hashed_key, key_prefix

async def validate_api_key(authorization: str = Header(None)) -> dict:
    """
    Memvalidasi Authorization header API Key.
    """
    if not authorization or not authorization.startswith("Bearer glm_"):
        raise HTTPException(status_code=401, detail={"error": "invalid_api_key", "message": "API Key salah format atau kosong"})

    raw_key = authorization.replace("Bearer ", "")
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    # Query ke tabel api_keys menggunakan service_role client
    res = supabase.table("api_keys").select("id, user_id, status").eq("key_hash", key_hash).execute()

    if not res.data:
        raise HTTPException(status_code=401, detail={"error": "invalid_api_key", "message": "API Key tidak ditemukan"})

    key_data = res.data[0]
    if key_data["status"] == "revoked":
        raise HTTPException(status_code=403, detail={"error": "api_key_revoked", "message": "API Key telah dinonaktifkan"})

    return {"id": key_data["id"], "user_id": key_data["user_id"]}

async def verify_supabase_jwt(authorization: str = Header(None)) -> dict:
    """
    Memvalidasi JWT Supabase dari user dashboard untuk endpoint management.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": "invalid_jwt", "message": "Token JWT kosong atau salah format"})

    token = authorization.replace("Bearer ", "")
    try:
        user_res = supabase.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail={"error": "invalid_jwt", "message": "Sesi tidak valid atau telah kadaluarsa"})
        return {"user_id": user_res.user.id, "email": user_res.user.email}
    except Exception as e:
        raise HTTPException(status_code=401, detail={"error": "invalid_jwt", "message": f"Validasi token gagal: {str(e)}"})
