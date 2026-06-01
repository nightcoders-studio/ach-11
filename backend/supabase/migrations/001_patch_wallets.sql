-- KedaiAI: Patch wallets table — tambahkan kolom yang masih kurang
-- Jalankan di Supabase SQL Editor

ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD' NOT NULL;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS total_topup DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL;

-- Verifikasi
SELECT user_id, balance, currency, total_spent, total_topup FROM public.wallets;
