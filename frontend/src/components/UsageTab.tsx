import { useState } from "react";
import { 
  Cpu, 
  Activity, 
  Clock, 
  Download, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Coins,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { UsageLog } from "../types";

interface UsageTabProps {
  usageLogs: UsageLog[];
}

export default function UsageTab({ usageLogs }: UsageTabProps) {
  const [modelFilter, setModelFilter] = useState<"all" | "gemini-3.5-flash" | "gpt-4o" | "claude-3-5-sonnet">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedNotification, setCopiedNotification] = useState(false);

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

  // Filter logic
  const filteredLogs = usageLogs.filter((log) => {
    const matchesModel = modelFilter === "all" || log.modelName === modelFilter;
    const matchesSearch = log.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.modelName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModel && matchesSearch;
  });

  // KPI Calculations
  const totalCalls = filteredLogs.length;
  const totalCost = filteredLogs.reduce((acc, log) => acc + log.costDeducted, 0);
  const totalTokens = filteredLogs.reduce((acc, log) => acc + log.promptTokens + log.completionTokens, 0);
  
  const avgLatency = totalCalls > 0 
    ? Math.round(filteredLogs.reduce((acc, log) => acc + log.latencyMs, 0) / totalCalls) 
    : 0;

  // Pie chart replacement: beautiful custom percentage stacking bar
  const geminiCount = filteredLogs.filter(l => l.modelName === "gemini-3.5-flash").length;
  const gptCount = filteredLogs.filter(l => l.modelName === "gpt-4o").length;
  const claudeCount = filteredLogs.filter(l => l.modelName === "claude-3-5-sonnet").length;

  const totalProportion = (geminiCount + gptCount + claudeCount) || 1;
  const geminiPct = Math.round((geminiCount / totalProportion) * 100);
  const gptPct = Math.round((gptCount / totalProportion) * 100);
  const claudePct = Math.round((claudeCount / totalProportion) * 100);

  const handleDownloadReport = () => {
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);

    // Create custom CSV file text download mockup
    const header = "ID,Timestamp,Model,PromptTokens,CompletionTokens,CostIDR,LatencyMs,Status\n";
    const rows = filteredLogs.map(log => 
      `${log.id},${log.timestamp},${log.modelName},${log.promptTokens},${log.completionTokens},${log.costDeducted},${log.latencyMs},${log.status}`
    ).join("\n");
    
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GateLLM_Usage_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatRupiah = (val: number) => {
    return val.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header section with download trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Statistik & Analitik</h1>
          <p className="text-slate-400 text-sm">Review detail volume token, performa response latency, dan akumulasi biaya API key.</p>
        </div>
        <button 
          onClick={handleDownloadReport}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 font-mono font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          Ekspor Laporan (.CSV)
        </button>
      </div>

      {/* Info Banner: Fair 1 Token / Rp Billing model */}
      <div className="bg-cyan-950/20 border border-cyan-500/25 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-mono font-bold text-xs text-white block">Sistem Penagihan Sesuai 1 Token / Rp (Sangat Adil)</span>
            <span className="text-[11px] text-slate-400">Penggunaan router GateLLM dihitung murni serealistis tarif presisi token per token. Bebas dari biaya penalti minimum Rp 4 per API call.</span>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-cyan-950/60 rounded text-[10px] font-mono font-bold text-cyan-400 self-start sm:self-auto border border-cyan-500/10">
          Uptime Rate: 99.98%
        </div>
      </div>

      {/* KPI Info row cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel p-5 rounded-xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Request API</span>
          <h3 className="text-2xl font-bold font-mono text-white tracking-tight mt-1">{totalCalls} calls</h3>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-400" /> Success Rate berkala</p>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Token Sesi Ini</span>
          <h3 className="text-2xl font-bold font-mono text-white tracking-tight mt-1">{totalTokens.toLocaleString()}</h3>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5"><HelpCircle className="w-3 h-3 text-cyan-400 animate-pulse" /> Ekuivalen unit karakter</p>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Biaya Terakumulasi</span>
          <h3 className="text-2xl font-bold font-mono text-cyan-400 tracking-tight mt-1">{formatRupiah(totalCost)}</h3>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5"><Coins className="w-3 h-3" /> Rupiah prepay rate</p>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Rata-rata Latency</span>
          <h3 className="text-2xl font-bold font-mono text-white tracking-tight mt-1">{avgLatency} ms</h3>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5"><Clock className="w-3 h-3 text-cyan-400" /> Edge relay routing</p>
        </div>

      </div>

      {/* Distribution visual progress bar wrapper */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div>
          <h4 className="text-sm font-bold font-mono text-white">Distribusi Penggunaan Model AI</h4>
          <p className="text-xs text-slate-500">Persentase panggilan API transit terdistribusi ke masing-masing model provider yang didukung.</p>
        </div>

        {/* Dynamic proportional progress bar */}
        <div className="h-6 w-full rounded-lg overflow-hidden flex font-mono text-[10px] text-slate-950 font-bold border border-slate-900 shadow-inner">
          {geminiPct > 0 && (
            <div 
              style={{ width: `${geminiPct}%` }}
              className="bg-cyan-400 flex items-center justify-center transition-all duration-550"
              title={`Gemini: ${geminiPct}%`}
            >
              {geminiPct}%
            </div>
          )}
          {gptPct > 0 && (
            <div 
              style={{ width: `${gptPct}%` }}
              className="bg-emerald-400 flex items-center justify-center transition-all duration-550 border-l border-slate-950"
              title={`GPT-4: ${gptPct}%`}
            >
              {gptPct}%
            </div>
          )}
          {claudePct > 0 && (
            <div 
              style={{ width: `${claudePct}%` }}
              className="bg-amber-500 flex items-center justify-center transition-all duration-550 border-l border-slate-950"
              title={`Claude: ${claudePct}%`}
            >
              {claudePct}%
            </div>
          )}
        </div>

        {/* Legend block descriptors */}
        <div className="flex flex-wrap gap-4 text-xs font-mono pt-1">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 bg-cyan-400 rounded-sm"></span> Gemini (Low cost / Flash)
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 bg-emerald-400 rounded-sm"></span> OpenAI GPT series
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 bg-amber-500 rounded-sm"></span> Claude 3.x Anthropic
          </span>
        </div>
      </div>

      {/* Filters & search bars and Results Grid */}
      <div className="glass-panel rounded-xl overflow-hidden">
        
        {/* Filter header controls */}
        <div className="p-5 border-b border-slate-900 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">Filter Model:</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <button 
                onClick={() => setModelFilter("all")}
                className={`px-2.5 py-1 rounded transition ${modelFilter === "all" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold" : "text-slate-400 hover:text-white"}`}
              >
                All
              </button>
              <button 
                onClick={() => setModelFilter("gemini-3.5-flash")}
                className={`px-2.5 py-1 rounded transition ${modelFilter === "gemini-3.5-flash" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold" : "text-slate-400"}`}
              >
                Gemini Flash
              </button>
              <button 
                onClick={() => setModelFilter("gpt-4o")}
                className={`px-2.5 py-1 rounded transition ${modelFilter === "gpt-4o" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold" : "text-slate-400"}`}
              >
                GPT-4o
              </button>
              <button 
                onClick={() => setModelFilter("claude-3-5-sonnet")}
                className={`px-2.5 py-1 rounded transition ${modelFilter === "claude-3-5-sonnet" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold" : "text-slate-400"}`}
              >
                Claude
              </button>
            </div>
          </div>

          {/* Quick text search */}
          <div className="relative font-mono">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID request..."
              className="bg-slate-900 border border-slate-900 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 w-44"
            />
          </div>
        </div>

        {/* Primary Usage Logs Listing Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400">
                <th className="py-4 px-5 font-medium">REQUEST TRANSIT ID</th>
                <th className="py-4 px-5 font-medium">TIMESTAMP (GMT+7)</th>
                <th className="py-4 px-5 font-medium">MODEL ENDPOINT</th>
                <th className="py-4 px-5 text-right font-medium">PROMPT</th>
                <th className="py-4 px-5 text-right font-medium">COMPLETION</th>
                <th className="py-4 px-5 text-right font-medium text-slate-400">TARIF RATIO (1 TKN/RP)</th>
                <th className="py-4 px-5 text-right font-medium text-cyan-400">COST DEDUCTED</th>
                <th className="py-4 px-5 text-right font-medium">LATENCY</th>
                <th className="py-4 px-5 text-center font-medium">TRANSIT STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const rate = getModelRate(log.modelName);
                  return (
                    <tr key={log.id} className="hover:bg-slate-950/40 transition">
                      <td className="py-4 px-5">
                        <span className="text-slate-400 font-bold">{log.id}</span>
                      </td>
                      <td className="py-4 px-5 text-slate-500">{log.timestamp}</td>
                      <td className="py-4 px-5 font-bold text-white">{log.modelName}</td>
                      <td className="py-4 px-5 text-right">{log.promptTokens.toLocaleString()} tkn</td>
                      <td className="py-4 px-5 text-right">{log.completionTokens.toLocaleString()} tkn</td>
                      <td className="py-4 px-5 text-right text-[10px] text-slate-400">
                        In: Rp{rate.input.toFixed(3)} | Out: Rp{rate.output.toFixed(3)}
                      </td>
                      <td className="py-4 px-5 text-right text-cyan-400 font-bold">{formatRupiah(log.costDeducted)}</td>
                      <td className="py-4 px-5 text-right text-slate-400">{log.latencyMs} ms</td>
                      <td className="py-4 px-5 text-center">
                        {log.status === "Success" ? (
                          <span className="inline-flex bg-emerald-950/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] border border-emerald-500/10">SUCCESS</span>
                        ) : (
                          <span className="inline-flex bg-red-950/30 text-red-400 px-2 py-0.5 rounded text-[10px] border border-red-500/10">FAILED</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    Tidak ditemukan data request log yang cocok dengan filter aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating success toast notifications during report compilation download */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-cyan-500/40 rgb-pulse p-4 rounded-xl flex items-center gap-3 shadow-2xl animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-white font-bold">Laporan CSV sukses dikompilasi & diunduh!</span>
        </div>
      )}

    </div>
  );
}
