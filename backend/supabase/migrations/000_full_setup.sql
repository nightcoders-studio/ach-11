-- =============================================================================
-- KedaiAI Full Database Setup Script
-- Jalankan ini sekali di Supabase SQL Editor
-- Aman dijalankan berulang kali (IF NOT EXISTS + ON CONFLICT)
-- =============================================================================

-- ── 1. PROFILES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- ── 2. WALLETS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance       DECIMAL(15, 6) DEFAULT 0.312500 NOT NULL,
  currency      VARCHAR(3) DEFAULT 'USD' NOT NULL,
  total_spent   DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL,
  total_topup   DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallets' AND policyname='Users can view own wallet') THEN
    CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 3. API_KEYS (add missing columns) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          VARCHAR(100) NOT NULL DEFAULT 'Default Key',
  key_hash      VARCHAR(64) NOT NULL UNIQUE,
  key_prefix    VARCHAR(12) NOT NULL,
  status        VARCHAR(20) DEFAULT 'active' NOT NULL,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  revoked_at    TIMESTAMPTZ,
  CONSTRAINT valid_status CHECK (status IN ('active', 'revoked'))
);

-- Add missing columns if table already existed without them
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT 'Default Key';
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_hash VARCHAR(64);
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(12);
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys(status);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='Users can view own api_keys') THEN
    CREATE POLICY "Users can view own api_keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='Users can insert own api_keys') THEN
    CREATE POLICY "Users can insert own api_keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='Users can update own api_keys') THEN
    CREATE POLICY "Users can update own api_keys" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. USAGE_LOGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_logs (
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

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON public.usage_logs(model_name);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='usage_logs' AND policyname='Users can view own usage_logs') THEN
    CREATE POLICY "Users can view own usage_logs" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 5. TOPUP_LOGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.topup_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  amount          DECIMAL(15, 6) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'USD',
  method          VARCHAR(50) DEFAULT 'SIMULATION',
  reference_id    VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'completed',
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.topup_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='topup_logs' AND policyname='Users can view own topup_logs') THEN
    CREATE POLICY "Users can view own topup_logs" ON public.topup_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 6. MODEL_PRICING ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.model_pricing (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id            VARCHAR(150) NOT NULL UNIQUE,
  display_name        VARCHAR(150) NOT NULL,
  provider            VARCHAR(50) NOT NULL,
  input_price_per_1k  DECIMAL(10, 8) NOT NULL DEFAULT 0,
  output_price_per_1k DECIMAL(10, 8) NOT NULL DEFAULT 0,
  markup_rate         DECIMAL(5, 4) DEFAULT 1.20,
  is_active           BOOLEAN DEFAULT TRUE,
  context_window      INTEGER,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. TRIGGERS ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.312500)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 8. STORED FUNCTION: deduct_balance_and_log ─────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_balance_and_log(
  p_user_id         UUID,
  p_api_key_id      UUID,
  p_model_name      TEXT,
  p_provider        TEXT,
  p_prompt_tokens   INTEGER,
  p_completion_tokens INTEGER,
  p_cost_usd        DECIMAL,
  p_cost_deducted   DECIMAL,
  p_request_id      TEXT,
  p_latency_ms      INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  SELECT balance INTO current_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE NOWAIT;

  IF current_balance < p_cost_deducted THEN
    RETURN FALSE;
  END IF;

  UPDATE public.wallets
  SET balance     = balance - p_cost_deducted,
      total_spent = total_spent + p_cost_deducted,
      updated_at  = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO public.usage_logs (
    user_id, api_key_id, model_name, provider,
    prompt_tokens, completion_tokens, total_tokens,
    cost_usd, cost_deducted, request_id, latency_ms, status
  ) VALUES (
    p_user_id, p_api_key_id, p_model_name, p_provider,
    p_prompt_tokens, p_completion_tokens, p_prompt_tokens + p_completion_tokens,
    p_cost_usd, p_cost_deducted, p_request_id, p_latency_ms, 'success'
  );

  UPDATE public.api_keys
  SET last_used_at = NOW()
  WHERE id = p_api_key_id;

  RETURN TRUE;
EXCEPTION
  WHEN lock_not_available THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 9. SEED MODEL PRICING ──────────────────────────────────────────────────
INSERT INTO public.model_pricing (model_id, display_name, provider, input_price_per_1k, output_price_per_1k, context_window) VALUES
  ('gemini/gemini-1.5-flash', 'Gemini 1.5 Flash', 'google', 0.000075, 0.000300, 1000000),
  ('gemini/gemini-1.5-pro', 'Gemini 1.5 Pro', 'google', 0.003500, 0.010500, 2000000),
  ('openai/gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 0.000500, 0.001500, 16385),
  ('openai/gpt-4o-mini', 'GPT-4o Mini', 'openai', 0.000150, 0.000600, 128000),
  ('anthropic/claude-3-haiku', 'Claude 3 Haiku', 'anthropic', 0.000250, 0.001250, 200000),
  ('openrouter/google/gemini-2.0-flash-lite-preview-02-05:free', 'Gemini 2.0 Flash Lite Preview (Free)', 'openrouter', 0.000000, 0.000000, 1048576),
  ('openrouter/poolside/laguna-m.1:free', 'Poolside Laguna M.1 (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/google/gemma-4-26b-a4b-it:free', 'Google Gemma 4 26B (Free)', 'openrouter', 0.000000, 0.000000, 8192),
  ('openrouter/google/gemma-4-31b-it:free', 'Google Gemma 4 31B (Free)', 'openrouter', 0.000000, 0.000000, 8192),
  ('openrouter/nvidia/nemotron-3-super-120b-a12b:free', 'NVIDIA Nemotron 3 Super 120B (Free)', 'openrouter', 0.000000, 0.000000, 4096),
  ('openrouter/liquid/lfm-2.5-1.2b-thinking:free', 'Liquid LFM 2.5 Thinking (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/liquid/lfm-2.5-1.2b-instruct:free', 'Liquid LFM 2.5 Instruct (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/nvidia/nemotron-3-nano-30b-a3b:free', 'NVIDIA Nemotron 3 Nano 30B (Free)', 'openrouter', 0.000000, 0.000000, 4096),
  ('openrouter/nvidia/nemotron-nano-12b-v2-vl:free', 'NVIDIA Nemotron Nano 12B v2 (Free)', 'openrouter', 0.000000, 0.000000, 4096),
  ('openrouter/qwen/qwen3-next-80b-a3b-instruct:free', 'Qwen 3 Next 80B (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/nvidia/nemotron-nano-9b-v2:free', 'NVIDIA Nemotron Nano 9B v2 (Free)', 'openrouter', 0.000000, 0.000000, 4096),
  ('openrouter/openai/gpt-oss-120b:free', 'OpenAI GPT OSS 120B (Free)', 'openrouter', 0.000000, 0.000000, 8192),
  ('openrouter/openai/gpt-oss-20b:free', 'OpenAI GPT OSS 20B (Free)', 'openrouter', 0.000000, 0.000000, 8192),
  ('openrouter/z-ai/glm-4.5-air:free', 'Z-AI GLM 4.5 Air (Free)', 'openrouter', 0.000000, 0.000000, 16384),
  ('openrouter/qwen/qwen3-coder:free', 'Qwen 3 Coder (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition:free', 'Dolphin Mistral 24B (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/meta-llama/llama-3.3-70b-instruct:free', 'Meta Llama 3.3 70B (Free)', 'openrouter', 0.000000, 0.000000, 131072),
  ('openrouter/meta-llama/llama-3.2-3b-instruct:free', 'Meta Llama 3.2 3B (Free)', 'openrouter', 0.000000, 0.000000, 131072),
  ('openrouter/nousresearch/hermes-3-llama-3.1-405b:free', 'Hermes 3 Llama 3.1 405B (Free)', 'openrouter', 0.000000, 0.000000, 131072)
ON CONFLICT (model_id) DO UPDATE SET
  display_name        = EXCLUDED.display_name,
  provider            = EXCLUDED.provider,
  input_price_per_1k  = EXCLUDED.input_price_per_1k,
  output_price_per_1k = EXCLUDED.output_price_per_1k,
  context_window      = EXCLUDED.context_window,
  is_active           = TRUE;

-- ── 10. WALLET UNTUK USER YANG SUDAH TERDAFTAR (Backfill) ─────────────────
INSERT INTO public.wallets (user_id, balance)
SELECT id, 6.250000
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
  balance = GREATEST(public.wallets.balance, 6.250000);

-- ── DONE ───────────────────────────────────────────────────────────────────
SELECT 'KedaiAI Database Setup Complete!' AS status;
