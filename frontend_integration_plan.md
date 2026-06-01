# Frontend-Backend Integration Plan — KedaiAI
> Target: **Menghubungkan Mock Frontend React (Vite) ke API Real FastAPI (Python)**  
> Berdasarkan: [backend_plan.md](./backend_plan.md) & [backend_task.md](./backend_task.md)  
> Terakhir Diperbarui: Juni 2026

---

## 🔗 Gambaran Integrasi API & Perubahan Alur State

Saat ini, frontend menggunakan state lokal tiruan (`localStorage` + `mockData.ts`) untuk mensimulasikan login, audit API key, wallet top-up, logs transaksi, dan streaming playground. 

Integrasi sesungguhnya akan **menghapus dependency mock** ini secara bertahap saat user login, dan mengalihkannya langsung ke API endpoint FastAPI / Supabase Client.

### Arsitektur Alur Data Sesungguhnya

```
                     ┌──────────────────────────────┐
                     │         React App            │
                     │  (Vite + Lucide + Tailwind)  │
                     └──────┬────────────────┬──────┘
                            │                │
            Supabase Client │                │ HTTP Request (Bearer JWT / API Key)
            (Auth / Select) │                │
                            ▼                ▼
                     ┌────────────┐   ┌──────────────┐
                     │  Supabase  │   │   FastAPI    │
                     │  Platform  │   │ API Gateway  │
                     └────────────┘   └──────────────┘
```

---

## 🛠️ Langkah-Langkah Integrasi Fungsional

### 1. Supabase Client Integration di Frontend

Kita perlu menginstal `@supabase/supabase-js` di folder frontend dan menginisialisasi singleton client untuk menangani autentikasi langsung ke database PostgreSQL kita.

#### `frontend/src/lib/supabase.ts` [NEW]
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aemabilsjwhhuerhywty.supabase.co';
// anon key aman ditaruh di client
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

### 2. Autentikasi Pengguna & Wallet (LandingPage.tsx)

Menghilangkan input mock "Nama" dan "Email" fiktif di LandingPage, lalu mengalihkan registrasi & login menggunakan Supabase Auth.

- **Daftar Akun**:
  ```typescript
  const { data, error } = await supabase.auth.signUp({ email, password });
  ```
  *Efek Trigger DB*: Pendaftaran otomatis memicu trigger `handle_new_user()` di Supabase PostgreSQL untuk membuat baris profile dan wallet baru (saldo $0.00).

- **Masuk Akun (Login)**:
  ```typescript
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  ```

- **Alur State Global (App.tsx)**:
  ```typescript
  // Mengambil session aktif Supabase
  const session = supabase.auth.getSession();
  // State balance & user profile diambil langsung dari table `profiles` dan `wallets` real-time
  ```

---

### 3. API Key Management (ApiKeysTab.tsx)

Menghilangkan mock generation kunci acak di frontend, dan memanggil REST API FastAPI secara aman menggunakan JWT Token milik pengguna yang sedang aktif.

- **Generate API Key baru**:
  ```typescript
  // POST /dashboard/api-keys
  const response = await fetch(`${API_BASE_URL}/dashboard/api-keys`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: keyName })
  });
  const data = await response.json(); // Mengembalikan ApiKeyCreateResponse dengan raw_key utuh
  ```

- **Mencabut API Key (Revoke)**:
  ```typescript
  // DELETE /dashboard/api-keys/{id}
  await fetch(`${API_BASE_URL}/dashboard/api-keys/${keyId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${session.access_token}`
    }
  });
  ```

- **Melihat Daftar Kunci**:
  ```typescript
  // GET /dashboard/api-keys
  const res = await supabase.table("api_keys").select("*").order("created_at", { ascending: false });
  ```

---

### 4. Billing & Top Up (BillingTab.tsx)

- **Mock Top Up**:
  Alihkan logic top-up fiktif dari frontend ke endpoint real FastAPI `/dashboard/topup`. Ini akan memvalidasi limit preset nominal USD simulasi ($0.60, $3.00, $6.00) dan mencatat transaksi secara aman di database menggunakan service role.
  ```typescript
  // POST /dashboard/topup
  const response = await fetch(`${API_BASE_URL}/dashboard/topup`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ amount: parseFloat(amount) })
  });
  ```

- **Riwayat Transaksi**:
  Diambil langsung secara real-time melalui polling atau database subscription dari tabel `topup_logs`.

---

### 5. API Playground Streaming (PlaygroundTab.tsx)

Mengintegrasikan text completion stream langsung ke **FastAPI Gateway Endpoint** `/v1/chat/completions` menggunakan salah satu API Key aktif milik user itu sendiri.

- **Alur Stream Real-Time (SSE)**:
  ```typescript
  const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userApiKey}` // Menggunakan Kunci API KedaiAI glm_
    },
    body: JSON.stringify({
      model: model, // openrouter/google/gemini-2.0-flash-lite-preview-02-05:free dll
      messages: [{ role: "user", content: promptText }],
      stream: true,
      temperature: temperature,
      max_tokens: maxTokens
    })
  });
  
  // Baca stream chunk standar SSE format (data: {...})
  ```
- **Post-Billing Otomatis**:
  Setelah stream terkirim 100%, backend FastAPI secara atomic memotong saldo wallet dan mencatat log penggunaan di database. Frontend tinggal me-refresh state saldo pengguna secara reactive.

---

### 6. Usage Logs & Analytics (UsageTab.tsx)

Mengambil data analytics token usage, latency, model, dan total biaya real-time dari tabel `usage_logs` milik user.
```typescript
const { data } = await supabase
  .from("usage_logs")
  .select("*")
  .order("created_at", { ascending: false });
```

---

## 📈 Timeline & Prioritas Integrasi (Timeline Hubung)

### Fase 1: Inisialisasi Klien & Env (1-2 Jam)
- [x] Instal dependency `@supabase/supabase-js` di frontend
- [x] Buat file config `.env` untuk memetakan `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL`
- [x] Buat inisialisasi singleton helper `supabase.ts` di folder `src/lib/`

### Fase 2: Auth & State Bridge (3-4 Jam)
- [x] Ganti formulir registrasi & login landing page dengan Supabase Auth
- [x] Ganti local storage sync state di `App.tsx` agar reactive dengan session Supabase Auth
- [x] Buat auto-refresh data wallet balance dari supabase real-time subscription di sidebar

### Fase 3: Dashboard Operations Integration (3-4 Jam)
- [x] Hubungkan modal generate key dan list key di `ApiKeysTab.tsx` ke endpoint backend
- [x] Ganti simulator top-up di `BillingTab.tsx` ke endpoint `/dashboard/topup` real
- [x] Alihkan rendering tabel `UsageTab.tsx` dan `DashboardTab.tsx` langsung membaca tabel `usage_logs` dari Supabase

### Fase 4: Playground SSE Streaming Real (3-4 Jam)
- [x] Ubah stream fetcher di `PlaygroundTab.tsx` mengarah ke `/v1/chat/completions`
- [x] Tambahkan setup dropdown pilihan model real termasuk model OpenRouter gratis yang baru kita seeded
- [x] Ambil API key aktif user sebagai token bearer autentikasi saat playground chat berjalan

---

## 📋 Checklist Validasi E2E Integrasi

```
[x] SignUp/SignIn user baru menggunakan email/password real di LandingPage
[x] Cek Supabase DB: profil & wallet (saldo $0.00) terbuat via trigger
[x] Lakukan top-up simulasi $3.00 via BillingTab -> saldo bertambah di dashboard
[x] Generate API Key baru -> salin key mentah "glm_prod_xxx" yang muncul sekali
[x] Buka tab Playground -> pilih model "openrouter/google/gemini-2.0-flash-lite-preview-02-05:free"
[x] Kirim prompt -> respons streaming kata-demi-kata (SSE) berhasil dimuat
[x] Cek Dashboard -> Saldo terpotong akurat & Usage logs mencatat latensi + biaya dalam Rupiah
```
