-- supabase/migrations/001_create_tables.sql

-- profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance       DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL,
  currency      VARCHAR(3) DEFAULT 'USD' NOT NULL,
  total_spent   DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL,
  total_topup   DECIMAL(15, 6) DEFAULT 0.000000 NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);


-- api_keys Table
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

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys(status);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api_keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);


-- usage_logs Table
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id        UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  model_name        VARCHAR(100) NOT NULL,
  provider          VARCHAR(50) NOT NULL,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL DEFAULT 0,
  cost_usd          DECIMAL(15, 8) NOT NULL,
  cost_deducted     DECIMAL(15, 6) NOT NULL,
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

CREATE POLICY "Users can view own usage_logs"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);


-- topup_logs Table
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

CREATE POLICY "Users can view own topup_logs"
  ON public.topup_logs FOR SELECT
  USING (auth.uid() = user_id);


-- model_pricing Table
CREATE TABLE IF NOT EXISTS public.model_pricing (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id            VARCHAR(100) NOT NULL UNIQUE,
  display_name        VARCHAR(100) NOT NULL,
  provider            VARCHAR(50) NOT NULL,
  input_price_per_1k  DECIMAL(10, 8) NOT NULL,
  output_price_per_1k DECIMAL(10, 8) NOT NULL,
  markup_rate         DECIMAL(5, 4) DEFAULT 1.20,
  is_active           BOOLEAN DEFAULT TRUE,
  context_window      INTEGER,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
