"""
Debug v3: Check actual table schemas dan fix wallet update
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app.database import supabase

# Correct user_id
USER_ID = "b1239722-e28d-4099-a5c3-c3d7d5048f33"

print("[1] Cek schema usage_logs via information_schema...")
try:
    res = supabase.rpc("exec_sql", {"sql": "SELECT column_name FROM information_schema.columns WHERE table_name='usage_logs' ORDER BY ordinal_position"}).execute()
    print(f"    Kolom: {res.data}")
except Exception as e:
    print(f"    RPC exec_sql gagal: {e}")

# Try to insert a bare minimum record and see what succeeds
print("\n[2] Coba insert usage_log dengan field minimal...")
try:
    r = supabase.table("usage_logs").insert({
        "user_id": USER_ID,
        "model_name": "test-debug",
        "status": "success"
    }).execute()
    if r.data:
        print(f"    SUKSES! Kolom tersedia: {list(r.data[0].keys())}")
    else:
        print(f"    Kosong: {r}")
except Exception as e:
    print(f"    Error: {e}")

print("\n[3] Coba insert usage_log dengan banyak field...")
for fields in [
    {"user_id": USER_ID, "model_name": "t", "prompt_tokens": 1, "completion_tokens": 1, "status": "success"},
    {"user_id": USER_ID, "model_name": "t", "total_tokens": 2, "status": "success"},
    {"user_id": USER_ID, "model_name": "t", "cost": 0.001, "status": "success"},
    {"user_id": USER_ID, "model_name": "t", "cost_usd": 0.001, "status": "success"},
]:
    try:
        r = supabase.table("usage_logs").insert(fields).execute()
        print(f"    {list(fields.keys())} -> OK, kolom: {list(r.data[0].keys()) if r.data else 'empty'}")
        break
    except Exception as e:
        print(f"    {list(fields.keys())} -> FAIL: {str(e)[:80]}")

print("\n[4] Cek wallets table - why update doesn't work...")
# Read wallet
w = supabase.table("wallets").select("*").eq("user_id", USER_ID).execute()
print(f"    Wallet data: {w.data}")

# Try upsert instead of update
print("\n[5] Coba UPSERT wallet...")
if w.data:
    current_bal = float(w.data[0]["balance"])
    new_bal = current_bal - 0.001
    try:
        r = supabase.table("wallets").upsert({"user_id": USER_ID, "balance": new_bal}).execute()
        print(f"    Upsert result: {r.data}")
        # Verify
        w2 = supabase.table("wallets").select("balance").eq("user_id", USER_ID).execute()
        after = float(w2.data[0]["balance"]) if w2.data else -1
        print(f"    Balance after upsert: ${after:.6f} (expected ${new_bal:.6f})")
        if abs(after - new_bal) < 0.000001:
            print("    >> UPSERT BEKERJA!")
        else:
            print("    >> UPSERT juga tidak bekerja")
        # Restore
        supabase.table("wallets").upsert({"user_id": USER_ID, "balance": current_bal}).execute()
        print(f"    Balance dikembalikan ke ${current_bal:.6f}")
    except Exception as e:
        print(f"    Upsert error: {e}")

print("\n[6] Cek apakah ada RLS policies di wallets table...")
try:
    r = supabase.rpc("exec_sql", {"sql": "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename='wallets'"}).execute()
    print(f"    Policies: {r.data}")
except Exception as e:
    print(f"    Tidak bisa cek policies: {e}")

print("\n[7] Cek wallets pk column...")
if w.data:
    print(f"    Full wallet row: {w.data[0]}")
