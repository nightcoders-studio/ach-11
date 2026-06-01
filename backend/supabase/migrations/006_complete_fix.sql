-- =============================================================================
-- GateLLM: COMPLETE DATABASE FIX SCRIPT
-- Jalankan ini di Supabase Dashboard > SQL Editor
-- Fixes: wallet UPDATE policy, usage_logs schema, RPC function, schema cache
-- =============================================================================

-- STEP 1: Fix wallets table - tambah kolom yang hilang
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD' NOT NULL;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS total_topup DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL;

-- STEP 2: Tambah UPDATE policy untuk wallets (service_role bypass RLS by default,
--         tapi SECURITY DEFINER function butuh policy yang benar)
DROP POLICY IF EXISTS "Service role can update wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- Allow service_role to update any wallet (for backend billing)
CREATE POLICY "Service role can update wallets"
  ON public.wallets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Also allow authenticated users to update own wallet (optional)
CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- STEP 3: Drop & recreate usage_logs dengan schema yang benar
DROP TABLE IF EXISTS public.usage_logs CASCADE;

CREATE TABLE public.usage_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id        UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  model_name        VARCHAR(100) NOT NULL,
  provider          VARCHAR(50) NOT NULL DEFAULT 'unknown',
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
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON public.usage_logs(model_name);

-- RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage_logs"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (for backend billing)
CREATE POLICY "Service role can insert usage_logs"
  ON public.usage_logs FOR INSERT
  WITH CHECK (true);

-- STEP 4: Drop & recreate topup_logs with proper policies
DROP POLICY IF EXISTS "Service role can insert topup_logs" ON public.topup_logs;
CREATE POLICY "Service role can insert topup_logs"
  ON public.topup_logs FOR INSERT
  WITH CHECK (true);

-- STEP 5: Create/replace RPC function deduct_balance_and_log
CREATE OR REPLACE FUNCTION public.deduct_balance_and_log(
  p_user_id           UUID,
  p_api_key_id        UUID,
  p_model_name        TEXT,
  p_provider          TEXT,
  p_prompt_tokens     INTEGER,
  p_completion_tokens INTEGER,
  p_cost_usd          DECIMAL,
  p_cost_deducted     DECIMAL,
  p_request_id        TEXT,
  p_latency_ms        INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  -- Lock wallet row for atomic update
  SELECT balance INTO current_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if balance is sufficient
  IF current_balance IS NULL THEN
    RETURN FALSE;
  END IF;

  IF current_balance < p_cost_deducted THEN
    RETURN FALSE;
  END IF;

  -- Deduct balance and increment total_spent
  UPDATE public.wallets
  SET
    balance     = balance - p_cost_deducted,
    total_spent = total_spent + p_cost_deducted,
    updated_at  = NOW()
  WHERE user_id = p_user_id;

  -- Log usage
  INSERT INTO public.usage_logs (
    user_id, api_key_id, model_name, provider,
    prompt_tokens, completion_tokens, total_tokens,
    cost_usd, cost_deducted, request_id, latency_ms, status
  ) VALUES (
    p_user_id, p_api_key_id, p_model_name, p_provider,
    p_prompt_tokens, p_completion_tokens,
    (p_prompt_tokens + p_completion_tokens),
    p_cost_usd, p_cost_deducted,
    p_request_id, p_latency_ms, 'success'
  );

  -- Update API key last_used_at
  UPDATE public.api_keys
  SET last_used_at = NOW()
  WHERE id = p_api_key_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Enable realtime for wallets (so frontend gets live updates)
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER TABLE public.usage_logs REPLICA IDENTITY FULL;

-- Tambahkan ke realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'usage_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_logs;
  END IF;
END$$;

-- STEP 7: Force reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- STEP 8: Verify
SELECT
  'wallets' AS table_name,
  COUNT(*) AS row_count,
  string_agg(column_name, ', ' ORDER BY ordinal_position) AS columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'wallets'
GROUP BY table_name

UNION ALL

SELECT
  'usage_logs',
  COUNT(*),
  string_agg(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'usage_logs'
GROUP BY table_name;

SELECT 'GateLLM DB Fix COMPLETE - Schema updated, RPC created, Realtime enabled!' AS status;
