-- =============================================================================
-- GateLLM: Update Model Pricing agar perubahan saldo terlihat
-- Jalankan di Supabase Dashboard > SQL Editor
-- =============================================================================

-- Update harga model LM Studio lokal agar lebih realistis (terlihat di saldo)
-- $0.03 input / $0.06 output per 1k tokens → ~Rp 480-960 per request 100 token
UPDATE public.model_pricing
SET
  input_price_per_1k  = 0.030000,  -- $0.03 per 1k tokens (naik dari $0.00015)
  output_price_per_1k = 0.060000,  -- $0.06 per 1k tokens (naik dari $0.0006)
  markup_rate         = 1.20
WHERE model_id = 'lmstudio/liquid/lfm2.5-1.2b';

-- Harga semua model OpenRouter "free" menjadi berbayar (saldo berkurang)
-- $0.001 per 1k tokens → ~Rp 16 per 1k token — terlihat di saldo
UPDATE public.model_pricing
SET
  input_price_per_1k  = 0.001000,  -- $0.001 per 1k tokens
  output_price_per_1k = 0.002000,  -- $0.002 per 1k tokens
  markup_rate         = 1.20
WHERE provider = 'openrouter';

-- Verifikasi
SELECT model_id, display_name, input_price_per_1k, output_price_per_1k, markup_rate
FROM public.model_pricing
ORDER BY provider, model_id;

SELECT 'Pricing updated!' AS status;
