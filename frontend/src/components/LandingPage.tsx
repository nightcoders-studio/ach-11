import React, { useState } from 'react';
import { 
  Terminal, 
  Zap, 
  Cpu, 
  Key, 
  Coins, 
  Activity, 
  Layers, 
  CheckCircle, 
  ArrowRight, 
  Sparkles,
  Search
} from "lucide-react";
import { UserSession } from '../types';
import { supabase } from '../lib/supabase';

interface LandingPageProps {
  onLogin: (session: UserSession) => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sliderTokens, setSliderTokens] = useState(5); // million tokens

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLoginMode) {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        
        if (data && data.user) {
          // Fetch wallet balance
          const walletRes = await supabase.table("wallets").select("balance, total_spent, total_topup").eq("user_id", data.user.id).single();
          const balance = walletRes.data ? parseFloat(walletRes.data.balance) * 16000 : 0; // standard multiplier/simulated IDR
          
          onLogin({
            name: data.user.email?.split("@")[0] || "Developer",
            email: data.user.email || "",
            balance: balance || 5000,
            totalSpent: walletRes.data ? parseFloat(walletRes.data.total_spent) * 16000 : 0,
            totalTokens: walletRes.data ? (parseFloat(walletRes.data.total_spent) * 0.08) : 0
          });
        }
      } else {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name || email.split("@")[0]
            }
          }
        });
        if (error) throw error;

        // Auto login after sign up & give mock balance bonus
        if (data && data.user) {
          onLogin({
            name: name || data.user.email?.split("@")[0] || "Developer",
            email: data.user.email || "",
            balance: 5000,
            totalSpent: 0,
            totalTokens: 0
          });
        }
      }
    } catch (err: any) {
      const isRateLimit = err.message && (err.message.toLowerCase().includes("rate limit") || err.message.toLowerCase().includes("exceeded"));
      if (isRateLimit) {
        setErrorMsg(
          "⚠️ Email rate limit exceeded! Supabase membatasi email tier gratis. Solusi instan: Masuk ke Supabase Dashboard -> Auth -> Providers -> Email -> Nonaktifkan 'Confirm email' (OFF) lalu klik Save. Setelah itu, Anda bisa Sign Up/Login secara instan tanpa perlu verifikasi email!"
        );
      } else {
        setErrorMsg(err.message || "Terjadi kesalahan sistem.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    handleAuth(e);
  };

  // Pricing calculation
  const calculateCost = (millions: number) => {
    const costPerMillion = 11200; // Rp 11.200 per million (average pricing model)
    const rawCost = millions * costPerMillion;
    return rawCost.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  };

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] font-sans min-h-screen flex flex-col antialiased">
      {/* Landing Top Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#c7c4d8]/30 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto w-full">
          {/* Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-[#3525cd]/10 flex items-center justify-center text-[#3525cd]">
              <Terminal className="w-5 h-5 font-bold" />
            </div>
            <span className="font-sans text-xl font-extrabold text-[#3525cd] tracking-tight flex items-center gap-1.5">
              Gate<span className="text-[#4f46e5]">LLM</span>
              <span className="text-[9px] bg-[#3525cd]/10 font-bold px-1.5 py-0.5 rounded text-[#3525cd] border border-[#3525cd]/20">SaaS Gateway</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 ml-8 mr-auto">
            <a
              href="#fitur"
              className="font-sans text-sm font-semibold text-[#464555] hover:text-[#3525cd] transition-colors"
            >
              Fitur
            </a>
            <a
              href="#simulator"
              className="font-sans text-sm font-semibold text-[#464555] hover:text-[#3525cd] transition-colors"
            >
              Simulator Harga
            </a>
            <a
              href="#cara-kerja"
              className="font-sans text-sm font-semibold text-[#464555] hover:text-[#3525cd] transition-colors"
            >
              Cara Kerja
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <a
              href="#daftar"
              className="font-sans text-sm font-semibold text-[#3525cd] border border-[#3525cd]/30 hover:bg-[#3525cd]/5 px-5 py-2 rounded-lg transition-colors"
            >
              Login
            </a>
            <a
              href="#daftar"
              className="font-sans text-sm font-semibold bg-[#3525cd] text-white hover:bg-[#3525cd]/90 px-5 py-2 rounded-lg transition-all shadow-sm active:scale-95 duration-150"
            >
              Signup
            </a>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-12 flex flex-col gap-24">
        
        {/* Hero Section */}
        <section className="relative pt-8 pb-12 overflow-hidden text-center flex flex-col items-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#4f46e5]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          {/* Top Pill Accent */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#dce9ff] rounded-full mb-8 border border-[#c7c4d8]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#3525cd]" />
            <span className="font-sans font-bold text-xs text-[#3525cd] uppercase tracking-wider">
              Gateway AI Khusus Developer Indonesia
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#0b1c30] max-w-4xl mx-auto mb-6 leading-tight select-none">
            Satu API Key untuk Akses <span className="text-[#4f46e5] bg-clip-text">Semua LLM Dunia</span>
          </h1>

          {/* Subheading */}
          <p className="font-sans text-base md:text-lg text-[#464555] max-w-2xl mx-auto mb-8 leading-relaxed font-semibold opacity-90">
            Hubungkan GPT-4o, Claude 3.5 Sonnet, dan Gemini 1.5 melalui satu API Gateway terintegrasi. 
            Bayar prabayar pakai Rupiah (QRIS, VA) tanpa kartu kredit. Sederhana, hemat biaya, dan ultra-cepat.
          </p>

          {/* Action Triggers */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full max-w-lg">
            <a
              href="#daftar"
              className="w-full sm:w-auto font-sans font-bold text-sm bg-[#3525cd] text-white px-8 py-3.5 rounded-lg hover:bg-[#3525cd]/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 duration-150"
            >
              Mulai Sekarang — Gratis Rp 5.000
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => onLogin({
                name: "Reviewer Penguji",
                email: "penguji@gmail.com",
                balance: 100000,
                totalSpent: 450000,
                totalTokens: 2.1
              })}
              className="w-full sm:w-auto font-sans font-bold text-sm bg-white border border-[#c7c4d8] text-[#0b1c30] px-8 py-3.5 rounded-lg hover:bg-[#eff4ff] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 duration-150"
            >
              <Cpu className="w-4 h-4 text-[#3525cd]" />
              Coba Playground Live
            </button>
          </div>
        </section>

        {/* Features Bento Grid Section */}
        <section className="py-8 border-t border-[#c7c4d8]/20" id="fitur">
          <div className="text-center mb-12">
            <span className="text-xs font-mono text-[#3525cd] uppercase tracking-widest block mb-2 font-bold">Teknologi API Edge</span>
            <h2 className="font-sans text-3xl font-extrabold text-[#0b1c30] mb-2 select-none">
              Kenapa Memilih GateLLM SaaS?
            </h2>
            <p className="font-sans text-sm text-[#464555] font-semibold opacity-90">
              Infrastruktur modern yang dibangun spesifik untuk kenyamanan developer lokal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-white border border-[#c7c4d8]/30 rounded-xl p-6 shadow-sm hover:shadow-md hover:ring-2 ring-[#4f46e5]/10 hover:scale-[1.01] transition-all duration-200 relative overflow-hidden group">
              <div className="w-12 h-12 bg-[#3525cd]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Key className="w-6 h-6 text-[#3525cd]" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#0b1c30] mb-2">Satu API Key</h3>
              <p className="font-sans text-sm text-[#464555] leading-relaxed">
                Tidak perlu login ke 3+ platform provider (OpenAI, Anthropic, Google). Cukup gunakan satu API key untuk memanggil semua model LLM populer.
              </p>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#3525cd]/5 rounded-full blur-2xl group-hover:bg-[#3525cd]/10 transition-colors pointer-events-none"></div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-[#c7c4d8]/30 rounded-xl p-6 shadow-sm hover:shadow-md hover:ring-2 ring-[#4f46e5]/10 hover:scale-[1.01] transition-all duration-200 relative overflow-hidden group">
              <div className="w-12 h-12 bg-[#3525cd]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Coins className="w-6 h-6 text-[#3525cd]" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#0b1c30] mb-2">Bayar Pakai Rupiah</h3>
              <p className="font-sans text-sm text-[#464555] leading-relaxed">
                Top up instan nominal Rupiah lewat QRIS (OVO, Gopay, Dana) atau Virtual Account. Tanpa minimum komitmen per bulan, tanpa credit card!
              </p>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#3525cd]/5 rounded-full blur-2xl group-hover:bg-[#3525cd]/10 transition-colors pointer-events-none"></div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-[#c7c4d8]/30 rounded-xl p-6 shadow-sm hover:shadow-md hover:ring-2 ring-[#4f46e5]/10 hover:scale-[1.01] transition-all duration-200 relative overflow-hidden group">
              <div className="w-12 h-12 bg-[#3525cd]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-[#3525cd]" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#0b1c30] mb-2">Latency Sempurna</h3>
              <p className="font-sans text-sm text-[#464555] leading-relaxed">
                Infrastruktur routing pintar GateLLM memilih regional endpoint terdekat untuk meminimalkan jeda respons streaming data aplikasi Anda.
              </p>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#3525cd]/5 rounded-full blur-2xl group-hover:bg-[#3525cd]/10 transition-colors pointer-events-none"></div>
            </div>

          </div>
        </section>

        {/* Interactive Simulator Section */}
        <section className="py-8 border-t border-[#c7c4d8]/20" id="simulator">
          <div className="text-center mb-12">
            <span className="text-xs font-mono text-[#3525cd] uppercase tracking-widest block mb-2 font-bold">Simulator Anggaran</span>
            <h2 className="font-sans text-3xl font-extrabold text-[#0b1c30] mb-2 select-none">
              Simulator Biaya Prabayar
            </h2>
            <p className="font-sans text-sm text-[#464555] font-semibold opacity-90">
              Bandingkan estimasi biaya berdasarkan volume token pengujian aplikasi Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-white border border-[#c7c4d8]/30 rounded-2xl p-6 sm:p-12 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3525cd]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div>
              <h3 className="text-xl font-bold text-[#0b1c30] mb-4">Estimasi Prabayar Tanpa Batas</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                Geser slider di bawah ini untuk melihat perkiraan biaya Rupiah yang dikonsumsi per juta token. GateLLM menyatukan billing ke Rupiah yang transparan tanpa biaya berlangganan tersembunyi.
              </p>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-mono text-[#0b1c30] mb-2">
                    <span className="font-semibold">Volume Token (Per Bulan)</span>
                    <span className="text-[#3525cd] font-bold">{sliderTokens} Juta Token</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={sliderTokens}
                    onChange={(e) => setSliderTokens(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3525cd]"
                  />
                  <div className="flex justify-between text-xs font-mono text-slate-400 mt-1">
                    <span>1 Juta</span>
                    <span>25 Juta</span>
                    <span>50 Juta</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#c7c4d8]/30 grid grid-cols-2 gap-4">
                  <div className="bg-[#f8f9ff] px-4 py-3 rounded-lg border border-[#c7c4d8]/30">
                    <span className="text-xs text-slate-500 block mb-1 font-semibold">Estimasi Total Biaya</span>
                    <span className="text-base sm:text-lg font-mono font-bold text-[#0b1c30]">{calculateCost(sliderTokens)}</span>
                  </div>
                  <div className="bg-[#f8f9ff] px-4 py-3 rounded-lg border border-[#c7c4d8]/30">
                    <span className="text-xs text-slate-500 block mb-1 font-semibold">Saldo Bonus Promo</span>
                    <span className="text-base sm:text-lg font-mono font-bold text-[#3525cd]">+ Bonus Rp 5K</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Comparison Card */}
            <div className="bg-[#f8f9ff] border border-[#c7c4d8]/30 rounded-xl p-6">
              <h3 className="text-sm font-bold text-[#0b1c30] mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#3525cd]" />
                Perbandingan Biaya Gateway (Per Juta Token)
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#3525cd]/5 border border-[#3525cd]/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3525cd]"></div>
                    <span className="text-xs font-bold text-[#3525cd]">GateLLM (Rata-rata)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-[#3525cd] font-bold">~ Rp 11.200</span>
                    <span className="text-[10px] text-slate-400 block font-medium">Kurs Tetap IDR</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#c7c4d8]/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <span className="text-xs text-slate-600 font-medium">OpenAI Direct USD</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-slate-700 font-bold">$0.85 USD</span>
                    <span className="text-[10px] text-slate-400 block">~ Rp 13.800 + Forex Fees</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#c7c4d8]/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <span className="text-xs text-slate-600 font-medium">Anthropic Direct USD</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-slate-700 font-bold">$1.00 USD</span>
                    <span className="text-[10px] text-slate-400 block">~ Rp 16.300 + Forex Fees</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed mt-4 font-medium">
                * Perhitungan di atas didasarkan pada proporsi input/output 3:1 dan kurs valas rata-rata berjalan per unit token.
              </p>
            </div>
          </div>
        </section>

        {/* Alur Kerja Section */}
        <section className="py-8 border-t border-[#c7c4d8]/20" id="cara-kerja">
          <div className="flex flex-col md:flex-row items-start gap-12">
            
            {/* Timeline info left header */}
            <div className="md:w-1/3 md:sticky md:top-24 flex flex-col gap-4">
              <h2 className="font-sans text-3xl font-extrabold text-[#0b1c30] leading-tight select-none">
                Workflow Cepat & Developer-Friendly
              </h2>
              <p className="font-sans text-sm text-[#464555] leading-relaxed font-semibold opacity-90">
                Eksekusi integrasi model AI dalam hitungan menit saja.
              </p>
              <a
                href="#daftar"
                className="font-sans font-bold text-xs bg-[#3525cd] text-white hover:bg-[#3525cd]/95 px-6 py-3 rounded-lg transition-colors w-fit shadow-md flex items-center gap-2 cursor-pointer active:scale-95 duration-100"
              >
                Mulai Sekarang
                <Zap className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Timeline steps right */}
            <div className="md:w-2/3 flex flex-col gap-6 w-full relative pl-2">
              <div className="absolute left-[33px] top-6 bottom-6 w-[2px] bg-[#c7c4d8]/30 hidden sm:block"></div>
              
              {/* Step 1 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-[#eff4ff] text-[#3525cd] flex items-center justify-center shrink-0 z-10 shadow-sm font-sans font-bold">
                  1
                </div>
                <div className="bg-white border border-[#c7c4d8]/30 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#0b1c30] mb-1 flex items-center gap-2 selection:bg-[#fff0]">
                    <Search className="w-4 h-4 text-slate-500" /> Explore Models
                  </h4>
                  <p className="font-sans text-xs text-slate-600 leading-relaxed">
                    Pilih model terbaik (GPT-4o, Claude, Gemini) untuk speed, kualitas, atau efisiensi biaya.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-[#eff4ff] text-[#3525cd] flex items-center justify-center shrink-0 z-10 shadow-sm font-sans font-bold">
                  2
                </div>
                <div className="bg-white border border-[#c7c4d8]/30 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#0b1c30] mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-500" /> Transparent Pricing
                  </h4>
                  <p className="font-sans text-xs text-slate-600 leading-relaxed">
                    Pantau estimasi biaya token langsung dalam mata uang Rupiah secara transparan.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-[#3525cd] text-white border-2 border-[#eff4ff] flex items-center justify-center shrink-0 z-10 shadow-md font-sans font-bold">
                  3
                </div>
                <div className="bg-[#4f46e5]/5 border border-[#3525cd]/20 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#3525cd] mb-1 flex items-center gap-2">
                    <Coins className="w-4 h-4" /> Instant Top Up
                  </h4>
                  <p className="font-sans text-xs text-slate-600 leading-relaxed mb-4">
                    Isi saldo prabayar mulai Rp 10.000 dengan mudah lewat QRIS (Gopay, OVO, Dana, LinkAja).
                  </p>
                  <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center border border-[#c7c4d8]/30 shadow-inner group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[#464555]/50 text-4xl">qr_code</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-[#eff4ff] text-[#3525cd] flex items-center justify-center shrink-0 z-10 shadow-sm font-sans font-bold">
                  4
                </div>
                <div className="bg-white border border-[#c7c4d8]/30 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#0b1c30] mb-1 flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-500" /> One API Key
                  </h4>
                  <p className="font-sans text-xs text-slate-600 leading-relaxed">
                    Hanya butuh satu key autentikasi tunggal untuk memanggil puluhan model AI global.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-[#eff4ff] text-[#3525cd] flex items-center justify-center shrink-0 z-10 shadow-sm font-sans font-bold">
                  5
                </div>
                <div className="bg-white border border-[#c7c4d8]/30 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#0b1c30] mb-1 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-500" /> Ship Faster
                  </h4>
                  <p className="font-sans text-xs text-slate-600 leading-relaxed">
                    Integrasi cepat dalam hitungan baris kode berkat endpoint API yang kompatibel.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Register Form Panel */}
        <section className="py-12 max-w-lg mx-auto w-full" id="daftar">
          <div className="bg-white border border-[#3525cd]/20 p-8 rounded-2xl relative shadow-md">
            <div className="text-center mb-6">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#3525cd] px-2.5 py-1 rounded bg-[#3525cd]/5 border border-[#3525cd]/20 inline-block mb-3 font-bold">
                Instant developer invitation
              </span>
              <h3 className="text-2xl font-bold text-[#0b1c30]">{isLoginMode ? "Masuk ke GateLLM" : "Daftar Akun GateLLM"}</h3>
              <p className="text-slate-500 text-xs mt-2 font-medium">
                {isLoginMode ? "Gunakan email dan password Anda untuk masuk." : "Dapatkan akses langsung dan saldo uji coba gratis senilai Rp 5.000"}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 bg-red-100 border border-red-200 text-red-700 text-xs rounded-lg font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {!isLoginMode && (
                <div>
                  <label className="text-xs font-semibold text-[#0b1c30] block mb-1.5">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Andi Wijaya"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#f8f9ff] border border-[#c7c4d8]/50 rounded-lg text-[#0b1c30] focus:outline-none focus:border-[#3525cd]/60 placeholder-slate-400 font-sans transition"
                    id="input-name"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#0b1c30] block mb-1.5">Alamat Email Kerja</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="andi@perusahaan.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#f8f9ff] border border-[#c7c4d8]/50 rounded-lg text-[#0b1c30] focus:outline-none focus:border-[#3525cd]/60 placeholder-slate-400 font-sans transition"
                  id="input-email"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0b1c30] block mb-1.5">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#f8f9ff] border border-[#c7c4d8]/50 rounded-lg text-[#0b1c30] focus:outline-none focus:border-[#3525cd]/60 placeholder-slate-400 font-sans transition"
                  id="input-password"
                />
              </div>

              <div className="flex items-start gap-2.5 text-[11px] text-slate-500 leading-normal mt-2">
                <CheckCircle className="w-4 h-4 text-[#3525cd] shrink-0 mt-0.5" />
                <span>Dengan melanjutkan, Anda menyetujui Ketentuan Penggunaan dan Kebijakan Privasi Developer kami.</span>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 bg-[#3525cd] hover:bg-[#3525cd]/90 text-white font-bold text-sm rounded-lg transition-all shadow-sm active:scale-95 duration-100 flex items-center justify-center gap-2 disabled:opacity-50"
                id="btn-submit-register"
              >
                {loading ? "Memproses..." : isLoginMode ? "Masuk ke Akun" : "Buat Akun Sekarang (Free Bonus Rp 5K)"}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="text-xs text-[#3525cd] font-semibold hover:underline"
                >
                  {isLoginMode ? "Belum punya akun? Daftar sekarang" : "Sudah punya akun? Masuk di sini"}
                </button>
              </div>
            </form>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#c7c4d8]/30 w-full mt-auto py-8">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-4 max-w-7xl mx-auto gap-6">
          <div className="flex items-center gap-2">
            <span className="font-sans font-extrabold text-[#3525cd] tracking-tight">GateLLM</span>
            <span className="font-sans text-xs text-[#464555] font-semibold ml-4">
              © 2026-2027 GateLLM Indonesia Inc. Hak Cipta Dilindungi. Built for Indonesian Developers.
            </span>
          </div>

          <div className="flex flex-wrap gap-4 font-sans text-xs font-semibold">
            <a className="text-[#464555] hover:text-[#3525cd] transition-colors" href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <a className="text-[#464555] hover:text-[#3525cd] transition-colors" href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <a className="text-[#464555] hover:text-[#3525cd] transition-colors" href="#" onClick={(e) => e.preventDefault()}>API Status</a>
            <a className="text-[#464555] hover:text-[#3525cd] transition-colors" href="#" onClick={(e) => e.preventDefault()}>Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
