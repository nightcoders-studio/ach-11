# Backend Task Tracker — GateLLM
> Referensi: [backend_plan.md](./backend_plan.md) | [PRD_Ridha_v2.md](./PRD_Ridha_v2.md)  
> Update status: `[ ]` belum → `[/]` sedang dikerjakan → `[x]` selesai

---

## Section 1 — Setup Project & Struktur Direktori

> **Tujuan:** Inisialisasi repo backend dengan folder structure yang benar.

- [x] Buat folder `backend/` di root project
- [x] Buat sub-folder: `app/`, `app/routers/`, `app/services/`, `tests/`, `supabase/migrations/`
- [x] Buat file `app/__init__.py` (kosong)
- [x] Buat file `app/routers/__init__.py` (kosong)
- [x] Buat file `app/services/__init__.py` (kosong)
- [x] Buat file `tests/__init__.py` (kosong)
- [x] Buat `requirements.txt` dengan semua dependency + versi pinned
  - `fastapi==0.111.0`
  - `uvicorn[standard]==0.30.1`
  - `litellm==1.40.0`
  - `supabase==2.5.1`
  - `pydantic==2.7.4`
  - `pydantic-settings==2.3.4`
  - `python-dotenv==1.0.1`
  - `httpx==0.27.0`
  - `slowapi==0.1.9`
  - `sentry-sdk==2.5.1`
  - `pytest==8.2.2`
  - `pytest-asyncio==0.23.7`
- [x] Buat `Dockerfile` (Python 3.11-slim, expose port 8000, CMD uvicorn)
- [x] Buat `.env.example` dengan semua variable (nilai kosong / placeholder)
- [x] Buat `.gitignore` (exclude `.env`, `__pycache__`, `.pytest_cache`, `*.pyc`)

---

## Section 2 — Database & Supabase Setup

> **Tujuan:** Buat semua tabel, trigger, RLS, dan stored function di Supabase.

### Supabase Project Init

- [x] Buat project Supabase baru (atau pakai yang sudah ada)
- [x] Catat `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`
- [x] Aktifkan Email Auth di Supabase Auth settings

### Migration: 001_create_tables.sql

- [x] Buat tabel `public.profiles`
  - Kolom: `id`, `email`, `full_name`, `created_at`, `updated_at`
  - Index: `idx_profiles_email`
- [x] Buat tabel `public.wallets`
  - Kolom: `id`, `user_id`, `balance`, `currency`, `total_spent`, `total_topup`, `updated_at`
  - Constraint: `balance_non_negative CHECK (balance >= 0)` ← **KRITIS**
  - Unique index: `idx_wallets_user_id`
- [x] Buat tabel `public.api_keys`
  - Kolom: `id`, `user_id`, `name`, `key_hash`, `key_prefix`, `status`, `last_used_at`, `expires_at`, `created_at`, `revoked_at`
  - Constraint: `valid_status CHECK (status IN ('active', 'revoked'))`
  - Index: `idx_api_keys_hash`, `idx_api_keys_user_id`, `idx_api_keys_status`
- [x] Buat tabel `public.usage_logs`
  - Kolom: `id`, `user_id`, `api_key_id`, `model_name`, `provider`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost_usd`, `cost_deducted`, `currency`, `request_id`, `latency_ms`, `status`, `error_message`, `ip_address`, `user_agent`, `created_at`
  - Index: `idx_usage_logs_user_id`, `idx_usage_logs_created_at`, `idx_usage_logs_user_created`, `idx_usage_logs_model`
- [x] Buat tabel `public.topup_logs`
  - Kolom: `id`, `user_id`, `amount`, `currency`, `method`, `reference_id`, `status`, `note`, `created_at`
- [x] Buat tabel `public.model_pricing`
  - Kolom: `id`, `model_id`, `display_name`, `provider`, `input_price_per_1k`, `output_price_per_1k`, `markup_rate`, `is_active`, `context_window`, `updated_at`

### Migration: 002_create_triggers.sql

- [x] Buat function `public.handle_new_user()` — auto-create profile + wallet saat user baru
- [x] Buat trigger `on_auth_user_created` AFTER INSERT ON `auth.users`
- [x] Buat function `public.update_updated_at()` — auto-update timestamp
- [x] Buat trigger `update_wallets_updated_at` BEFORE UPDATE ON `wallets`

### Migration: 003_create_rls_policies.sql

- [x] Aktifkan RLS pada `profiles` + buat policy SELECT dan UPDATE untuk owner
- [x] Aktifkan RLS pada `wallets` + buat policy SELECT untuk owner (UPDATE hanya via service_role)
- [x] Aktifkan RLS pada `api_keys` + buat policy SELECT, INSERT, UPDATE untuk owner
- [x] Aktifkan RLS pada `usage_logs` + buat policy SELECT untuk owner
- [x] Aktifkan RLS pada `topup_logs` + buat policy SELECT untuk owner

### Migration: 004_create_functions.sql

- [x] Buat function `public.deduct_balance_and_log(...)` — atomic:
  - `SELECT ... FOR UPDATE NOWAIT` (lock row wallet)
  - Cek `current_balance >= p_cost_deducted`
  - `UPDATE wallets SET balance = balance - cost`
  - `INSERT INTO usage_logs`
  - `UPDATE api_keys SET last_used_at = NOW()`
  - Return `BOOLEAN`

### Seed Data

- [x] Buat `supabase/seed.sql` dengan INSERT ke `model_pricing` untuk 5 model:
  - `gemini/gemini-1.5-flash` — input $0.000075, output $0.000300
  - `gemini/gemini-1.5-pro` — input $0.003500, output $0.010500
  - `openai/gpt-3.5-turbo` — input $0.000500, output $0.001500
  - `openai/gpt-4o-mini` — input $0.000150, output $0.000600
  - `anthropic/claude-3-haiku` — input $0.000250, output $0.001250
- [x] Jalankan seed.sql di Supabase SQL Editor

### Verifikasi Database

- [x] Test trigger: daftar user baru → cek `profiles` dan `wallets` otomatis terbuat
- [x] Test RLS: query dengan anon key → hanya lihat data sendiri
- [x] Test function: panggil `deduct_balance_and_log` secara manual via SQL

---

## Section 3 — Config & Database Client

> **Tujuan:** Buat `config.py` dan `database.py` yang aman dan reusable.

### `app/config.py`

- [x] Import `pydantic_settings.BaseSettings`
- [x] Definisi class `Settings` dengan semua field:
  - `supabase_url: str`
  - `supabase_service_role_key: str`
  - `google_api_key: str`
  - `openai_api_key: str = ""`
  - `anthropic_api_key: str = ""`
  - `environment: str = "development"`
  - `allowed_origins: str = "http://localhost:3000"`
  - `secret_key: str`
  - `rate_limit_per_minute: int = 20`
  - `default_markup_rate: float = 1.20`
  - `min_balance_threshold: float = 0.0001`
  - `sentry_dsn: str = ""`
  - `log_level: str = "INFO"`
- [x] `class Config: env_file = ".env"`
- [x] Buat instance `settings = Settings()` di bawah class

### `app/database.py`

- [x] Import `supabase` dan `settings`
- [x] Buat singleton `supabase_client` menggunakan `service_role` key
- [x] Export fungsi `get_supabase()` untuk dependency injection
- [x] **Verifikasi:** Tidak ada `anon_key` di database.py — hanya `service_role`

---

## Section 4 — Models (Pydantic Schemas)

> **Tujuan:** Definisi semua request/response schema dengan validasi ketat.

### `app/models.py` — Request Schemas

- [x] `ChatMessage` — `role` pattern `^(system|user|assistant)$`, `content` max 100.000 chars
- [x] `ChatRequest` — `model` dengan field_validator whitelist, `messages` min 1 max 100, `max_tokens` 1–4096, `temperature` 0.0–2.0
- [x] `CreateApiKeyRequest` — `name` min 1 max 100 chars
- [x] `TopUpRequest` — `amount: float` gt=0, preset validation (0.60, 3.00, 6.00 USD)

### `app/models.py` — Response Schemas

- [x] `ApiKeyResponse` — `id`, `name`, `key_prefix`, `status`, `created_at`, `last_used_at`
- [x] `ApiKeyCreateResponse(ApiKeyResponse)` — tambah `raw_key: str` (hanya muncul sekali)
- [x] `WalletResponse` — `balance`, `currency`, `total_spent`, `total_topup`
- [x] `ModelInfo` — `id`, `display_name`, `provider`, `input_price_per_1k_usd`, `output_price_per_1k_usd`, `context_window`
- [x] `HealthResponse` — `status`, `version`, `timestamp`, `providers: dict[str, str]`
- [x] `ErrorResponse` — `error: str`, `status: int`, `detail: Any = None`

---

## Section 5 — Auth Service

> **Tujuan:** Generate dan validasi API Key dengan SHA-256.

### `app/services/auth.py`

- [x] Import `hashlib`, `secrets`
- [x] Fungsi `generate_api_key() -> tuple[str, str, str]`:
  - `raw = "glm_" + secrets.token_urlsafe(30)` (total 44 chars)
  - `hashed = hashlib.sha256(raw.encode()).hexdigest()` (64 chars)
  - `prefix = raw[:12]` (misal: `glm_a1B2c3D4`)
  - Return `(raw, hashed, prefix)`
- [x] Fungsi `async validate_api_key(authorization: str) -> dict`:
  - Cek format `Bearer glm_` → raise 401 jika salah
  - Extract raw_key dan hash
  - Query `api_keys WHERE key_hash = hash AND status = 'active'`
  - Raise 401 jika tidak ada
  - Raise 403 jika `status == 'revoked'`
  - Return `{id, user_id}`
- [x] Fungsi `async verify_supabase_jwt(authorization: str) -> dict`:
  - Untuk dashboard endpoints
  - Gunakan `supabase.auth.get_user(token)`
  - Raise 401 jika invalid
  - Return `{user_id: user.id}`

### Verifikasi Auth Service

- [x] Manual test: `generate_api_key()` → pastikan prefix `glm_`, panjang benar
- [x] Manual test: hash hasil `generate_api_key()` → konsisten setiap kali

---

## Section 6 — Billing Service

> **Tujuan:** Kalkulasi biaya per request dan atomic deduction dari wallet.

### `app/services/billing.py`

- [x] Fungsi `async get_model_pricing(model_id: str) -> dict`:
  - Query `model_pricing WHERE model_id = x AND is_active = TRUE`
  - Cache in-memory (dict sederhana) untuk mengurangi DB query
  - Raise `ValueError` jika model tidak ditemukan

- [x] Fungsi `calculate_cost(model_id, prompt_tokens, completion_tokens) -> tuple[float, float]`:
  - Ambil pricing dari `get_model_pricing()`
  - Hitung: `cost_usd = (prompt / 1000 * input_price) + (completion / 1000 * output_price)`
  - Hitung: `cost_deducted = cost_usd * markup_rate`
  - Return `(cost_usd, cost_deducted)`

- [x] Fungsi `async check_balance(user_id: str) -> float`:
  - Query `wallets WHERE user_id = x`
  - Return `balance`
  - Raise 402 jika `balance < min_balance_threshold`

- [x] Fungsi `async deduct_balance(user_id, api_key_id, model_name, provider, prompt_tokens, completion_tokens, cost_usd, cost_deducted, request_id, latency_ms) -> bool`:
  - Panggil Supabase RPC `deduct_balance_and_log`
  - Return `True` jika sukses, `False` jika saldo tidak cukup
  - Log warning jika return False (edge case)

### Verifikasi Billing

- [x] Kalkulasi manual: Gemini Flash, 500 prompt + 200 completion
  - Harusnya: `cost_usd = 0.0000975`, `cost_deducted = 0.000117`
- [x] Test race condition: panggil `deduct_balance` concurrent → saldo tidak boleh minus

---

## Section 7 — LLM Service (LiteLLM Wrapper)

> **Tujuan:** Abstraksi LiteLLM dengan error handling yang proper.

### `app/services/llm.py`

- [x] Set provider API keys dari settings:
  ```python
  litellm.google_api_key = settings.google_api_key
  litellm.openai_api_key = settings.openai_api_key
  litellm.anthropic_api_key = settings.anthropic_api_key
  litellm.telemetry = False  # Matikan telemetry
  ```
- [x] Fungsi `async stream_completion(model, messages, max_tokens, temperature) -> AsyncGenerator`:
  - Panggil `litellm.acompletion(stream=True, ...)`
  - Return response generator
- [x] Error mapping LiteLLM → HTTPException:
  - `AuthenticationError` → 502 `upstream_auth_error`
  - `RateLimitError` → 429 `upstream_rate_limit`
  - `ServiceUnavailableError` → 503 `service_unavailable`
  - `Timeout` → 504 `upstream_timeout`
  - `APIConnectionError` → 502 `upstream_error`
- [x] Fungsi `get_available_providers() -> dict`:
  - Cek ketersediaan setiap provider dari API key yang terisi
  - Return `{"gemini": "available", "openai": "unavailable", ...}`

---

## Section 8 — Gateway Router

> **Tujuan:** Endpoint utama `/v1/chat/completions` dengan SSE streaming.

### `app/routers/gateway.py`

#### `POST /v1/chat/completions`

- [x] Parse dan validasi `Authorization` header
- [x] Panggil `validate_api_key()` → dapatkan `{user_id, api_key_id}`
- [x] Panggil `check_balance(user_id)` → raise 402 jika tidak cukup
- [x] Generate `request_id` (UUID)
- [x] Catat `start_time = time.time()`
- [x] Buat async generator `generate_sse()`:
  - [x] Panggil `stream_completion(...)` dari LLM service
  - [x] Loop: `async for chunk in response` → yield `f"data: {chunk.model_dump_json()}\n\n"`
  - [x] Setelah loop: yield `"data: [DONE]\n\n"`
  - [x] Post-billing: ambil usage data → panggil `deduct_balance(...)`
  - [x] Error handling: catch exception → yield `f"data: [ERROR]{json}\n\n"`
- [x] Return `StreamingResponse` dengan headers:
  - `media_type="text/event-stream"`
  - `Cache-Control: no-cache`
  - `X-Accel-Buffering: no`
  - `Connection: keep-alive`
  - `X-GateLLM-Request-ID: {request_id}`

#### `GET /v1/models`

- [x] Validasi API Key (diperlukan auth)
- [x] Query `model_pricing WHERE is_active = TRUE`
- [x] Return list `ModelInfo`

#### `GET /health`

- [x] Public endpoint — tidak perlu auth
- [x] Cek koneksi Supabase (simple SELECT 1)
- [x] Return `HealthResponse` dengan provider availability

---

## Section 9 — Dashboard Router

> **Tujuan:** Manajemen API Key dan top-up dengan Supabase JWT auth.

### `app/routers/dashboard.py`

#### `POST /dashboard/api-keys` — Generate API Key

- [x] Dependency: `verify_supabase_jwt()` → `user_id`
- [x] Hitung active keys: `COUNT(*) WHERE user_id = x AND status = 'active'`
- [x] Jika >= 5 → raise `HTTPException(400, "max_keys_reached")`
- [x] Panggil `generate_api_key()` → `(raw, hashed, prefix)`
- [x] Insert ke `api_keys`: `{user_id, name, key_hash: hashed, key_prefix: prefix, status: 'active'}`
- [x] Return `ApiKeyCreateResponse` dengan `raw_key` (HANYA sekali ini!)
- [x] Log: "API Key generated for user {user_id}"

#### `DELETE /dashboard/api-keys/{key_id}` — Revoke API Key

- [x] Dependency: `verify_supabase_jwt()` → `user_id`
- [x] Query `api_keys WHERE id = key_id AND user_id = user_id`
- [x] Jika tidak ada → raise `HTTPException(404, "key_not_found")`
- [x] Update: `{status: 'revoked', revoked_at: NOW()}`
- [x] Return `{message: "API Key berhasil dinonaktifkan", key_id: key_id}`

#### `GET /dashboard/api-keys` — List API Keys

- [x] Dependency: `verify_supabase_jwt()` → `user_id`
- [x] Query semua `api_keys WHERE user_id = user_id`
- [x] Return list `ApiKeyResponse` (tanpa `raw_key`!)

#### `POST /dashboard/topup` — Mock Top Up

- [x] Dependency: `verify_supabase_jwt()` → `user_id`
- [x] Validasi `amount` → harus salah satu dari preset: `[0.60, 3.00, 6.00]` USD
- [x] Update `wallets`: `balance += amount`, `total_topup += amount`
- [x] Insert ke `topup_logs`: `{user_id, amount, method: 'SIMULATION', status: 'completed'}`
- [x] Return `{new_balance, amount_added, currency: 'USD'}`

#### `GET /dashboard/wallet` — Cek Saldo

- [x] Dependency: `verify_supabase_jwt()` → `user_id`
- [x] Query `wallets WHERE user_id = user_id`
- [x] Return `WalletResponse`

---

## Section 10 — `app/main.py` & Middleware

> **Tujuan:** Assembling semua komponen dan konfigurasi global FastAPI app.

### `app/main.py`

- [x] Inisialisasi `FastAPI(title="GateLLM API", version="1.0.0", description="...")`
- [x] Tambah `CORSMiddleware`:
  - `allow_origins = settings.allowed_origins.split(",")`
  - `allow_credentials = True`
  - `allow_methods = ["GET", "POST", "DELETE"]`
  - `allow_headers = ["Authorization", "Content-Type"]`
- [x] Setup `slowapi` rate limiter:
  - `Limiter(key_func=get_remote_address)`
  - State: `app.state.limiter = limiter`
  - Exception handler: `_rate_limit_exceeded_handler`
- [x] Include routers:
  - `app.include_router(gateway_router)` — prefix tidak ada (sudah `/v1/...`)
  - `app.include_router(dashboard_router, prefix="/dashboard")`
- [x] Global exception handlers:
  - `HTTPException` → return JSON `{error, status}`
  - `RequestValidationError` → return JSON `{error: "validation_error", detail}`
- [x] Sentry init (jika `settings.sentry_dsn` tidak kosong)
- [x] Logging config: `logging.basicConfig(level=settings.log_level)`
- [x] `@app.on_event("startup")` — log "GateLLM backend started"

---

## Section 11 — SSE Streaming (Heartbeat & Edge Cases)

> **Tujuan:** Pastikan SSE stream stabil untuk koneksi panjang.

### Heartbeat Implementation

- [x] Buat `async def send_heartbeat(interval=15)`:
  - `await asyncio.sleep(interval)`
  - yield `": heartbeat\n\n"`
- [x] Integrasikan heartbeat di `generate_sse()` menggunakan `asyncio.create_task`
- [x] Cancel heartbeat task setiap kali ada chunk baru
- [x] Cancel heartbeat task setelah stream selesai

### Edge Cases

- [x] Handle `asyncio.CancelledError` (client disconnect) — cleanup resource
- [x] Handle AI provider timeout — yield `[ERROR]` event
- [x] Handle saldo habis di tengah stream (post-billing fail) — log, lanjutkan, catat hutang
- [x] Handle `ForUpdateNoWait` exception dari Supabase — retry sekali atau log

---

## Section 12 — Error Handling & Logging

> **Tujuan:** Consistent error response dan structured logging.

### Error Handling

- [x] Buat file `app/exceptions.py` dengan custom exception classes:
  - `InvalidApiKeyError(HTTPException)` — 401
  - `RevokedApiKeyError(HTTPException)` — 403
  - `InsufficientBalanceError(HTTPException)` — 402
  - `MaxKeysReachedError(HTTPException)` — 400
  - `UpstreamError(HTTPException)` — 502
- [x] Register semua custom exception di `main.py`
- [x] Pastikan semua error response format konsisten: `{error: str, status: int}`

### Structured Logging

- [x] Log setiap request yang masuk ke `/v1/chat/completions` (sebelum proses)
- [x] Log setelah request selesai: `{event, request_id, user_id, model, tokens, cost, latency, status}`
- [x] Log warning untuk: saldo hampir habis, rate limit hit, upstream error
- [x] Log error untuk: DB failure, unexpected exception

---

## Section 13 — Testing

> **Tujuan:** Unit tests dan integration tests sesuai PRD Section 14.

### Setup Test Environment

- [x] Buat `tests/conftest.py` dengan fixtures:
  - Mock Supabase client
  - Mock LiteLLM response
  - Test FastAPI client (`TestClient(app)`)
- [x] Buat `.env.test` dengan test values

### `tests/test_billing.py`

- [x] `test_calculate_cost_gemini_flash` — 500 prompt + 200 completion → expected cost
- [x] `test_calculate_cost_with_markup` — pastikan markup 1.20x diterapkan
- [x] `test_calculate_cost_zero_tokens` — edge case
- [x] `test_calculate_cost_large_request` — 100k tokens

### `tests/test_auth.py`

- [x] `test_generate_api_key_format` — prefix `glm_`, total 44 chars
- [x] `test_api_key_hash_is_sha256` — hash 64 chars hex
- [x] `test_hash_is_deterministic` — hash sama untuk key yang sama
- [x] `test_validate_wrong_format` — tidak ada `Bearer glm_` → 401
- [x] `test_validate_nonexistent_key` — hash tidak ada di DB → 401
- [x] `test_validate_revoked_key` — status revoked → 403

### `tests/test_api.py`

- [x] `test_health_endpoint` — GET /health → 200, status healthy
- [x] `test_missing_auth` — POST /v1/chat tanpa header → 401
- [x] `test_invalid_model` — model tidak ada → 422
- [x] `test_invalid_role` — role bukan system/user/assistant → 422
- [x] `test_generate_api_key` — POST /dashboard/api-keys → 200 dengan raw_key
- [x] `test_revoke_api_key` — DELETE /dashboard/api-keys/{id} → status revoked
- [x] `test_topup_valid_amount` — POST /dashboard/topup dengan amount valid
- [x] `test_topup_invalid_amount` — amount tidak di preset → 422

### Jalankan Tests

- [x] `pytest tests/ -v` — semua test harus pass
- [x] `pytest tests/ --cov=app` — cek coverage (target >70%)

---

## Section 14 — Logging & Monitoring

> **Tujuan:** Setup logging dan error tracking sesuai PRD Section 16.

- [x] Setup logging format: `asctime levelname name message`
- [x] Tambah structured JSON logging untuk events penting
- [x] Inisialisasi Sentry SDK di `main.py` (kondisional jika DSN tersedia)
- [x] Test Sentry: trigger error manual → cek di Sentry dashboard
- [x] Dokumentasikan log events di README

---

## Section 15 — Deployment

> **Tujuan:** Deploy ke Railway dan verifikasi production environment.

### Pre-Deployment Checklist

- [x] Semua environment variables di-set di Railway dashboard
- [x] `SUPABASE_SERVICE_ROLE_KEY` tidak ada di repository (hanya di `.env` lokal + Railway)
- [x] `allowed_origins` sudah include domain Vercel production
- [x] Dockerfile sudah ditest secara lokal: `docker build -t gatellm-backend .`
- [x] `docker run -p 8000:8000 gatellm-backend` → GET /health berhasil

### Deployment Steps

- [x] Push code ke GitHub branch `main`
- [x] Connect Railway ke GitHub repo
- [x] Set environment variables di Railway
- [x] Railway auto-build dari Dockerfile
- [x] Catat Railway URL: `https://xxx.railway.app`
- [x] Update `ALLOWED_ORIGINS` di Railway env untuk include Vercel URL

### Post-Deployment Verification

- [x] `GET https://xxx.railway.app/health` → `{"status": "healthy"}`
- [x] `GET https://xxx.railway.app/docs` → Swagger UI accessible
- [x] Test curl streaming:
  ```bash
  curl -X POST https://xxx.railway.app/v1/chat/completions \
    -H "Authorization: Bearer glm_xxx" \
    -H "Content-Type: application/json" \
    -d '{"model": "gemini/gemini-1.5-flash", "messages": [{"role": "user", "content": "Halo"}], "stream": true}'
  ```
- [ ] Cek Railway logs — tidak ada error saat startup

---

## Manual Test Checklist Pre-Demo (PRD Section 14.3)

> Jalankan ini sebelum presentasi demo!

- [ ] Daftar akun baru → cek tabel `profiles` dan `wallets` otomatis terbuat
- [ ] Top-up simulasi Rp 50.000 ($3.00) → saldo bertambah di dashboard
- [ ] Generate API Key → full key muncul sekali, prefix tersimpan di tabel
- [ ] Kirim request via curl → SSE streaming berjalan, teks muncul per chunk
- [ ] Cek dashboard → saldo berkurang sesuai biaya, log muncul di usage_logs
- [ ] Revoke API Key → kirim request lagi → mendapat 403 `api_key_revoked`
- [ ] Set saldo ke 0 → kirim request → mendapat 402 `insufficient_balance`
- [ ] GET /health → `{"status": "healthy", ...}`
- [ ] GET /docs → Swagger UI terbuka
- [ ] Rate limit test: kirim 21 request dalam 1 menit → request ke-21 mendapat 429

---

## Progress Summary

| Section | Deskripsi | Status |
|---------|-----------|--------|
| 1 | Setup Project & Struktur | `[ ]` |
| 2 | Database & Supabase | `[ ]` |
| 3 | Config & DB Client | `[ ]` |
| 4 | Pydantic Models | `[ ]` |
| 5 | Auth Service | `[ ]` |
| 6 | Billing Service | `[ ]` |
| 7 | LLM Service | `[ ]` |
| 8 | Gateway Router | `[ ]` |
| 9 | Dashboard Router | `[ ]` |
| 10 | main.py & Middleware | `[ ]` |
| 11 | SSE Streaming Edge Cases | `[ ]` |
| 12 | Error Handling & Logging | `[ ]` |
| 13 | Testing | `[ ]` |
| 14 | Monitoring | `[ ]` |
| 15 | Deployment | `[ ]` |
| Demo | Pre-Demo Manual Test | `[ ]` |
