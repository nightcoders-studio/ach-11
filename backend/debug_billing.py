"""
Debug v6: Isolasi masalah balance tidak berubah meski total_spent berubah
"""
import sys, os, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from app.database import supabase

USER_ID = "b1239722-e28d-4099-a5c3-c3d7d5048f33"

print("[1] Baca wallet lengkap...")
w = supabase.table("wallets").select("*").eq("user_id", USER_ID).execute()
print(f"    Data: {w.data[0] if w.data else 'NOT FOUND'}")
balance_original = float(w.data[0]["balance"])

print("\n[2] Coba update HANYA total_spent (bukan balance)...")
new_ts = float(w.data[0].get("total_spent", 0)) + 0.001
upd_ts = supabase.table("wallets").update({"total_spent": new_ts}).eq("user_id", USER_ID).execute()
print(f"    total_spent update response: {upd_ts.data}")

print("\n[3] Coba update HANYA balance...")
new_bal = balance_original - 0.5
upd_bal = supabase.table("wallets").update({"balance": new_bal}).eq("user_id", USER_ID).execute()
print(f"    balance update response: balance={upd_bal.data[0]['balance'] if upd_bal.data else 'empty'}")

# Immediately re-read
w2 = supabase.table("wallets").select("balance, total_spent").eq("user_id", USER_ID).execute()
print(f"    Re-read immediately: balance=${w2.data[0]['balance']}, total_spent=${w2.data[0].get('total_spent', 'N/A')}")

# Wait 1 second and re-read
import time
time.sleep(1)
w3 = supabase.table("wallets").select("balance, total_spent").eq("user_id", USER_ID).execute()
print(f"    Re-read after 1s:    balance=${w3.data[0]['balance']}, total_spent=${w3.data[0].get('total_spent', 'N/A')}")

print("\n[4] Cek apakah ada row dengan balance lama yang override...")
# Mungkin ada 2 row wallet untuk user ini?
all_rows = supabase.table("wallets").select("*").eq("user_id", USER_ID).execute()
print(f"    Total rows untuk user ini: {len(all_rows.data)}")
for row in all_rows.data:
    print(f"    {row}")

print("\n[5] Coba update dengan filter tambahan (id)...")
if w.data and "id" in w.data[0]:
    wallet_id = w.data[0]["id"]
    print(f"    Wallet ID: {wallet_id}")
    upd2 = supabase.table("wallets").update({"balance": new_bal}).eq("id", wallet_id).execute()
    print(f"    Update by id: {upd2.data}")
else:
    print("    Wallet tidak punya kolom 'id' -- hanya user_id sebagai PK")
    # Try tanpa id filter -- just user_id (already done above)
    print("    Mungkin wallets table primary key adalah user_id saja?")

# Restore
supabase.table("wallets").update({"balance": balance_original}).eq("user_id", USER_ID).execute()
print(f"\n[6] Balance dikembalikan ke ${balance_original}")

print("\n[7] Test RPC dengan cost besar ($5) agar terlihat jelas...")
try:
    rpc_res = supabase.rpc("deduct_balance_and_log", {
        "p_user_id": USER_ID,
        "p_api_key_id": "cd316112-4b7e-4cd3-90e4-cd507e4cabae",  # key 'testing'
        "p_model_name": "debug-v6",
        "p_provider": "debug",
        "p_prompt_tokens": 1000,
        "p_completion_tokens": 1000,
        "p_cost_usd": 5.0,
        "p_cost_deducted": 5.0,
        "p_request_id": f"debug_{uuid.uuid4().hex[:6]}",
        "p_latency_ms": 100
    }).execute()
    print(f"    RPC result: {rpc_res.data}")
except Exception as e:
    print(f"    RPC error: {e}")

w_after = supabase.table("wallets").select("balance, total_spent").eq("user_id", USER_ID).execute()
print(f"    Balance after RPC: ${w_after.data[0]['balance']}, total_spent: ${w_after.data[0].get('total_spent', 'N/A')}")

# Restore
supabase.table("wallets").update({"balance": balance_original}).eq("user_id", USER_ID).execute()
print(f"    Dikembalikan ke ${balance_original}")
