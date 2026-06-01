<div align="center">

# ⚡ KedaiAI

**Satu API Key. Semua Model AI Terkemuka. Berbasis Prabayar.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![LiteLLM](https://img.shields.io/badge/LiteLLM-1.40.0-blueviolet?style=flat-square)](https://litellm.ai)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 🚀 Tentang KedaiAI

**KedaiAI** adalah **API Gateway** terpadu yang menyederhanakan akses ke berbagai model AI terkemuka melalui **satu API Key** dengan sistem **saldo prabayar (prepaid)**. Dibangun untuk developer yang ingin fleksibilitas memilih model AI terbaik tanpa harus mengelola banyak akun dan API key terpisah.

### ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🔑 **Satu API Key** | Akses 22+ model AI dari Gemini, OpenAI, Anthropic, OpenRouter |
| 💳 **Sistem Prepaid** | Top-up saldo sebelum digunakan, tidak ada tagihan mengejutkan |
| ⚡ **SSE Streaming** | Respons streaming real-time ala OpenAI compatible |
| 📊 **Usage Analytics** | Lacak penggunaan token dan biaya per request |
| 🔒 **Aman** | SHA-256 API Key hashing, RLS Supabase, rate limiting bawaan |
| 🌐 **Multi-Provider** | Gemini, GPT, Claude, Llama, Gemma, Qwen, dan banyak lagi |

---

## 🏗️ Arsitektur

```
Client App / Developer
        │
        │  POST /v1/chat/completions
        │  Authorization: Bearer glm_xxxxxxxx
        ▼
┌──────────────────────────────────────────┐
│            KedaiAI API Gateway           │
│              (FastAPI + Uvicorn)         │
│                                          │
│  ┌──────────┐   ┌────────────────────┐  │
│  │  Routers │   │     Middleware      │  │
│  │ /v1/*    │   │  • CORS            │  │
│  │ /dashboard│  │  • Rate Limiting   │  │
│  └────┬─────┘   │  • Auth Inject     │  │
│       │         └────────────────────┘  │
│  ┌────▼──────────────────────────────┐  │
│  │            Services               │  │
│  │  • auth.py    (Key Validation)    │  │
│  │  • billing.py (Cost Calculation)  │  │
│  │  • llm.py     (LiteLLM Wrapper)   │  │
│  └────┬──────────────────────────────┘  │
└───────┼──────────────────────────────────┘
        │
   ┌────┴─────────────────────┐
   │                          │
   ▼                          ▼
Supabase DB               LiteLLM
(PostgreSQL + Auth)   (Gemini / OpenAI /
                       Anthropic / OpenRouter)
```

---

## 🤖 Model AI yang Didukung

### Native Providers
| Model ID | Provider | Tier |
|----------|----------|------|
| `gemini/gemini-1.5-flash` | Google | Berbayar |
| `gemini/gemini-1.5-pro` | Google | Berbayar |
| `openai/gpt-3.5-turbo` | OpenAI | Berbayar |
| `openai/gpt-4o-mini` | OpenAI | Berbayar |
| `anthropic/claude-3-haiku` | Anthropic | Berbayar |

### Via OpenRouter (Free Tier)
| Model | Provider |
|-------|----------|
| `openrouter/google/gemini-2.0-flash-lite-preview-02-05:free` | Google |
| `openrouter/meta-llama/llama-3.3-70b-instruct:free` | Meta |
| `openrouter/nvidia/nemotron-3-super-120b-a12b:free` | NVIDIA |
| `openrouter/qwen/qwen3-next-80b-a3b-instruct:free` | Alibaba |
| `openrouter/openai/gpt-oss-120b:free` | OpenAI |
| Dan 12+ model lainnya... | — |

---

## 🗂️ Struktur Proyek

```
Hackathon/
├── backend/                   # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py            # Entry point
│   │   ├── config.py          # Environment settings
│   │   ├── database.py        # Supabase client
│   │   ├── models.py          # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── gateway.py     # /v1/chat/completions, /v1/models
│   │   │   └── dashboard.py   # /dashboard/* endpoints
│   │   └── services/
│   │       ├── auth.py        # API Key validation
│   │       ├── billing.py     # Cost & balance management
│   │       └── llm.py         # LiteLLM wrapper
│   ├── supabase/
│   │   ├── migrations/        # SQL schema migrations
│   │   └── seed.sql           # Initial model pricing data
│   ├── tests/                 # Unit & integration tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                  # React + TypeScript + Vite
    ├── src/
    │   ├── components/        # UI components per tab
    │   ├── lib/supabase.ts    # Supabase client
    │   ├── App.tsx            # Root app + state management
    │   ├── types.ts           # TypeScript type definitions
    │   └── mockData.ts        # Development mock data
    ├── package.json
    ├── vite.config.ts
    └── .env.example
```

---

## ⚙️ Setup & Instalasi

### Prasyarat
- Python **3.11+**
- Node.js **18+**
- Akun [Supabase](https://supabase.com) (gratis)
- API Key minimal salah satu provider: [Google AI](https://aistudio.google.com), [OpenRouter](https://openrouter.ai)

---

### 1. Clone Repository

```bash
git clone git@github.com:nightcoders-studio/ach-11.git
cd ach-11
```

---

### 2. Setup Database (Supabase)

Jalankan file migrasi SQL secara berurutan di **Supabase SQL Editor**:

```sql
-- Jalankan satu per satu di Supabase Dashboard > SQL Editor
-- 1. Buat semua tabel
\i backend/supabase/migrations/001_create_tables.sql

-- 2. Buat triggers
\i backend/supabase/migrations/002_create_triggers.sql

-- 3. Buat functions
\i backend/supabase/migrations/003_create_functions.sql

-- 4. Insert data harga model awal
\i backend/supabase/seed.sql
```

---

### 3. Setup Backend

```bash
cd backend

# Buat virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Salin dan isi environment variables
cp .env.example .env
```

Edit file `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# AI Providers (minimal isi salah satu)
OPENROUTER_API_KEY=sk-or-v1-...
GOOGLE_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...       # Opsional
ANTHROPIC_API_KEY=sk-ant-...     # Opsional

# App Config
SECRET_KEY=your-64-char-random-secret
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173

# Rate Limiting
RATE_LIMIT_PER_MINUTE=20

# Monitoring (Opsional)
SENTRY_DSN=
```

Jalankan backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend tersedia di: `http://localhost:8000`  
Dokumentasi API: `http://localhost:8000/docs`

---

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Salin dan isi environment variables
cp .env.example .env
```

Edit file `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_API_BASE_URL=http://localhost:8000
```

Jalankan frontend:

```bash
npm run dev
```

Frontend tersedia di: `http://localhost:5173`

---

## 📡 API Reference

### Authentication
Semua request ke `/v1/*` membutuhkan header:
```
Authorization: Bearer glm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Endpoint Utama

#### `POST /v1/chat/completions`
Kirim request ke model AI dengan SSE streaming.

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer glm_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    "messages": [
      {"role": "user", "content": "Halo, siapa kamu?"}
    ],
    "stream": true,
    "max_tokens": 500
  }'
```

**Response:** Server-Sent Events (SSE) stream

#### `GET /v1/models`
Dapatkan daftar model yang tersedia beserta harga.

```bash
curl http://localhost:8000/v1/models \
  -H "Authorization: Bearer glm_your_api_key"
```

#### `GET /health`
Cek status sistem (public, tanpa auth).

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-06-01T08:00:00Z",
  "providers": {
    "google": "available",
    "openrouter": "available",
    "supabase_db": "available"
  }
}
```

---

## 🧪 Menjalankan Tests

```bash
cd backend
pytest tests/ -v
```

Test yang tersedia:
- `test_billing.py` — kalkulasi biaya dan markup
- `test_auth.py` — API Key generation dan validasi
- `test_api.py` — endpoint integration tests

---

## 🐳 Docker

```bash
cd backend

# Build image
docker build -t kedai_ai-backend .

# Run container
docker run -p 8000:8000 --env-file .env kedai_ai-backend
```

---

## 🚀 Deploy ke Production

### Backend (Railway / Fly.io)

1. Push code ke GitHub
2. Hubungkan repository ke [Railway](https://railway.app) atau [Fly.io](https://fly.io)
3. Set environment variables di dashboard platform
4. Set `ENVIRONMENT=production` dan `ALLOWED_ORIGINS=https://your-frontend-domain.com`
5. Deploy otomatis dari branch `main`

### Frontend (Vercel / Netlify)

```bash
cd frontend
npm run build
# Upload folder dist/ ke Vercel/Netlify
```

---

## 🔐 Keamanan

- **API Key** di-hash dengan SHA-256 sebelum disimpan di database
- **RLS (Row Level Security)** aktif di semua tabel Supabase
- **Rate Limiting** 20 request/menit per IP (configurable)
- **CORS** dikonfigurasi dengan whitelist domain
- **Environment Variables** — jangan pernah commit file `.env`!

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Backend** | FastAPI, Python 3.11, Uvicorn |
| **AI Routing** | LiteLLM 1.40 |
| **Database** | Supabase (PostgreSQL + Auth + Realtime) |
| **Frontend** | React 19, TypeScript, Vite 6 |
| **Styling** | TailwindCSS v4 |
| **Monitoring** | Sentry SDK |
| **Containerization** | Docker |

---

## 👥 Tim

Proyek ini dibuat untuk keperluan **Hackathon** oleh **NightCoders Studio**.

---

## 📄 License

MIT License — bebas digunakan dan dimodifikasi.

---

<div align="center">
  <strong>KedaiAI</strong> — Dibangun dengan ❤️ oleh NightCoders Studio
</div>
