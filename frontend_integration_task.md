# Frontend Integration Task Tracker — KedaiAI
> Referensi: [frontend_integration_plan.md](./frontend_integration_plan.md) | [backend_plan.md](./backend_plan.md)  
> Update status: `[ ]` belum → `[/]` sedang dikerjakan → `[x]` selesai

---

## 🛠️ Fase 1 — Setup Environment & Supabase Client

> **Tujuan:** Menambahkan library Supabase ke frontend dan setup file `.env` config.

- [x] Install package Supabase di folder frontend:
  ```bash
  cd frontend
  npm install @supabase/supabase-js
  ```
- [x] Buat file `frontend/.env` (atau `.env.local`):
  - `VITE_SUPABASE_URL=https://aemabilsjwhhuerhywty.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - `VITE_API_BASE_URL=http://localhost:8000` (atau URL production backend)
- [x] Buat file `frontend/src/lib/supabase.ts` untuk ekspor instance `supabase` singleton client.
- [x] Verifikasi inisialisasi: jalankan server dev frontend, pastikan Supabase client ter-import tanpa build error.

---

## 🔐 Fase 2 — Refactor Autentikasi Pengguna

> **Tujuan:** Mengganti alur login instan mock dengan real authentication dari Supabase.

- [x] Modifikasi `LandingPage.tsx`:
  - Tambah input text `Password` di Form registrasi/login.
  - Implementasi handler `handleRegister` menggunakan `supabase.auth.signUp(...)`.
  - Implementasi handler `handleLogin` menggunakan `supabase.auth.signInWithPassword(...)`.
  - Handle error display jika password tidak cocok atau email salah format.
- [x] Modifikasi `App.tsx`:
  - Gunakan `useEffect` untuk memantau auth state via `supabase.auth.onAuthStateChange`.
  - Ganti state `session` lokal agar reactive dengan session payload dari server Supabase.
  - Implementasi real logout: `await supabase.auth.signOut()` saat tombol logout ditekan.

---

## 🔑 Fase 3 — Dashboard & API Keys Integration

> **Tujuan:** Menghubungkan manajemen API key dashboard dengan endpoint FastAPI backend.

- [x] Modifikasi `ApiKeysTab.tsx`:
  - Update tombol *Generate New Key* untuk memanggil backend endpoint `POST /dashboard/api-keys` menggunakan JWT token bearer aktif.
  - Update aksi *Revoke Key* untuk memanggil `DELETE /dashboard/api-keys/{id}` ke backend.
  - Ganti query tabel daftar API keys agar melakukan fetch langsung dari Supabase table `api_keys`.
- [x] Verifikasi modal: Pastikan raw key `glm_prod_xxxx` tampil utuh hanya sekali saat generate key, dan masked key muncul di dalam tabel.

---

## 💳 Fase 4 — Billing & Usage Analytics Integration

> **Tujuan:** Menghubungkan top-up prabayar simulasi dan membaca usage logs real-time.

- [x] Modifikasi `BillingTab.tsx`:
  - Hubungkan trigger tombol nominal simulasi top-up ($0.60, $3.00, $6.00) untuk memicu `POST /dashboard/topup` ke backend FastAPI.
  - Alihkan daftar riwayat transaksi membaca langsung dari tabel `topup_logs` lewat Supabase SELECT.
- [x] Modifikasi `UsageTab.tsx` dan `DashboardTab.tsx`:
  - Tarik data penggunaan (tokens, model, cost) dari Supabase table `usage_logs`.
  - Buat reactive subscription (realtime WebSocket) ke table `wallets` agar nominal saldo di sidebar auto-update seketika setelah request playground selesai.

---

## 🧪 Fase 5 — Playground Real SSE Streaming

> **Tujuan:** Menghubungkan Playground chat dengan API Gateway streaming FastAPI menggunakan API Key KedaiAI.

- [x] Modifikasi `PlaygroundTab.tsx`:
  - Ambil salah satu API Key aktif milik user dari state untuk digunakan sebagai authorization header (`Bearer glm_xxx`).
  - Ganti target fetch `/api/chat` (mock) dengan URL gateway real `${VITE_API_BASE_URL}/v1/chat/completions`.
  - Tambahkan whitelist dropdown model lengkap (termasuk Gemini 2.0 Flash Lite Preview Free dan 18 model gratis baru).
  - Pastikan parser stream membaca format SSE standar (`data: {...}`) chunk-by-chunk dan menampilkan teks secara mengalir (real streaming).

---

## 📈 Progress Summary

| Fase | Deskripsi | Status |
|------|-----------|--------|
| 1 | Setup Env & Supabase Client | `[x]` |
| 2 | Refactor Autentikasi Pengguna | `[x]` |
| 3 | API Keys Integration | `[x]` |
| 4 | Billing & Logs Integration | `[x]` |
| 5 | Playground Real Stream | `[x]` |
