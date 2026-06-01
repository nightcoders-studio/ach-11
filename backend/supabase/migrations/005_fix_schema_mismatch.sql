-- =============================================================================
-- KedaiAI Schema Fix & Postgrest Sync Script
-- Jalankan ini di Supabase Dashboard > SQL Editor untuk memperbaiki kolom yang hilang.
-- =============================================================================

-- 1. Patch Wallets Table (Tambahkan kolom-kolom yang terlewat)
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD' NOT NULL;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS total_topup DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL;

-- 2. Drop dan Re-create Usage Logs Table (Untuk sinkronisasi kolom versi terbaru)
DROP TABLE IF EXISTS public.usage_logs CASCADE;

CREATE TABLE public.usage_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id        UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  model_name        VARCHAR(100) NOT NULL,
  provider          VARCHAR(50) NOT NULL,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL DEFAULT 0,
  cost_usd          DECIMAL(15, 8) NOT NULL DEFAULT 0,
  cost_deducted     DECIMAL(15, 6) NOT NULL DEFAULT 0,
  currency          VARCHAR(3) DEFAULT 'USD',
  request_id        VARCHAR(100),
  latency_ms        INTEGER,
  status            VARCHAR(20) DEFAULT 'success',
  error_message     TEXT,
  ip_address        INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexing untuk query cepat
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON public.usage_logs(model_name);

-- Aktifkan RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Buat policy SELECT
CREATE POLICY "Users can view own usage_logs"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Re-create Stored Function (Agar sinkron dengan tipe kolom baru)
CREATE OR REPLACE FUNCTION public.deduct_balance_and_log(
  p_user_id       UUID,
  p_api_key_id    UUID,
  p_model_name    TEXT,
  p_provider      TEXT,
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER,
  p_cost_usd      DECIMAL,
  p_cost_deducted DECIMAL,
  p_request_id    TEXT,
  p_latency_ms    INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  -- Lock wallet row
  SELECT balance INTO current_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Cek kecukupan saldo
  IF current_balance < p_cost_deducted THEN
    RETURN FALSE;
  END IF;

  -- Potong saldo & tambah total_spent
  UPDATE public.wallets
  SET balance = balance - p_cost_deducted,
      total_spent = total_spent + p_cost_deducted
  WHERE user_id = p_user_id;

  -- Catat ke log usage
  INSERT INTO public.usage_logs (
    user_id, api_key_id, model_name, provider,
    prompt_tokens, completion_tokens, total_tokens,
    cost_usd, cost_deducted, request_id, latency_ms, status
  ) VALUES (
    p_user_id, p_api_key_id, p_model_name, p_provider,
    p_prompt_tokens, p_completion_tokens, (p_prompt_tokens + p_completion_tokens),
    p_cost_usd, p_cost_deducted, p_request_id, p_latency_ms, 'success'
  );

  -- Update API key last_used_at
  UPDATE public.api_keys
  SET last_used_at = NOW()
  WHERE id = p_api_key_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reload Postgrest schema cache secara paksa
NOTIFY pgrst, 'reload schema';

SELECT 'KedaiAI Schema fixed and Postgrest reloaded successfully!' AS status;
