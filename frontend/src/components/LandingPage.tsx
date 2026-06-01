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
          const walletRes = await supabase.from("wallets").select("balance").eq("user_id", data.user.id).single();
          const balance = walletRes.data ? parseFloat(walletRes.data.balance) * 16000 : 0; // standard multiplier/simulated IDR
          
          onLogin({
            name: data.user.email?.split("@")[0] || "Developer",
            email: data.user.email || "",
            balance: balance || 5000,
            totalSpent: 0,
            totalTokens: 0
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
    <div className="bg-[#0b0f19] text-[#f1f5f9] font-sans min-h-screen flex flex-col antialiased">
      {/* Landing Top Navigation Bar */}
      <nav className="bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#1e293b]/50 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto w-full">
          {/* Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center text-[#06b6d4]">
              <Terminal className="w-5 h-5 font-bold" />
            </div>
            <span className="font-sans text-xl font-extrabold text-[#06b6d4] tracking-tight flex items-center gap-1.5">
              Kedai<span className="text-[#22d3ee]">AI</span>
              <span className="text-[9px] bg-[#06b6d4]/10 font-bold px-1.5 py-0.5 rounded text-[#06b6d4] border border-[#06b6d4]/20">SaaS Gateway</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 ml-8 mr-auto">
            <a
              href="#fitur"
              className="font-sans text-sm font-semibold text-[#94a3b8] hover:text-[#06b6d4] transition-colors"
            >
              Fitur
            </a>
            <a
              href="#simulator"
              className="font-sans text-sm font-semibold text-[#94a3b8] hover:text-[#06b6d4] transition-colors"
            >
              Simulator Harga
            </a>
            <a
              href="#cara-kerja"
              className="font-sans text-sm font-semibold text-[#94a3b8] hover:text-[#06b6d4] transition-colors"
            >
              Cara Kerja
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <a
              href="#daftar"
              className="font-sans text-sm font-semibold text-[#06b6d4] border border-[#06b6d4]/30 hover:bg-[#06b6d4]/5 px-5 py-2 rounded-lg transition-colors"
            >
              Login
            </a>
            <a
              href="#daftar"
              className="font-sans text-sm font-semibold bg-[#06b6d4] text-black hover:bg-[#06b6d4]/90 px-5 py-2 rounded-lg transition-all shadow-sm active:scale-95 duration-150"
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-[#06b6d4]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          {/* Top Pill Accent */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#06b6d4]/10 rounded-full mb-8 border border-[#06b6d4]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#06b6d4]" />
            <span className="font-sans font-bold text-xs text-[#06b6d4] uppercase tracking-wider">
              Gateway AI Khusus Developer Indonesia
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#f1f5f9] max-w-4xl mx-auto mb-6 leading-tight select-none">
            Satu API Key untuk Akses <span className="text-[#22d3ee] bg-clip-text">Semua LLM Dunia</span>
          </h1>

          {/* Subheading */}
          <p className="font-sans text-base md:text-lg text-[#94a3b8] max-w-2xl mx-auto mb-8 leading-relaxed font-semibold opacity-90">
            Hubungkan GPT-4o, Claude 3.5 Sonnet, dan Gemini 1.5 melalui satu API Gateway terintegrasi. 
            Bayar prabayar pakai Rupiah (QRIS, VA) tanpa kartu kredit. Sederhana, hemat biaya, dan ultra-cepat.
          </p>

          {/* Action Triggers */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full max-w-lg">
            <a
              href="#daftar"
              className="w-full sm:w-auto font-sans font-bold text-sm bg-[#06b6d4] text-black px-8 py-3.5 rounded-lg hover:bg-[#06b6d4]/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 duration-150"
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
              className="w-full sm:w-auto font-sans font-bold text-sm bg-[#0f172a]/60 border border-[#1e293b] text-[#f1f5f9] px-8 py-3.5 rounded-lg hover:bg-[#1e293b]/80 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 duration-150"
            >
              <Cpu className="w-4 h-4 text-[#06b6d4]" />
              Coba Playground Live
            </button>
          </div>
        </section>

        {/* Features Bento Grid Section */}
        <section className="py-8 border-t border-[#1e293b]/50" id="fitur">
          <div className="text-center mb-12">
            <span className="text-xs font-mono text-[#06b6d4] uppercase tracking-widest block mb-2 font-bold">Teknologi API Edge</span>
            <h2 className="font-sans text-3xl font-extrabold text-[#f1f5f9] mb-2 select-none">
              Kenapa Memilih KedaiAI SaaS?
            </h2>
            <p className="font-sans text-sm text-[#94a3b8] font-semibold opacity-90">
              Infrastruktur modern yang dibangun spesifik untuk kenyamanan developer lokal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-[#0f172a]/60 border border-[#1e293b]/50 rounded-xl p-6 shadow-sm hover:shadow-md hover:ring-2 ring-[#06b6d4]/10 hover:scale-[1.01] transition-all duration-200 relative overflow-hidden group">
              <div className="w-12 h-12 bg-[#06b6d4]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Key className="w-6 h-6 text-[#06b6d4]" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#f1f5f9] mb-2">Satu API Key</h3>
              <p className="font-sans text-sm text-[#94a3b8] leading-relaxed">
                Tidak perlu login ke 3+ platform provider (OpenAI, Anthropic, Google). Cukup gunakan satu API key untuk memanggil semua model LLM populer.
              </p>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#06b6d4]/5 rounded-full blur-2xl group-hover:bg-[#06b6d4]/10 transition-colors pointer-events-none"></div>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#0f172a]/60 border border-[#1e293b]/50 rounded-xl p-6 shadow-sm hover:shadow-md hover:ring-2 ring-[#06b6d4]/10 hover:scale-[1.01] transition-all duration-200 relative overflow-hidden group">
              <div className="w-12 h-12 bg-[#06b6d4]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Coins className="w-6 h-6 text-[#06b6d4]" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#f1f5f9] mb-2">Bayar Pakai Rupiah</h3>
              <p className="font-sans text-sm text-[#94a3b8] leading-relaxed">
                Top up instan nominal Rupiah lewat QRIS (OVO, Gopay, Dana) atau Virtual Account. Tanpa minimum komitmen per bulan, tanpa credit card!
              </p>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#06b6d4]/5 rounded-full blur-2xl group-hover:bg-[#06b6d4]/10 transition-colors pointer-events-none"></div>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#0f172a]/60 border border-[#1e293b]/50 rounded-xl p-6 shadow-sm hover:shadow-md hover:ring-2 ring-[#06b6d4]/10 hover:scale-[1.01] transition-all duration-200 relative overflow-hidden group">
              <div className="w-12 h-12 bg-[#06b6d4]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-[#06b6d4]" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#f1f5f9] mb-2">Latency Sempurna</h3>
              <p className="font-sans text-sm text-[#94a3b8] leading-relaxed">
                Infrastruktur routing pintar KedaiAI memilih regional endpoint terdekat untuk meminimalkan jeda respons streaming data aplikasi Anda.
              </p>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#06b6d4]/5 rounded-full blur-2xl group-hover:bg-[#06b6d4]/10 transition-colors pointer-events-none"></div>
            </div>

          </div>
        </section>

        {/* Interactive Simulator Section */}
        <section className="py-8 border-t border-[#1e293b]/50" id="simulator">
          <div className="text-center mb-12">
            <span className="text-xs font-mono text-[#06b6d4] uppercase tracking-widest block mb-2 font-bold">Simulator Anggaran</span>
            <h2 className="font-sans text-3xl font-extrabold text-[#f1f5f9] mb-2 select-none">
              Simulator Biaya Prabayar
            </h2>
            <p className="font-sans text-sm text-[#94a3b8] font-semibold opacity-90">
              Bandingkan estimasi biaya berdasarkan volume token pengujian aplikasi Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-[#0f172a]/60 border border-[#1e293b]/50 rounded-2xl p-6 sm:p-12 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#06b6d4]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div>
              <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">Estimasi Prabayar Tanpa Batas</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Geser slider di bawah ini untuk melihat perkiraan biaya Rupiah yang dikonsumsi per juta token. KedaiAI menyatukan billing ke Rupiah yang transparan tanpa biaya berlangganan tersembunyi.
              </p>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-mono text-[#f1f5f9] mb-2">
                    <span className="font-semibold">Volume Token (Per Bulan)</span>
                    <span className="text-[#06b6d4] font-bold">{sliderTokens} Juta Token</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={sliderTokens}
                    onChange={(e) => setSliderTokens(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#06b6d4]"
                  />
                  <div className="flex justify-between text-xs font-mono text-slate-400 mt-1">
                    <span>1 Juta</span>
                    <span>25 Juta</span>
                    <span>50 Juta</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1e293b]/50 grid grid-cols-2 gap-4">
                  <div className="bg-[#0f172a]/40 px-4 py-3 rounded-lg border border-[#1e293b]/50">
                    <span className="text-xs text-slate-500 block mb-1 font-semibold">Estimasi Total Biaya</span>
                    <span className="text-base sm:text-lg font-mono font-bold text-[#f1f5f9]">{calculateCost(sliderTokens)}</span>
                  </div>
                  <div className="bg-[#0f172a]/40 px-4 py-3 rounded-lg border border-[#1e293b]/50">
                    <span className="text-xs text-slate-500 block mb-1 font-semibold">Saldo Bonus Promo</span>
                    <span className="text-base sm:text-lg font-mono font-bold text-[#06b6d4]">+ Bonus Rp 5K</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Comparison Card */}
            <div className="bg-[#0f172a]/40 border border-[#1e293b]/50 rounded-xl p-6">
              <h3 className="text-sm font-bold text-[#f1f5f9] mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#06b6d4]" />
                Perbandingan Biaya Gateway (Per Juta Token)
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#06b6d4]/5 border border-[#06b6d4]/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]"></div>
                    <span className="text-xs font-bold text-[#06b6d4]">KedaiAI (Rata-rata)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-[#06b6d4] font-bold">~ Rp 11.200</span>
                    <span className="text-[10px] text-slate-400 block font-medium">Kurs Tetap IDR</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a]/40 border border-[#1e293b]/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <span className="text-xs text-slate-400 font-medium">OpenAI Direct USD</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-slate-300 font-bold">$0.85 USD</span>
                    <span className="text-[10px] text-slate-400 block">~ Rp 13.800 + Forex Fees</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a]/40 border border-[#1e293b]/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <span className="text-xs text-slate-400 font-medium">Anthropic Direct USD</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-slate-300 font-bold">$1.00 USD</span>
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
        <section className="py-8 border-t border-[#1e293b]/50" id="cara-kerja">
          <div className="flex flex-col md:flex-row items-start gap-12">
            
            {/* Timeline info left header */}
            <div className="md:w-1/3 md:sticky md:top-24 flex flex-col gap-4">
              <h2 className="font-sans text-3xl font-extrabold text-[#f1f5f9] leading-tight select-none">
                Workflow Cepat & Developer-Friendly
              </h2>
              <p className="font-sans text-sm text-[#94a3b8] leading-relaxed font-semibold opacity-90">
                Eksekusi integrasi model AI dalam hitungan menit saja.
              </p>
              <a
                href="#daftar"
                className="font-sans font-bold text-xs bg-[#06b6d4] text-black hover:bg-[#06b6d4]/95 px-6 py-3 rounded-lg transition-colors w-fit shadow-md flex items-center gap-2 cursor-pointer active:scale-95 duration-100"
              >
                Mulai Sekarang
                <Zap className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Timeline steps right */}
            <div className="md:w-2/3 flex flex-col gap-6 w-full relative pl-2">
              <div className="absolute left-[33px] top-6 bottom-6 w-[2px] bg-[#1e293b] hidden sm:block"></div>
              
              {/* Step 1 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-[#0f172a] border-2 border-[#1e293b] text-[#06b6d4] flex items-center justify-center shrink-0 z-10 shadow-sm font-sans font-bold">
                  1
                </div>
                <div className="bg-[#0f172a]/60 border border-[#1e293b]/50 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#f1f5f9] mb-1 flex items-center gap-2 selection:bg-[#fff0]">
                    <Search className="w-4 h-4 text-slate-500" /> Explore Models
                  </h4>
                  <p className="font-sans text-xs text-slate-400 leading-relaxed">
                    Pilih model terbaik (GPT-4o, Claude, Gemini) untuk speed, kualitas, atau efisiensi biaya.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-[#0f172a] border-2 border-[#1e293b] text-[#06b6d4] flex items-center justify-center shrink-0 z-10 shadow-sm font-sans font-bold">
                  2
                </div>
                <div className="bg-[#0f172a]/60 border border-[#1e293b]/50 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#f1f5f9] mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-500" /> Transparent Pricing
                  </h4>
                  <p className="font-sans text-xs text-slate-400 leading-relaxed">
                    Pantau estimasi biaya token langsung dalam mata uang Rupiah secara transparan.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-[#06b6d4] text-black border-2 border-[#1e293b] flex items-center justify-center shrink-0 z-10 shadow-md font-sans font-bold">
                  3
                </div>
                <div className="bg-[#06b6d4]/5 border border-[#06b6d4]/20 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#06b6d4] mb-1 flex items-center gap-2">
                    <Coins className="w-4 h-4" /> Instant Top Up
                  </h4>
                  <p className="font-sans text-xs text-slate-400 leading-relaxed mb-4">
                    Isi saldo prabayar mulai Rp 10.000 dengan mudah lewat QRIS (Gopay, OVO, Dana, LinkAja).
                  </p>
                  <div className="w-20 h-20 bg-[#0f172a]/80 rounded-lg flex items-center justify-center border border-[#1e293b]/50 shadow-inner group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[#475569]/50 text-4xl">qr_code</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-[#0f172a] border-2 border-[#1e293b] text-[#06b6d4] flex items-center justify-center shrink-0 z-10 shadow-sm font-sans font-bold">
                  4
                </div>
                <div className="bg-[#0f172a]/60 border border-[#1e293b]/50 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#f1f5f9] mb-1 flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-500" /> One API Key
                  </h4>
                  <p className="font-sans text-xs text-slate-400 leading-relaxed">
                    Hanya butuh satu key autentikasi tunggal untuk memanggil puluhan model AI global.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4 relative group">
                <div className="w-12 h-12 rounded-full bg-[#0f172a] border-2 border-[#1e293b] text-[#06b6d4] flex items-center justify-center shrink-0 z-10 shadow-sm font-sans font-bold">
                  5
                </div>
                <div className="bg-[#0f172a]/60 border border-[#1e293b]/50 rounded-xl p-5 flex-grow shadow-sm">
                  <h4 className="font-sans font-bold text-sm text-[#f1f5f9] mb-1 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-500" /> Ship Faster
                  </h4>
                  <p className="font-sans text-xs text-slate-400 leading-relaxed">
                    Integrasi cepat dalam hitungan baris kode berkat endpoint API yang kompatibel.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Register Form Panel */}
        <section className="py-12 max-w-lg mx-auto w-full" id="daftar">
          <div className="bg-[#0f172a]/60 border border-[#06b6d4]/20 p-8 rounded-2xl relative shadow-md">
            <div className="text-center mb-6">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#06b6d4] px-2.5 py-1 rounded bg-[#06b6d4]/5 border border-[#06b6d4]/20 inline-block mb-3 font-bold">
                Instant developer invitation
              </span>
              <h3 className="text-2xl font-bold text-[#f1f5f9]">{isLoginMode ? "Masuk ke KedaiAI" : "Daftar Akun KedaiAI"}</h3>
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
                  <label className="text-xs font-semibold text-[#f1f5f9] block mb-1.5">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Andi Wijaya"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0f172a]/80 border border-[#1e293b] rounded-lg text-[#f1f5f9] focus:outline-none focus:border-[#06b6d4]/60 placeholder-slate-400 font-sans transition"
                    id="input-name"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#f1f5f9] block mb-1.5">Alamat Email Kerja</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="andi@perusahaan.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0f172a]/80 border border-[#1e293b] rounded-lg text-[#f1f5f9] focus:outline-none focus:border-[#06b6d4]/60 placeholder-slate-400 font-sans transition"
                  id="input-email"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#f1f5f9] block mb-1.5">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0f172a]/80 border border-[#1e293b] rounded-lg text-[#f1f5f9] focus:outline-none focus:border-[#06b6d4]/60 placeholder-slate-400 font-sans transition"
                  id="input-password"
                />
              </div>

              <div className="flex items-start gap-2.5 text-[11px] text-slate-500 leading-normal mt-2">
                <CheckCircle className="w-4 h-4 text-[#06b6d4] shrink-0 mt-0.5" />
                <span>Dengan melanjutkan, Anda menyetujui Ketentuan Penggunaan dan Kebijakan Privasi Developer kami.</span>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 bg-[#06b6d4] hover:bg-[#06b6d4]/90 text-black font-bold text-sm rounded-lg transition-all shadow-sm active:scale-95 duration-100 flex items-center justify-center gap-2 disabled:opacity-50"
                id="btn-submit-register"
              >
                {loading ? "Memproses..." : isLoginMode ? "Masuk ke Akun" : "Buat Akun Sekarang (Free Bonus Rp 5K)"}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="text-xs text-[#06b6d4] font-semibold hover:underline"
                >
                  {isLoginMode ? "Belum punya akun? Daftar sekarang" : "Sudah punya akun? Masuk di sini"}
                </button>
              </div>
            </form>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-[#0f172a]/60 border-t border-[#1e293b]/50 w-full mt-auto py-8">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-4 max-w-7xl mx-auto gap-6">
          <div className="flex items-center gap-2">
            <span className="font-sans font-extrabold text-[#06b6d4] tracking-tight">KedaiAI</span>
            <span className="font-sans text-xs text-[#94a3b8] font-semibold ml-4">
              © 2026-2027 KedaiAI Indonesia Inc. Hak Cipta Dilindungi. Built for Indonesian Developers.
            </span>
          </div>

          <div className="flex flex-wrap gap-4 font-sans text-xs font-semibold">
            <a className="text-[#94a3b8] hover:text-[#06b6d4] transition-colors" href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <a className="text-[#94a3b8] hover:text-[#06b6d4] transition-colors" href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <a className="text-[#94a3b8] hover:text-[#06b6d4] transition-colors" href="#" onClick={(e) => e.preventDefault()}>API Status</a>
            <a className="text-[#94a3b8] hover:text-[#06b6d4] transition-colors" href="#" onClick={(e) => e.preventDefault()}>Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
