-- supabase/migrations/003_create_functions.sql

-- RPC Stored Function: deduct_balance_and_log
-- Atomic transaction to handle pricing, balance check, deduction, and insertion of logs.
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
  -- Lock wallet row to prevent race conditions & concurrent deductions
  SELECT balance INTO current_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Ensure balance is sufficient
  IF current_balance < p_cost_deducted THEN
    RETURN FALSE;
  END IF;

  -- Deduct balance & increment total_spent
  UPDATE public.wallets
  SET balance = balance - p_cost_deducted,
      total_spent = total_spent + p_cost_deducted
  WHERE user_id = p_user_id;

  -- Log the usage record
  INSERT INTO public.usage_logs (
    user_id, api_key_id, model_name, provider,
    prompt_tokens, completion_tokens, total_tokens,
    cost_usd, cost_deducted, request_id, latency_ms, status
  ) VALUES (
    p_user_id, p_api_key_id, p_model_name, p_provider,
    p_prompt_tokens, p_completion_tokens, (p_prompt_tokens + p_completion_tokens),
    p_cost_usd, p_cost_deducted, p_request_id, p_latency_ms, 'success'
  );

  -- Update API key last used time
  UPDATE public.api_keys
  SET last_used_at = NOW()
  WHERE id = p_api_key_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
