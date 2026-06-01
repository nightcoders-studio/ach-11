import { createClient } from "@supabase/supabase-js";

// Inisialisasi Supabase Client singleton untuk frontend React
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://aemabilsjwhhuerhywty.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlbWFiaWxzandoaHVlcmh5d3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODQ2NjksImV4cCI6MjA5NTg2MDY2OX0.gPnDbOCregf7HkfKbIzfhOiE2-QHRXkvvxM00mFScXI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
