"""
Run pricing update directly via Supabase Python client
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()
from app.database import supabase

print("Updating model pricing...")

# Update LM Studio model - harga lebih tinggi agar terlihat di saldo
res1 = supabase.table("model_pricing").update({
    "input_price_per_1k":  0.030000,
    "output_price_per_1k": 0.060000,
    "markup_rate": 1.20
}).eq("model_id", "lmstudio/liquid/lfm2.5-1.2b").execute()
print(f"LM Studio: {len(res1.data)} rows updated")

# Update semua model openrouter
all_models = supabase.table("model_pricing").select("model_id").eq("provider", "openrouter").execute()
print(f"OpenRouter models found: {len(all_models.data)}")
for m in all_models.data:
    res = supabase.table("model_pricing").update({
        "input_price_per_1k":  0.001000,
        "output_price_per_1k": 0.002000,
        "markup_rate": 1.20
    }).eq("model_id", m["model_id"]).execute()

print("Done! Verifying...")
verify = supabase.table("model_pricing").select("model_id, input_price_per_1k, output_price_per_1k").order("provider").execute()
for m in verify.data:
    print(f"  {m['model_id'][:40]:<40} in={m['input_price_per_1k']} out={m['output_price_per_1k']}")
