# app/database.py
from supabase import create_client, Client
from app.config import settings

# Inisialisasi Supabase Client menggunakan service_role_key untuk backend operations (bypass RLS)
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

def get_supabase() -> Client:
    return supabase
