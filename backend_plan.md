# Backend Implementation Plan — KedaiAI
> Berdasarkan: PRD_Ridha_v2.md  
> Stack: **FastAPI (Python 3.11)** + **Supabase (PostgreSQL + Auth)** + **LiteLLM**  
> Deploy Target: **Railway / Fly.io**  
> Terakhir Diperbarui: Juni 2026

---

## Ringkasan Arsitektur Backend

```
Client App
    │  POST /v1/chat/completions
    │  Authorization: Bearer glm_xxx
    ▼
┌─────────────────────────────────────┐
│            FastAPI App              │
│                                     │
│  ┌─────────┐  ┌──────────────────┐ │
│  │ Routers │  │    Middleware     │ │
│  │ gateway │  │  - CORS          │ │
│  │ dashboard│  │  - Rate Limiting │ │
│  └────┬────┘  │  - Auth Inject   │ │
│       │        └──────────────────┘ │
│  ┌────▼────────────────────────┐   │
│  │         Services            │   │
│  │  - auth.py (Key Validation) │   │
│  │  - billing.py (Cost Calc)   │   │
│  │  - llm.py (LiteLLM Wrapper) │   │
│  └────┬────────────────────────┘   │
└───────┼─────────────────────────────┘
        │
   ┌────┴──────────────────┐
   │                       │
   ▼                       ▼
Supabase DB             LiteLLM
(PostgreSQL)         (Gemini/OpenAI/Anthropic)
```

---

## Section 1 — Setup Project & Struktur Direktori

### Tujuan
Inisialisasi project FastAPI dengan struktur yang sesuai PRD Section 15.1.

### Struktur Direktori Target

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Entry point FastAPI
│   ├── config.py            # Env vars & settings (Pydantic BaseSettings)
│   ├── database.py          # Supabase client initialization
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── gateway.py       # POST /v1/chat/completions, GET /v1/models
│   │   └── dashboard.py     # POST /dashboard/api-keys, DELETE, POST /dashboard/topup
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py          # API Key validation + hash
│   │   ├── billing.py       # Cost calculation + deduct_balance_and_log
│   │   └── llm.py           # LiteLLM async wrapper
│   └── models.py            # Pydantic request/response schemas
├── tests/
│   ├── __init__.py
│   ├── test_billing.py
│   ├── test_api.py
│   └── test_auth.py
├── requirements.txt
├── Dockerfile
├── .env.example
└── .gitignore
```

### File yang Dibuat

| File | Keterangan |
|------|-----------|
| `app/main.py` | FastAPI app instance, CORS middleware, router include |
| `app/config.py` | `Settings` class dengan Pydantic BaseSettings |
| `app/database.py` | Supabase client (service_role) singleton |
| `requirements.txt` | Semua dependencies dengan versi pinned |
| `Dockerfile` | Image Python 3.11-slim |
| `.env.example` | Template environment variables |
| `.gitignore` | Exclude `.env`, `__pycache__`, `.pytest_cache` |

### Dependencies (requirements.txt)

```txt
fastapi==0.111.0
uvicorn[standard]==0.30.1
litellm==1.40.0
supabase==2.5.1
pydantic==2.7.4
pydantic-settings==2.3.4
python-dotenv==1.0.1
httpx==0.27.0
slowapi==0.1.9
sentry-sdk==2.5.1
pytest==8.2.2
pytest-asyncio==0.23.7
```

---

## Section 2 — Database & Supabase Setup

### Tujuan
Membuat semua tabel, trigger, RLS policy, dan stored function di Supabase sesuai PRD Section 7.

### SQL Migrations (Urutan Eksekusi)

#### 001_create_tables.sql
Membuat tabel:
- `public.profiles` — ekstensi auth.users
- `public.wallets` — saldo prabayar + constraint `balance >= 0`
- `public.api_keys` — hash SHA-256, prefix, status
- `public.usage_logs` — log setiap request berhasil
- `public.topup_logs` — riwayat top-up
- `public.model_pricing` — harga per token per model

#### 002_create_triggers.sql
- `handle_new_user()` — auto-create profile + wallet saat user baru daftar
- `update_updated_at()` — auto-update `updated_at` pada wallets

#### 003_create_rls_policies.sql
RLS untuk setiap tabel:
- Semua tabel: `SELECT` hanya data milik `auth.uid()`
- `api_keys`: `INSERT` dan `UPDATE` diizinkan untuk owner
- `wallets`: `UPDATE` **hanya via service_role** (backend), tidak dari client

#### 004_create_functions.sql
Stored function kritis:
- `deduct_balance_and_log(...)` — atomic transaction: lock wallet row, kurangi balance, insert usage_log, update `last_used_at` di api_key

#### seed.sql
Insert data awal `model_pricing` untuk 5 model:
- `gemini/gemini-1.5-flash`
- `gemini/gemini-1.5-pro`
- `openai/gpt-3.5-turbo`
- `openai/gpt-4o-mini`
- `anthropic/claude-3-haiku`

### Catatan Kritis

> ⚠️ **Aktifkan RLS** pada setiap tabel. Tanpa ini semua data terbuka ke publik.

> ⚠️ **Jangan gunakan anon key** di backend. Selalu gunakan `service_role` key untuk bypass RLS.

---

## Section 3 — Config & Database Client

### Tujuan
Manajemen environment variables dan inisialisasi Supabase client yang aman.

### `app/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    
    # AI Providers
    google_api_key: str
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    
    # App
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"
    secret_key: str
    
    # Rate Limiting
    rate_limit_per_minute: int = 20
    
    # Billing
    default_markup_rate: float = 1.20
    min_balance_threshold: float = 0.0001
    
    # Monitoring
    sentry_dsn: str = ""
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### `app/database.py`

- Singleton Supabase client menggunakan `service_role` key
- Tidak expose ke frontend
- Async-compatible (gunakan `supabase-py` v2)

---

## Section 4 — Models (Pydantic Schemas)

### Tujuan
Definisi semua request/response schema sesuai PRD Section 8 & 9.4.

### Schemas yang Diperlukan

#### Request Schemas

```python
class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str = Field(..., max_length=100_000)

class ChatRequest(BaseModel):
    model: str = Field(..., max_length=100)
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=100)
    stream: bool = True
    max_tokens: int = Field(default=1000, ge=1, le=4096)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

    @field_validator("model")
    @classmethod
    def validate_model(cls, v):
        allowed = [
            "gemini/gemini-1.5-flash",
            "gemini/gemini-1.5-pro",
            "openai/gpt-3.5-turbo",
            "openai/gpt-4o-mini",
            "anthropic/claude-3-haiku"
        ]
        if v not in allowed:
            raise ValueError(f"Model '{v}' tidak tersedia")
        return v

class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class TopUpRequest(BaseModel):
    amount: float = Field(..., gt=0, le=1000)  # dalam USD, max $1000
```

#### Response Schemas

```python
class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    status: str
    created_at: datetime
    last_used_at: datetime | None

class ApiKeyCreateResponse(ApiKeyResponse):
    raw_key: str  # Hanya muncul sekali!

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
    context_window: int | None

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    providers: dict[str, str]
```

---

## Section 5 — Auth Service (API Key Validation)

### Tujuan
Implementasi validasi API Key dan key generation sesuai PRD Section 9.1.

### `app/services/auth.py`

#### Fungsi: `generate_api_key()`

```python
import hashlib, secrets

def generate_api_key() -> tuple[str, str, str]:
    """
    Returns: (raw_key, hashed_key, key_prefix)
    - raw_key: glm_ + 40 chars urlsafe random (tampilkan sekali ke user)
    - hashed_key: SHA-256 hex (simpan di DB)
    - key_prefix: 12 karakter pertama dari raw_key (tampilkan di UI)
    """
    raw = "glm_" + secrets.token_urlsafe(30)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:12]
    return raw, hashed, prefix
```

#### Fungsi: `validate_api_key(authorization: str) -> dict`

Flow validasi:
1. Cek format: harus diawali `Bearer glm_`
2. Hash key menggunakan SHA-256
3. Query `api_keys` tabel dengan `key_hash`
4. Jika tidak ada → raise `HTTPException(401, "invalid_api_key")`
5. Jika status `revoked` → raise `HTTPException(403, "api_key_revoked")`
6. Update `last_used_at` (async, non-blocking)
7. Return `{id, user_id, status}`

#### Mengapa SHA-256, bukan bcrypt?

> API Key divalidasi pada **setiap request** — SHA-256 microseconds vs bcrypt milliseconds. Karena key sudah 40 karakter random (256-bit entropy), rainbow table tidak feasible.

---

## Section 6 — Billing Service

### Tujuan
Kalkulasi biaya per request dan atomic deduction dari wallet.

### `app/services/billing.py`

#### Fungsi: `calculate_cost(model, prompt_tokens, completion_tokens) -> tuple[float, float]`

```
Formula:
cost_usd = (prompt_tokens / 1000 * input_price_per_1k)
         + (completion_tokens / 1000 * output_price_per_1k)

cost_deducted = cost_usd * markup_rate
```

- Ambil harga dari tabel `model_pricing` (atau cache in-memory)
- Return `(cost_usd, cost_deducted)`

#### Fungsi: `deduct_balance(user_id, api_key_id, ...) -> bool`

- Panggil Supabase RPC `deduct_balance_and_log(...)`
- RPC ini sudah atomic dengan `FOR UPDATE NOWAIT`
- Return `True` jika sukses, `False` jika saldo tidak cukup

#### Pre-flight Balance Check

Sebelum request dikirim ke AI provider:
1. Query `wallets` untuk current balance
2. Jika `balance < min_balance_threshold` (default $0.0001) → `HTTPException(402)`
3. Jika cukup → lanjutkan ke LiteLLM

#### Post-billing (Setelah Stream Selesai)

Setelah stream selesai:
1. Ambil `usage` data dari LiteLLM response
2. Hitung `cost_usd` dan `cost_deducted`
3. Panggil `deduct_balance()`
4. Jika gagal (edge case saldo pas-pasan) → log error, saldo tidak minus (constraint DB)

---

## Section 7 — LLM Service (LiteLLM Wrapper)

### Tujuan
Abstraksi LiteLLM untuk streaming response ke semua provider.

### `app/services/llm.py`

#### Konfigurasi LiteLLM

```python
import litellm
import os

# Set provider keys dari environment
litellm.google_api_key = settings.google_api_key
litellm.openai_api_key = settings.openai_api_key
litellm.anthropic_api_key = settings.anthropic_api_key

# Nonaktifkan telemetry LiteLLM (untuk keamanan)
litellm.telemetry = False
```

#### Fungsi: `stream_completion(model, messages, max_tokens, temperature) -> AsyncGenerator`

```python
async def stream_completion(...):
    response = await litellm.acompletion(
        model=model,
        messages=messages,
        stream=True,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response
```

#### Error Mapping dari LiteLLM ke HTTPException

| LiteLLM Error | HTTP Status | Code |
|--------------|-------------|------|
| `AuthenticationError` | 502 | `upstream_auth_error` |
| `RateLimitError` | 429 | `upstream_rate_limit` |
| `ServiceUnavailableError` | 503 | `service_unavailable` |
| `Timeout` | 504 | `upstream_timeout` |
| `APIConnectionError` | 502 | `upstream_error` |

---

## Section 8 — Gateway Router

### Tujuan
Implementasi endpoint utama SSE streaming sesuai PRD Section 8 & 11.

### `app/routers/gateway.py`

#### `POST /v1/chat/completions`

Flow lengkap:

```
1. Parse Authorization header
2. validate_api_key() → {user_id, api_key_id}
3. Pre-flight balance check: wallet.balance >= min_balance_threshold
4. Start timer (latency tracking)
5. Call litellm.acompletion(stream=True)
6. async generator:
   a. Untuk setiap chunk → yield f"data: {chunk.json()}\n\n"
   b. Heartbeat jika idle > 15 detik (untuk mencegah timeout)
   c. Setelah [DONE] → hitung cost → deduct_balance()
   d. Jika error di tengah stream → yield "[ERROR]{...}\n\n"
7. Return StreamingResponse(generate(), media_type="text/event-stream")
   Headers:
     - Cache-Control: no-cache
     - X-Accel-Buffering: no
     - X-KedaiAI-Request-ID: req_xxx
```

#### `GET /v1/models`

- Memerlukan valid API Key
- Query `model_pricing` WHERE `is_active = TRUE`
- Return list `ModelInfo`

#### `GET /health`

- Public endpoint (tidak perlu auth)
- Cek koneksi ke Supabase (simple ping)
- Return status setiap provider (cek dari env key availability)

---

## Section 9 — Dashboard Router

### Tujuan
Endpoint manajemen API Key dan top-up yang memerlukan Supabase JWT (bukan KedaiAI API Key).

### `app/routers/dashboard.py`

> **Catatan Auth:** Dashboard endpoints menggunakan Supabase JWT token (dari frontend `supabase.auth.session()`), bukan KedaiAI API Key.

#### `POST /dashboard/api-keys`

Flow:
1. Verifikasi Supabase JWT → dapatkan `user_id`
2. Cek jumlah active keys: `COUNT(*) WHERE user_id = x AND status = 'active'`
3. Jika sudah 5 → `HTTPException(400, "max_keys_reached")`
4. Panggil `generate_api_key()` → `(raw, hashed, prefix)`
5. Insert ke `api_keys`: simpan `hashed`, `prefix`, `name`, `user_id`
6. Return `ApiKeyCreateResponse` dengan `raw_key` (hanya sekali!)

#### `DELETE /dashboard/api-keys/{key_id}`

Flow:
1. Verifikasi Supabase JWT → `user_id`
2. Cek key milik user ini
3. Update `status = 'revoked'`, `revoked_at = NOW()`
4. Return `{message: "API Key berhasil dinonaktifkan"}`

#### `POST /dashboard/topup`

Flow (Mock):
1. Verifikasi Supabase JWT → `user_id`
2. Validasi `amount` (preset: 0.60, 3.00, 6.00 dalam USD ≈ Rp 10k, 50k, 100k)
3. Update `wallets.balance += amount`, `total_topup += amount`
4. Insert ke `topup_logs` dengan `method = 'SIMULATION'`
5. Return `{new_balance, amount_added}`

---

## Section 10 — Middleware & Security

### Tujuan
Implementasi CORS, rate limiting, dan request ID sesuai PRD Section 9.

### CORS Middleware

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### Rate Limiting (slowapi)

```python
limiter = Limiter(key_func=get_remote_address)

@app.post("/v1/chat/completions")
@limiter.limit(f"{settings.rate_limit_per_minute}/minute")
async def chat_completions(...):
    ...
```

### Request ID Middleware

Setiap request mendapat `X-KedaiAI-Request-ID` header unik (UUID) untuk tracing.

### Supabase JWT Verification (Dashboard Endpoints)

```python
async def get_current_user(authorization: str = Header(None)) -> dict:
    """Verifikasi Supabase JWT untuk dashboard endpoints."""
    token = authorization.replace("Bearer ", "")
    user = supabase.auth.get_user(token)
    if not user.user:
        raise HTTPException(401, "invalid_jwt")
    return {"user_id": user.user.id}
```

---

## Section 11 — SSE Streaming Implementation

### Tujuan
Implementasi SSE yang benar sesuai PRD Section 11.

### Generator Function

```python
async def generate_sse(request, key_data):
    start_time = time.time()
    total_prompt_tokens = 0
    total_completion_tokens = 0
    
    try:
        response = await litellm.acompletion(
            model=request.model,
            messages=[m.model_dump() for m in request.messages],
            stream=True,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
        )
        
        async for chunk in response:
            yield f"data: {chunk.model_dump_json()}\n\n"
        
        yield "data: [DONE]\n\n"
        
        # Post-billing
        usage = response._hidden_params.get("usage", {})
        await deduct_balance(
            user_id=key_data["user_id"],
            api_key_id=key_data["id"],
            model=request.model,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            latency_ms=int((time.time() - start_time) * 1000),
        )
        
    except Exception as e:
        error_payload = json.dumps({"code": "upstream_error", "message": str(e)})
        yield f"data: [ERROR]{error_payload}\n\n"
```

### Heartbeat (Mencegah Timeout)

```python
# Kirim comment SSE setiap 15 detik jika tidak ada chunk
# ": heartbeat\n\n" — diabaikan client tapi jaga koneksi hidup
```

### Header Wajib

```python
return StreamingResponse(
    generate_sse(request, key_data),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",      # Matikan Nginx buffering
        "Connection": "keep-alive",
        "X-KedaiAI-Request-ID": request_id,
    }
)
```

---

## Section 12 — Error Handling

### Tujuan
Handler terpusat untuk semua error sesuai PRD Section 12.

### Global Exception Handlers

```python
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status": exc.status_code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"error": "validation_error", "detail": exc.errors()}
    )
```

### Error Code Mapping

| Kondisi | HTTP | Code |
|---------|------|------|
| Format API Key salah | 401 | `invalid_api_key` |
| API Key tidak ada di DB | 401 | `invalid_api_key` |
| API Key direvoke | 403 | `api_key_revoked` |
| Saldo = 0 atau < threshold | 402 | `insufficient_balance` |
| Model tidak didukung | 422 | `validation_error` |
| Rate limit exceeded | 429 | `rate_limit_exceeded` |
| AI Provider error | 502 | `upstream_error` |
| Backend tidak bisa reach provider | 503 | `service_unavailable` |

---

## Section 13 — Testing

### Tujuan
Unit test dan integration test sesuai PRD Section 14.

### `tests/test_billing.py`

- `test_calculate_cost_gemini_flash()` — verifikasi formula kalkulasi
- `test_calculate_cost_zero_tokens()` — edge case token = 0
- `test_markup_applied()` — pastikan markup 1.20x diterapkan

### `tests/test_auth.py`

- `test_generate_api_key_format()` — prefix `glm_`, panjang 44 chars, hash 64 chars
- `test_api_key_hash_consistency()` — hash deterministik
- `test_validate_invalid_format()` — format salah → 401
- `test_validate_revoked_key()` — key revoked → 403

### `tests/test_api.py`

- `test_health_endpoint()` — GET /health → 200
- `test_missing_auth_header()` — POST /v1/chat → 401
- `test_invalid_model()` — model tidak ada → 422
- `test_insufficient_balance()` — balance 0 → 402

### Test Tools

- `pytest` + `pytest-asyncio` untuk async tests
- `fastapi.testclient.TestClient` untuk endpoint tests
- Mock Supabase client untuk unit tests (hindari hit DB sungguhan)
- Mock LiteLLM untuk SSE tests

---

## Section 14 — Logging & Monitoring

### Tujuan
Structured logging dan error tracking sesuai PRD Section 16.

### Structured Logging

```python
import logging, json

logger = logging.getLogger("kedai_ai")

# Log setiap request selesai
logger.info(json.dumps({
    "event": "request_completed",
    "request_id": request_id,
    "user_id": user_id,
    "model": model,
    "prompt_tokens": prompt_tokens,
    "completion_tokens": completion_tokens,
    "cost_usd": cost_usd,
    "latency_ms": latency_ms,
    "status": "success"
}))
```

### Sentry Integration (Opsional)

```python
import sentry_sdk
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
    )
```

---

## Section 15 — Deployment

### Tujuan
Deploy ke Railway/Fly.io sesuai PRD Section 15.2.

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Environment Variables Wajib

| Variable | Keterangan | Contoh |
|----------|-----------|--------|
| `SUPABASE_URL` | URL project Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Key rahasia — jangan expose! | `eyJhbGci...` |
| `GOOGLE_API_KEY` | Gemini API Key | `AIzaSy...` |
| `OPENAI_API_KEY` | OpenAI API Key (opsional MVP) | `sk-proj-...` |
| `ANTHROPIC_API_KEY` | Anthropic API Key (opsional MVP) | `sk-ant-...` |
| `SECRET_KEY` | 64-char random string | `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | CORS whitelist | `https://kedai_ai.com` |
| `ENVIRONMENT` | `production` atau `development` | `production` |

### Urutan Deploy

1. Setup Supabase project → jalankan SQL migrations berurutan
2. Set environment variables di Railway
3. Push ke GitHub → Railway auto-deploy dari branch `main`
4. Cek `/health` endpoint — pastikan `status: healthy`
5. Test end-to-end dengan `curl`

---

## Prioritas Implementasi (Hackathon Timeline)

### Hari 1, 0–8 Jam: Foundation
- [ ] Setup project structure
- [ ] `requirements.txt` dan `Dockerfile`
- [ ] `config.py` dan `database.py`
- [ ] SQL migrations di Supabase (001–004 + seed)

### Hari 1, 8–16 Jam: Core Backend
- [ ] `models.py` — semua Pydantic schemas
- [ ] `services/auth.py` — key generation + validation
- [ ] `services/billing.py` — cost calculation + deduct
- [ ] `services/llm.py` — LiteLLM wrapper

### Hari 1, 16–24 Jam: Routing
- [ ] `routers/gateway.py` — `/v1/chat/completions` (SSE)
- [ ] `routers/gateway.py` — `/v1/models` + `/health`
- [ ] `routers/dashboard.py` — generate/revoke API Key
- [ ] `routers/dashboard.py` — mock top-up

### Hari 2, 0–8 Jam: Middleware & Security
- [ ] CORS middleware
- [ ] Rate limiting (slowapi)
- [ ] Global error handlers
- [ ] Request ID middleware

### Hari 2, 8–16 Jam: Testing & Polish
- [ ] Unit tests (billing, auth)
- [ ] Integration tests (API endpoints)
- [ ] Structured logging
- [ ] Manual test checklist (PRD Section 14.3)

### Hari 2, 16–24 Jam: Deployment
- [ ] Deploy ke Railway
- [ ] Set environment variables
- [ ] End-to-end test dari production URL
- [ ] Bug fixing

---

## Checklist Pre-Demo (dari PRD Section 14.3)

```
□ Daftar akun baru → wallet otomatis terbuat (trigger DB)
□ Top-up simulasi → saldo bertambah di dashboard
□ Generate API Key → key muncul sekali, prefix tersimpan
□ Kirim request via curl → SSE response streaming berhasil
□ Cek dashboard → saldo berkurang + log muncul
□ Revoke API Key → request berikutnya ditolak (403)
□ Coba request dengan saldo 0 → ditolak (402)
□ Health check endpoint berfungsi (/health)
□ Swagger UI (/docs) accessible
□ Rate limiting aktif (20 req/menit per IP)
```

---

## Referensi

- [LiteLLM Docs](https://docs.litellm.ai)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [FastAPI StreamingResponse](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- [PRD_Ridha_v2.md](./PRD_Ridha_v2.md) — Dokumen sumber utama
