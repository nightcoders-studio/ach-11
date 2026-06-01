-- supabase/migrations/004_enable_realtime.sql
-- Enable Supabase Realtime for GateLLM tables

-- Create publication if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Silently ignore if we don't have permission to create publication
END $$;

-- Enable replica identity full for tables to get old/new values in updates
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER TABLE public.usage_logs REPLICA IDENTITY FULL;
ALTER TABLE public.topup_logs REPLICA IDENTITY FULL;

-- Add tables to the publication
-- We use safe blocks to avoid errors if they are already added
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.topup_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
