import { useState } from "react";
import { 
  Wallet, 
  Cpu, 
  TrendingUp, 
  ArrowUpRight, 
  Layers, 
  Terminal, 
  Activity, 
  Clock, 
  CheckCircle,
  XCircle,
  Compass
} from "lucide-react";
import { UserSession, UsageLog } from "../types";

interface DashboardTabProps {
  session: UserSession;
  usageLogs: UsageLog[];
  onNavigate: (tab: "dashboard" | "api-keys" | "playground" | "billing" | "usage") => void;
}

export default function DashboardTab({ session, usageLogs, onNavigate }: DashboardTabProps) {
  // Simple hover state for chart tooltip illustration 
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const getModelRate = (modelName: string) => {
    // Return IDR price per 1 token (usd_price_per_1k / 1000 * 1.2 * 16000)
    const multiplier = (1.2 * 16000) / 1000; // = 19.2
    const name = modelName.toLowerCase();
    
    if (name.endsWith(":free")) {
      return { input: 0, output: 0 };
    } else if (name.includes("gemini-1.5-flash")) {
      return { input: 0.000075 * multiplier, output: 0.000300 * multiplier };
    } else if (name.includes("gemini-1.5-pro")) {
      return { input: 0.003500 * multiplier, output: 0.010500 * multiplier };
    } else if (name.includes("gpt-3.5-turbo")) {
      return { input: 0.000500 * multiplier, output: 0.001500 * multiplier };
    } else if (name.includes("gpt-4o-mini")) {
      return { input: 0.000150 * multiplier, output: 0.000600 * multiplier };
    } else if (name.includes("claude-3-haiku")) {
      return { input: 0.000250 * multiplier, output: 0.001250 * multiplier };
    } else if (name.includes("gpt-4o")) { // older mock
      return { input: 0.005 * multiplier, output: 0.015 * multiplier };
    } else if (name.includes("claude-3-5-sonnet")) { // older mock
      return { input: 0.003 * multiplier, output: 0.009 * multiplier };
    } else if (name.includes("lfm2.5") || name.includes("lmstudio")) {
      return { input: 0.000150 * multiplier, output: 0.000600 * multiplier };
    } else {
      // default fallback
      return { input: 0.0001 * multiplier, output: 0.0003 * multiplier };
    }
  };

  // Calculate live aggregate stats from usageLogs
  const totalRequests = usageLogs.length;
  const successRate = totalRequests > 0 
    ? ((usageLogs.filter(l => l.status === "Success").length / totalRequests) * 100).toFixed(1) 
    : "100.0";

  const totalTokens = usageLogs.reduce((acc, log) => acc + log.promptTokens + log.completionTokens, 0);
  const totalSpent = usageLogs.reduce((acc, log) => acc + log.costDeducted, 0);

  const formatRupiah = (val: number) => {
    return val.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Dynamic 7-day usage aggregation
  const getDynamicChartData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const chartData = [];
    
    // Default to last 7 days ending today
    let end = new Date();
    
    // Auto-align timeline window if historical data is loaded
    if (usageLogs.length > 0) {
      const dates = usageLogs.map(l => new Date(l.timestamp.substring(0, 10)));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      if (!isNaN(maxDate.getTime())) {
        const diffDays = Math.abs(maxDate.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 2) {
          end = maxDate;
        }
      }
    }

    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`; // "YYYY-MM-DD"
      const dateLabel = `${d.getDate()} ${months[d.getMonth()]}`;
      
      let gemini = 0;
      let gpt4 = 0;
      let claude = 0;
      
      usageLogs.forEach(log => {
        if (log.timestamp.startsWith(dateStr)) {
          const tokensK = (log.promptTokens + log.completionTokens) / 1000;
          const modelLower = log.modelName.toLowerCase();
          if (modelLower.includes("gemini") || modelLower.includes("google")) {
            gemini += tokensK;
          } else if (modelLower.includes("gpt") || modelLower.includes("openai") || modelLower.includes("llama")) {
            gpt4 += tokensK;
          } else if (modelLower.includes("claude") || modelLower.includes("anthropic")) {
            claude += tokensK;
          } else {
            if (modelLower.includes("free")) {
              gemini += tokensK;
            } else {
              gpt4 += tokensK;
            }
          }
        }
      });
      
      chartData.push({
        date: dateLabel,
        gemini: Math.round(gemini * 10) / 10,
        gpt4: Math.round(gpt4 * 10) / 10,
        claude: Math.round(claude * 10) / 10
      });
    }
    
    return chartData;
  };

  const dailyChartData = getDynamicChartData();

  // Find max value dynamically to fit SVG layout
  const maxVal = Math.max(
    100, // minimum scale
    ...dailyChartData.map(d => Math.max(d.gemini, d.gpt4, d.claude))
  );

  // Model breakdown calculations
  const geminiCount = usageLogs.filter(l => {
    const name = l.modelName.toLowerCase();
    return name.includes("gemini") || name.includes("google");
  }).length;
  const openAiCount = usageLogs.filter(l => {
    const name = l.modelName.toLowerCase();
    return name.includes("gpt") || name.includes("openai");
  }).length;
  const claudeCount = usageLogs.filter(l => {
    const name = l.modelName.toLowerCase();
    return name.includes("claude") || name.includes("anthropic");
  }).length;
  const otherCount = totalRequests - (geminiCount + openAiCount + claudeCount);

  const totalCount = totalRequests || 1;
  const geminiPct = Math.round((geminiCount / totalCount) * 100);
  const openAiPct = Math.round((openAiCount / totalCount) * 100);
  const claudePct = Math.round((claudeCount / totalCount) * 100);
  const otherPct = Math.round((otherCount / totalCount) * 100);

  // SVG Donut Setup
  const radius = 35;
  const circumference = 2 * Math.PI * radius; // ~219.91
  
  const segments = [
    { name: "Gemini", count: geminiCount, pct: geminiPct, color: "#22d3ee", strokeColor: "stroke-cyan-400" },
    { name: "OpenAI", count: openAiCount, pct: openAiPct, color: "#34d399", strokeColor: "stroke-emerald-400" },
    { name: "Claude", count: claudeCount, pct: claudePct, color: "#f59e0b", strokeColor: "stroke-amber-500" },
    { name: "Lainnya", count: otherCount, pct: otherPct, color: "#a855f7", strokeColor: "stroke-purple-500" }
  ].filter(s => s.count > 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Overview Dashboard</h1>
          <p className="text-slate-400 text-sm">Pemantauan real-time sisa saldo, total pemakaian token, dan aktivitas API Anda.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-lg text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">LIVE SYNC</span>
          <span className="border-l border-slate-800 h-3 mx-1"></span>
          <Clock className="w-3.5 h-3.5 text-cyan-500" />
          <span>Waktu Server GMT+7 (Asia/Jakarta)</span>
        </div>
      </div>

      {/* KPI Stats Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Saldo */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden group hover:border-cyan-500/30 transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 rounded-lg text-cyan-400">
              <Wallet className="w-5 h-5" />
            </div>
            <button 
              onClick={() => onNavigate("billing")}
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] uppercase font-mono text-cyan-400 rounded hover:bg-cyan-500 hover:text-black transition flex items-center gap-1 font-bold"
            >
              Top Up <ArrowUpRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Saldo Prabayar Aktif</span>
          <h2 className="text-3xl font-mono font-bold text-white tracking-tight mt-1 mb-2">
            {formatRupiah(session.balance)}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Status Akun: Aktif (Gratis Rp 5K awal)</span>
          </div>
        </div>

        {/* Card 2: Total Tokens */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden group hover:border-cyan-500/30 transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-950/40 border border-purple-500/20 rounded-lg text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <button 
              onClick={() => onNavigate("playground")}
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] uppercase font-mono text-purple-400 rounded hover:bg-purple-900/30 transition font-bold"
            >
              Test API
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Volume Token Dikonsumsi</span>
          <h2 className="text-3xl font-mono font-bold text-white tracking-tight mt-1 mb-2">
            {(totalTokens / 1000000).toFixed(3)} M
          </h2>
          <p className="text-xs text-slate-500 mt-1">Total {totalTokens.toLocaleString()} tokens dari {totalRequests} request</p>
        </div>

        {/* Card 3: Total spent / Success rate */}
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden group hover:border-cyan-500/30 transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <button 
              onClick={() => onNavigate("usage")}
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] uppercase font-mono text-emerald-400 rounded hover:bg-emerald-500/10 transition font-bold"
            >
              Analisis
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Akumulasi Biaya Terpotong</span>
          <h2 className="text-3xl font-mono font-bold text-white tracking-tight mt-1 mb-2">
            {formatRupiah(totalSpent)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Success Rate: <span className="text-emerald-400 font-bold">{successRate}%</span></p>
        </div>
      </div>

      {/* Main Content Row: Custom premium Chart and Quick Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Usage Chart from custom SVG wrapper (React 19 Safe) */}
        <div className="glass-panel rounded-xl p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Tren Konsumsi Token (7 Hari Terakhir)
              </h3>
              <p className="text-xs text-slate-500">Angka ditunjukkan dalam Ribu (K) Token per model AI.</p>
            </div>

            {/* Model legend checkboxes */}
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded bg-cyan-400 inline-block"></span> Gemini
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block"></span> OpenAI
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span> Anthropic
              </span>
            </div>
          </div>

          {/* Premium Custom SVG Bar Chart */}
          <div className="relative h-64 w-full bg-slate-950/40 rounded-xl border border-slate-900 p-4 flex items-end justify-between gap-1">
            {/* Grid lines behind bars */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="border-b border-white w-full h-0"></div>
              <div className="border-b border-white w-full h-0"></div>
              <div className="border-b border-white w-full h-0"></div>
              <div className="border-b border-white w-full h-0"></div>
            </div>

            {dailyChartData.map((day, dIdx) => {
              const scale = 140 / maxVal; // box height controller
              const gHeight = day.gemini * scale;
              const oHeight = day.gpt4 * scale;
              const cHeight = day.claude * scale;
              
              const isHovered = hoveredBarIndex === dIdx;

              return (
                <div 
                  key={day.date} 
                  className="flex-1 flex flex-col items-center justify-end h-full relative"
                  onMouseEnter={() => setHoveredBarIndex(dIdx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Floating tooltip when index is hovered */}
                  {isHovered && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-10 glass-panel border border-cyan-500/40 text-[9px] font-mono rounded px-2.5 py-1.5 shadow-xl w-28 whitespace-nowrap animate-fade-in text-slate-300">
                      <div className="font-bold text-white text-center mb-1 border-b border-slate-800 pb-0.5">{day.date}</div>
                      <div className="flex justify-between"><span className="text-cyan-400">Gemini:</span> <b>{day.gemini}K</b></div>
                      <div className="flex justify-between"><span className="text-emerald-400">OpenAI:</span> <b>{day.gpt4}K</b></div>
                      <div className="flex justify-between"><span className="text-amber-500">Claude:</span> <b>{day.claude}K</b></div>
                    </div>
                  )}

                  {/* Combined stacked/side-by-side grouped visual bar columns */}
                  <div className="flex items-end gap-0.5 w-full justify-center px-1">
                    {/* Gemini Bar */}
                    <div 
                      className={`w-2 rounded-t bg-cyan-500 transition-all duration-300 ${isHovered ? "brightness-125 saturate-150 scale-y-105" : "opacity-80"}`}
                      style={{ height: `${Math.max(gHeight, 4)}px` }}
                    ></div>
                    {/* OpenAI Bar */}
                    <div 
                      className={`w-2 rounded-t bg-emerald-500 transition-all duration-300 ${isHovered ? "brightness-125 saturate-150 scale-y-105" : "opacity-80"}`}
                      style={{ height: `${Math.max(oHeight, 4)}px` }}
                    ></div>
                    {/* Claude Bar */}
                    <div 
                      className={`w-2 rounded-t bg-amber-500 transition-all duration-300 ${isHovered ? "brightness-125 saturate-150 scale-y-105" : "opacity-80"}`}
                      style={{ height: `${Math.max(cHeight, 4)}px` }}
                    ></div>
                  </div>

                  {/* Day Date labels below columns */}
                  <span className="text-[10px] font-mono text-slate-500 mt-2">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Model Breakdown & Quick Navigation */}
        <div className="space-y-6 lg:col-span-1">
          {/* Model Breakdown Donut Card */}
          <div className="glass-panel rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Distribusi Model
              </h3>
              <p className="text-xs text-slate-500">Proporsi volume panggilan API berdasarkan provider.</p>
            </div>
            
            {usageLogs.length > 0 ? (
              <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-around gap-6 pt-2">
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 100" className="w-28 h-28 transform -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      className="stroke-slate-900"
                      strokeWidth="10"
                    />
                    {segments.map((seg, idx) => {
                      const strokeDash = `${(seg.pct / 100) * circumference} ${circumference}`;
                      const strokeOffset = circumference - (segments.slice(0, idx).reduce((acc, s) => acc + s.pct, 0) / 100) * circumference;
                      return (
                        <circle
                          key={seg.name}
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          className={seg.strokeColor}
                          strokeWidth="10"
                          strokeDasharray={strokeDash}
                          strokeDashoffset={strokeOffset}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-bold font-mono text-white leading-none">{usageLogs.length}</span>
                    <span className="text-[8px] text-slate-500 font-mono uppercase mt-0.5">Calls</span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2 w-full">
                  {segments.map(seg => (
                    <div key={seg.name} className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: seg.color }}></span>
                        <span className="text-slate-300">{seg.name}</span>
                      </div>
                      <span className="text-slate-400 font-bold">{seg.pct}% <span className="text-[10px] text-slate-600 font-normal">({seg.count})</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 font-mono text-xs">
                Belum ada log penggunaan API.
              </div>
            )}
          </div>

          {/* Quick Tools and resources column */}
          <div className="glass-panel rounded-xl p-6 space-y-6">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              Navigasi Cepat
            </h3>

            <div className="grid grid-cols-1 gap-3 text-xs">
              <button 
                onClick={() => onNavigate("playground")}
                className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 hover:border-cyan-500/20 hover:bg-slate-900/70 rounded-lg text-left transition text-slate-300"
              >
                <div className="p-1.5 bg-cyan-950/40 rounded text-cyan-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Akses Playground Konsol</span>
                  <span className="text-[11px] text-slate-500">Uji coba langsung token multi-model</span>
                </div>
              </button>

              <button 
                onClick={() => onNavigate("api-keys")}
                className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 hover:border-purple-500/20 hover:bg-slate-900/70 rounded-lg text-left transition text-slate-300"
              >
                <div className="p-1.5 bg-purple-950/40 rounded text-purple-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Kelola API Keys</span>
                  <span className="text-[11px] text-slate-500">Kelola credentials staging & produksi</span>
                </div>
              </button>

              <button 
                onClick={() => onNavigate("billing")}
                className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 hover:border-emerald-500/20 hover:bg-slate-900/70 rounded-lg text-left transition text-slate-300"
              >
                <div className="p-1.5 bg-emerald-950/40 rounded text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Isi Saldo (Top Up IDR)</span>
                  <span className="text-[11px] text-slate-500">Isi saldo instan pakai QRIS atau E-Wallet</span>
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-900 text-xs text-slate-500 space-y-2">
              <span className="font-bold text-slate-400 block font-mono">Dukungan API Gateway:</span>
              <p className="leading-relaxed">Jika menemui kendala dalam pengujian API key pada framework, silakan hubungi Customer Success di channel Discord KedaiAI.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent API Logs table */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Catatan Panggilan API Terakhir
            </h3>
            <p className="text-xs text-slate-500">Daftar request REST API transit yang masuk melewati platform gateway.</p>
          </div>
          <button 
            onClick={() => onNavigate("usage")}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-bold"
          >
            Lihat Semua Log →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400 pb-3">
                <th className="pb-3 px-2 font-medium">TIMESTAMP</th>
                <th className="pb-3 px-2 font-medium">MODEL</th>
                <th className="pb-3 px-2 font-medium text-right">PROMPT</th>
                <th className="pb-3 px-2 font-medium text-right">COMPLETION</th>
                <th className="pb-3 px-2 font-medium text-right text-slate-500 text-[10px]">TARIF (1 TKN/RP)</th>
                <th className="pb-3 px-2 font-medium text-right text-cyan-400">COST</th>
                <th className="pb-3 px-2 font-medium text-right">LATENCY</th>
                <th className="pb-3 px-2 font-medium text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300">
              {usageLogs.length > 0 ? (
                usageLogs.slice(0, 5).map((log) => {
                  const rate = getModelRate(log.modelName);
                  return (
                    <tr key={log.id} className="hover:bg-slate-950/40 transition">
                      <td className="py-3 px-2 text-slate-500">{log.timestamp}</td>
                      <td className="py-3 px-2 font-bold text-white">{log.modelName}</td>
                      <td className="py-3 px-2 text-right">{log.promptTokens.toLocaleString()} tkn</td>
                      <td className="py-3 px-2 text-right">{log.completionTokens.toLocaleString()} tkn</td>
                      <td className="py-3 px-2 text-right text-[10px] text-slate-400">
                        In Rp{rate.input.toFixed(3)} | Out Rp{rate.output.toFixed(3)}
                      </td>
                      <td className="py-3 px-2 text-right text-cyan-400 font-bold">{formatRupiah(log.costDeducted)}</td>
                      <td className="py-3 px-2 text-right text-slate-400">{log.latencyMs} ms</td>
                      <td className="py-3 px-2 text-center">
                        {log.status === "Success" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" /> 200 OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-950/40 text-red-400 px-2 py-0.5 rounded text-[10px] border border-red-500/20">
                            <XCircle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    Belum ada log penggunaan API.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
