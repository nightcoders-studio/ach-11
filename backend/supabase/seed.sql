-- supabase/seed.sql

INSERT INTO public.model_pricing (model_id, display_name, provider, input_price_per_1k, output_price_per_1k, context_window) VALUES
  ('gemini/gemini-1.5-flash', 'Gemini 1.5 Flash', 'google', 0.000075, 0.000300, 1000000),
  ('gemini/gemini-1.5-pro', 'Gemini 1.5 Pro', 'google', 0.003500, 0.010500, 2000000),
  ('openai/gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 0.000500, 0.001500, 16385),
  ('openai/gpt-4o-mini', 'GPT-4o Mini', 'openai', 0.000150, 0.000600, 128000),
  ('anthropic/claude-3-haiku', 'Claude 3 Haiku', 'anthropic', 0.000250, 0.001250, 200000),
  ('openrouter/google/gemini-2.0-flash-lite-preview-02-05:free', 'Gemini 2.0 Flash Lite Preview (Free)', 'openrouter', 0.000000, 0.000000, 1048576),
  ('openrouter/poolside/laguna-m.1:free', 'Poolside Laguna M.1 (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/google/gemma-4-26b-a4b-it:free', 'Google Gemma 4 26B A4B IT (Free)', 'openrouter', 0.000000, 0.000000, 8192),
  ('openrouter/google/gemma-4-31b-it:free', 'Google Gemma 4 31B IT (Free)', 'openrouter', 0.000000, 0.000000, 8192),
  ('openrouter/nvidia/nemotron-3-super-120b-a12b:free', 'NVIDIA Nemotron 3 Super 120B A12B (Free)', 'openrouter', 0.000000, 0.000000, 4096),
  ('openrouter/liquid/lfm-2.5-1.2b-thinking:free', 'Liquid LFM 2.5 1.2B Thinking (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/liquid/lfm-2.5-1.2b-instruct:free', 'Liquid LFM 2.5 1.2B Instruct (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/nvidia/nemotron-3-nano-30b-a3b:free', 'NVIDIA Nemotron 3 Nano 30B A3B (Free)', 'openrouter', 0.000000, 0.000000, 4096),
  ('openrouter/nvidia/nemotron-nano-12b-v2-vl:free', 'NVIDIA Nemotron Nano 12B v2 VL (Free)', 'openrouter', 0.000000, 0.000000, 4096),
  ('openrouter/qwen/qwen3-next-80b-a3b-instruct:free', 'Qwen 3 Next 80B A3B Instruct (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/nvidia/nemotron-nano-9b-v2:free', 'NVIDIA Nemotron Nano 9B v2 (Free)', 'openrouter', 0.000000, 0.000000, 4096),
  ('openrouter/openai/gpt-oss-120b:free', 'OpenAI GPT OSS 120B (Free)', 'openrouter', 0.000000, 0.000000, 8192),
  ('openrouter/openai/gpt-oss-20b:free', 'OpenAI GPT OSS 20B (Free)', 'openrouter', 0.000000, 0.000000, 8192),
  ('openrouter/z-ai/glm-4.5-air:free', 'Z-AI GLM 4.5 Air (Free)', 'openrouter', 0.000000, 0.000000, 16384),
  ('openrouter/qwen/qwen3-coder:free', 'Qwen 3 Coder (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition:free', 'Dolphin Mistral 24B Venice Edition (Free)', 'openrouter', 0.000000, 0.000000, 32768),
  ('openrouter/meta-llama/llama-3.3-70b-instruct:free', 'Meta Llama 3.3 70B Instruct (Free)', 'openrouter', 0.000000, 0.000000, 131072),
  ('openrouter/meta-llama/llama-3.2-3b-instruct:free', 'Meta Llama 3.2 3B Instruct (Free)', 'openrouter', 0.000000, 0.000000, 131072),
  ('openrouter/nousresearch/hermes-3-llama-3.1-405b:free', 'Hermes 3 Llama 3.1 405B (Free)', 'openrouter', 0.000000, 0.000000, 131072)
ON CONFLICT (model_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider = EXCLUDED.provider,
  input_price_per_1k = EXCLUDED.input_price_per_1k,
  output_price_per_1k = EXCLUDED.output_price_per_1k,
  context_window = EXCLUDED.context_window;
