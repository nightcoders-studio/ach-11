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
  Plus,
  Compass
} from "lucide-react";
import { UserSession, UsageLog } from "../types";
import { dailyChartData } from "../mockData";

interface DashboardTabProps {
  session: UserSession;
  usageLogs: UsageLog[];
  onNavigate: (tab: "dashboard" | "api-keys" | "playground" | "billing" | "usage") => void;
}

export default function DashboardTab({ session, usageLogs, onNavigate }: DashboardTabProps) {
  // Simple hover state for chart tooltip illustration 
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const getModelRate = (modelName: string) => {
    switch (modelName) {
      case "gpt-4o":
        return { input: 0.08, output: 0.24 };
      case "claude-3-5-sonnet":
        return { input: 0.05, output: 0.15 };
      default:
        return { input: 0.015, output: 0.045 };
    }
  };

  // Calculate some aggregate stats
  const totalRequests = usageLogs.length;
  const successRate = totalRequests > 0 
    ? ((usageLogs.filter(l => l.status === "Success").length / totalRequests) * 100).toFixed(1) 
    : "100.0";

  const formatRupiah = (val: number) => {
    return val.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Overview Dashboard</h1>
          <p className="text-slate-400 text-sm">Pemantauan real-time sisa saldo, total pemakaian token, dan aktivitas API Anda.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-lg text-slate-400">
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
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] uppercase font-mono text-cyan-400 rounded hover:bg-cyan-500 hover:text-black transition flex items-center gap-1"
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
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] uppercase font-mono text-purple-400 rounded hover:bg-purple-900/30 transition"
            >
              Test API
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Volume Token Dikonsumsi</span>
          <h2 className="text-3xl font-mono font-bold text-white tracking-tight mt-1 mb-2">
            {session.totalTokens.toFixed(3)} M
          </h2>
          <p className="text-xs text-slate-500 mt-1">Ekuivalen dengan pemakaian semua model terpadu</p>
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
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] uppercase font-mono text-emerald-400 rounded hover:bg-emerald-500/10 transition"
            >
              Analisis
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Akumulasi Biaya Terpotong</span>
          <h2 className="text-3xl font-mono font-bold text-white tracking-tight mt-1 mb-2">
            {formatRupiah(session.totalSpent)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Estimasi penghematan ~24% vs. direct billing USD</p>
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
              const maxVal = 1500; // max scale of data
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
                      className={`w-2.5 rounded-t bg-cyan-500 transition-all duration-300 ${isHovered ? "brightness-125 saturate-120 scale-y-105" : "opacity-80"}`}
                      style={{ height: `${Math.max(gHeight, 4)}px` }}
                    ></div>
                    {/* OpenAI Bar */}
                    <div 
                      className={`w-2.5 rounded-t bg-emerald-500 transition-all duration-300 ${isHovered ? "brightness-125 saturate-120 scale-y-105" : "opacity-80"}`}
                      style={{ height: `${Math.max(oHeight, 4)}px` }}
                    ></div>
                    {/* Claude Bar */}
                    <div 
                      className={`w-2.5 rounded-t bg-amber-500 transition-all duration-300 ${isHovered ? "brightness-125 saturate-120 scale-y-105" : "opacity-80"}`}
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
            <p className="leading-relaxed">Jika menemui kendala dalam pengujian API key pada framework, silakan hubungi Customer Success di channel Discord GateLLM.</p>
          </div>
        </div>
      </div>

      {/* Recet API Logs table */}
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
              {usageLogs.slice(0, 4).map((log) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
