import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Code, 
  Copy, 
  Check, 
  Terminal, 
  Server, 
  Lock, 
  Coins, 
  Key, 
  Layers, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Shield,
  BadgeAlert,
  Info,
  Activity,
  RefreshCw
} from "lucide-react";

type Method = "POST" | "GET";

interface EndpointInfo {
  id: string;
  method: Method;
  path: string;
  description: string;
  headers: { key: string; value: string; desc: string }[];
  requestBody?: string;
  responseBody: string;
}

interface HealthState {
  id: string;
  name: string;
  provider: string;
  uptime: string;
  latency: number;
  baseLatency: number;
  status: "Operational" | "Degraded" | "Down";
  history: number[]; // 1 = ok, 2 = degraded, 0 = down, last 12-15 checks
}

export default function DocumentationTab() {
  const [activeTab, setActiveTab] = useState<"quickstart" | "endpoints" | "errors">("quickstart");
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("chat");
  const [selectedLanguage, setSelectedLanguage] = useState<"curl" | "javascript" | "python" | "python-sdk">("curl");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Health Status Monitor state
  const [providerHealth, setProviderHealth] = useState<HealthState[]>([
    {
      id: "gemini",
      name: "Google Gemini Route",
      provider: "asia-southeast1 (Singapore)",
      uptime: "99.99%",
      latency: 142,
      baseLatency: 140,
      status: "Operational",
      history: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    {
      id: "openai",
      name: "OpenAI GPT Route",
      provider: "us-east-1 (N. Virginia)",
      uptime: "99.96%",
      latency: 285,
      baseLatency: 280,
      status: "Operational",
      history: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    {
      id: "claude",
      name: "Anthropic Claude Route",
      provider: "us-west-2 (Oregon)",
      uptime: "99.94%",
      latency: 228,
      baseLatency: 220,
      status: "Operational",
      history: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    }
  ]);

  const [isScanning, setIsScanning] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Periodically fluctuate latency to simulate active polling monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 800);

      setProviderHealth(prev => prev.map(item => {
        // slightly fluctuate latency
        const flex = Math.floor(Math.random() * 21) - 10; // -10ms to +10ms
        const nextLatency = Math.max(item.baseLatency + flex, 45);
        return {
          ...item,
          latency: nextLatency
        };
      }));
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleManualPing = (id: string) => {
    // Set scanning animation for this button
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 550);

    setProviderHealth(prev => prev.map(item => {
      if (item.id === id) {
        // Random quick test latency
        const randomFastLatency = Math.floor(item.baseLatency * 0.9) + Math.floor(Math.random() * 15);
        return {
          ...item,
          latency: randomFastLatency
        };
      }
      return item;
    }));

    setCopiedSection(`ping-${id}`);
    setTimeout(() => {
      setCopiedSection(null);
    }, 1500);
  };

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  // Endpoint Details Definition
  const endpoints: Record<string, EndpointInfo> = {
    chat: {
      id: "chat",
      method: "POST",
      path: "/v1/chat/completions",
      description: "Endpoint utama untuk berinteraksi dengan AI Router GateLLM. Permintaan otomatis di-routing ke provider terbaik (Gemini, OpenAI, Claude) berdasarkan bobot performa, latensi aktual, atau penentuan model spesifik Anda.",
      headers: [
        { key: "Content-Type", value: "application/json", desc: "Tipe media konten request" },
        { key: "Authorization", value: "Bearer GLM_PROD_...", desc: "GateLLM API Key dari tab API Credentials" }
      ],
      requestBody: `{
  "model": "gemini-3.5-flash", 
  "messages": [
    {
      "role": "system",
      "content": "Anda adalah asisten AI teknis profesional."
    },
    {
      "role": "user",
      "content": "Tuliskan kode Quick Sort dalam bahasa TypeScript."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}`,
      responseBody: `{
  "id": "chat-gate-9a8b7c6d5e4f",
  "object": "chat.completion",
  "created": 1716304859,
  "model": "gemini-3.5-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Berikut adalah implementasi Quick Sort dalam TypeScript..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 30,
    "completion_tokens": 245,
    "total_tokens": 275
  },
  "cost_idr": 4.12
}`
    },
    models: {
      id: "models",
      method: "GET",
      path: "/v1/models",
      description: "Mengembalikan daftar semua model AI (endpoints) yang terdaftar dan aktif di bawah proxy routing GateLLM beserta detail tarif biaya per 1,000 token.",
      headers: [
        { key: "Authorization", value: "Bearer GLM_PROD_...", desc: "GateLLM API Key" }
      ],
      responseBody: `{
  "object": "list",
  "data": [
    {
      "id": "gemini-3.5-flash",
      "object": "model",
      "owned_by": "google",
      "pricing": {
        "input_per_million_idr": 15000,
        "output_per_million_idr": 45000
      }
    },
    {
      "id": "gpt-4o",
      "object": "model",
      "owned_by": "openai",
      "pricing": {
        "input_per_million_idr": 80000,
        "output_per_million_idr": 240000
      }
    },
    {
      "id": "claude-3-5-sonnet",
      "object": "model",
      "owned_by": "anthropic",
      "pricing": {
        "input_per_million_idr": 50000,
        "output_per_million_idr": 150000
      }
    }
  ]
}`
    },
    balance: {
      id: "balance",
      method: "GET",
      path: "/v1/balance",
      description: "Memeriksa sisa saldo (prepaid credit) yang saat ini diasosiasikan dengan API Key Anda yang sedang aktif secara real-time.",
      headers: [
        { key: "Authorization", value: "Bearer GLM_PROD_...", desc: "GateLLM API Key" }
      ],
      responseBody: `{
  "object": "wallet.balance",
  "currency": "IDR",
  "current_balance": 185250,
  "formatted_balance": "Rp 185.250",
  "unlimited_expiry": true
}`
    }
  };

  // Multiple Language Code Snippets
  const codeSnippets = {
    curl: `curl https://api.gatellm.id/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_GLM_API_KEY" \\
  -d '{
    "model": "gemini-3.5-flash",
    "messages": [
      {"role": "user", "content": "Halo GateLLM, perkenalkan dirimu!"}
    ],
    "temperature": 0.7
  }'`,
    javascript: `// Menggunakan Fetch API di Node.js (v18+) atau Browser
const queryGateLLM = async () => {
  const response = await fetch("https://api.gatellm.id/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_GLM_API_KEY"
    },
    body: JSON.stringify({
      model: "gemini-3.5-flash",
      messages: [
        { role: "user", content: "Jelaskan apa itu LLM Router API." }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();
  console.log("Response:", data.choices[0].message.content);
  console.log("Biaya Terpotong:", data.cost_idr, "IDR");
};

queryGateLLM();`,
    python: `# Menggunakan library requests standard
import requests

url = "https://api.gatellm.id/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_GLM_API_KEY"
}

payload = {
    "model": "gemini-3.5-flash",
    "messages": [
        {"role": "user", "content": "Rekomendasikan 3 framework Python."}
    ],
    "temperature": 0.5
}

response = requests.post(url, json=payload, headers=headers)
result = response.json()

print(result['choices'][0]['message']['content'])
print(f"Cost Deducted: {result['cost_idr']} IDR")`,
    "python-sdk": `# Integrasi mulus menggunakan library resmi OpenAI SDK!
# Cukup ganti base_url dan API Key Anda!
from openai import OpenAI

client = OpenAI(
    base_url="https://api.gatellm.id/v1",
    api_key="YOUR_GLM_API_KEY" # Masukkan API Key GateLLM Anda
)

response = client.chat.completions.create(
    model="gemini-3.5-flash",
    messages=[
        {"role": "user", "content": "Bagaimana cara kerja caching API?"}
    ]
)

print(response.choices[0].message.content)`
  };

  const filteredHealth = providerHealth.filter(item => {
    const matchesProvider = providerFilter === "all" || item.id === providerFilter;
    const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesProvider && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl pb-10">
      {/* Header section info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Dokumentasi API Pengembang</h1>
          <p className="text-slate-400 text-sm">Pelajari cara mengintegrasikan router GateLLM terpadu langsung ke platform atau aplikasi backend produksi Anda.</p>
        </div>
      </div>

      {/* Live Health Status Section */}
      <div className="glass-panel p-5 rounded-xl border border-slate-900 bg-slate-950/20 relative overflow-hidden">
        {/* Background glow shadow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top bar header of health status */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between pb-4 border-b border-slate-900 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <div>
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                Live API Router Health Status
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">Uptime monitor global dan response latency aktual diperbarui berkala.</p>
            </div>
          </div>

          {/* Interactive Filters section */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-500">
              <RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin text-cyan-400" : ""}`} />
              <span className="mr-1 hidden sm:inline">{isScanning ? "Scanning..." : "Auto-sync (6s)"}</span>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="flex-1 sm:flex-initial bg-slate-950/80 text-slate-300 border border-slate-800 rounded px-2.5 py-1.5 text-[10px] uppercase font-bold focus:outline-none focus:border-cyan-500/40 cursor-pointer min-w-[110px]"
              >
                <option value="all">Semua Route</option>
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-initial bg-slate-950/80 text-slate-300 border border-slate-800 rounded px-2.5 py-1.5 text-[10px] uppercase font-bold focus:outline-none focus:border-cyan-500/40 cursor-pointer min-w-[110px]"
              >
                <option value="all">Semua Status</option>
                <option value="Operational">Operational</option>
                <option value="Degraded">Degraded</option>
                <option value="Down">Down</option>
              </select>
            </div>
          </div>
        </div>

        {/* Health status grid cards */}
        {filteredHealth.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
            {filteredHealth.map((item) => {
              const isPinged = copiedSection === `ping-${item.id}`;
              
              const statusColorMap = {
                Operational: {
                  dot: "bg-emerald-500",
                  text: "text-emerald-400",
                  glow: "shadow-[0_0_12px_rgba(16,185,129,0.15)]",
                  bg: "border-slate-900 hover:border-emerald-500/30"
                },
                Degraded: {
                  dot: "bg-amber-500",
                  text: "text-amber-400",
                  glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
                  bg: "border-amber-500/20 hover:border-amber-500/40"
                },
                Down: {
                  dot: "bg-red-500",
                  text: "text-red-400",
                  glow: "shadow-[0_0_12px_rgba(239,68,68,0.15)]",
                  bg: "border-red-500/20 hover:border-red-500/40"
                }
              }[item.status] || {
                dot: "bg-slate-500",
                text: "text-slate-400",
                glow: "",
                bg: "border-slate-900"
              };

              return (
                <div 
                  key={item.id} 
                  className={`bg-slate-900/40 border rounded-lg p-4 space-y-3 transition relative flex flex-col justify-between ${statusColorMap.bg} ${statusColorMap.glow}`}
                >
                  {/* Header item: route name & operational indicator */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold font-mono text-white block truncate" title={item.name}>{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono block truncate" title={item.provider}>{item.provider}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <span className={`flex h-1.5 w-1.5 rounded-full ${statusColorMap.dot} animate-pulse`}></span>
                      <span className={`text-[10px] font-mono uppercase font-bold whitespace-nowrap ${statusColorMap.text}`}>{item.status}</span>
                    </div>
                  </div>

                  {/* Main Metrics Row (Uptime, Latency) */}
                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-900/60 font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Uptime</span>
                      <span className="text-sm font-bold text-slate-200">{item.uptime}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Latency</span>
                      <span className={`text-sm font-bold flex items-center justify-end gap-1 ${
                        item.status === 'Operational' ? 'text-cyan-400' :
                        item.status === 'Degraded' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        <Activity className="w-3.5 h-3.5 opacity-70 animate-pulse" />
                        {item.latency} ms
                      </span>
                    </div>
                  </div>

                  {/* Timeline status bar lights */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>12j lalu</span>
                      <span>Aktif</span>
                    </div>
                    <div className="flex gap-1">
                      {item.history.map((h, i) => (
                        <div 
                          key={i}
                          className={`h-2.5 flex-1 rounded-[1px] transition-all duration-300 ${
                            item.status === 'Operational' ? "bg-emerald-500/85 hover:bg-emerald-400" :
                            item.status === 'Degraded' ? "bg-amber-500/85 hover:bg-amber-400" : "bg-red-500/85 hover:bg-red-400"
                          }`}
                          title={`Hourly uptime checking: ${item.status}`}
                        ></div>
                      ))}
                    </div>
                  </div>

                  {/* Control buttons & quick simulation toggle */}
                  <div className="space-y-2.5 pt-1 font-mono">
                    <button
                      type="button"
                      onClick={() => handleManualPing(item.id)}
                      className={`w-full py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] transition-all flex items-center justify-center gap-1.5 mt-1 shrink-0 ${isPinged ? "bg-cyan-950/40 border-cyan-500/20 text-cyan-400" : ""}`}
                    >
                      {isPinged ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Done (Teruji!)
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-2.5 h-2.5 opacity-70" />
                          Lakukan Ping Router Test
                        </>
                      )}
                    </button>

                    {/* Quick Simulator Switch for testing filters */}
                    <div className="flex items-center justify-between text-[9px] border-t border-slate-900/50 pt-2 text-slate-500">
                      <span className="uppercase tracking-wider">Status Simulasi (Uji Filter)</span>
                      <select
                        value={item.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as "Operational" | "Degraded" | "Down";
                          setProviderHealth(prev => prev.map(p => p.id === item.id ? { ...p, status: newStatus } : p));
                        }}
                        className="bg-slate-950 text-slate-400 border border-slate-800 rounded px-1 py-0.5 text-[9px] focus:outline-none focus:border-cyan-500/40 cursor-pointer text-right"
                      >
                        <option value="Operational">Operational</option>
                        <option value="Degraded">Degraded</option>
                        <option value="Down">Down</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center font-mono space-y-3">
            <BadgeAlert className="w-8 h-8 text-slate-600 animate-pulse" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-300">Tidak ada router yang cocok</p>
              <p className="text-[10px] text-slate-500">Sesuaikan filter provider atau status Anda untuk menampilkan data kembali.</p>
            </div>
            <button
              onClick={() => {
                setProviderFilter("all");
                setStatusFilter("all");
              }}
              className="px-3 py-1 bg-slate-900 border border-slate-800 text-[10px] font-bold uppercase rounded text-cyan-400 hover:text-white transition mt-2"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-slate-900 gap-1 sm:gap-2 font-mono text-xs overflow-x-auto pb-px scrollbar-none">
        <button
          onClick={() => setActiveTab("quickstart")}
          className={`pb-3 px-3 sm:px-4 transition shrink-0 ${activeTab === "quickstart" ? "text-cyan-400 border-b-2 border-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <BookOpen className="w-3.5 h-3.5" />
            Panduan Quickstart
          </span>
        </button>
        <button
          onClick={() => setActiveTab("endpoints")}
          className={`pb-3 px-3 sm:px-4 transition shrink-0 ${activeTab === "endpoints" ? "text-cyan-400 border-b-2 border-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Server className="w-3.5 h-3.5" />
            Referensi Endpoint API
          </span>
        </button>
        <button
          onClick={() => setActiveTab("errors")}
          className={`pb-3 px-3 sm:px-4 transition shrink-0 ${activeTab === "errors" ? "text-cyan-400 border-b-2 border-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <BadgeAlert className="w-3.5 h-3.5" />
            Error & Status Codes
          </span>
        </button>
      </div>

      {/* QUICKSTART SECTION */}
      {activeTab === "quickstart" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Detailed instruction checklist (Left side, Col Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2 uppercase tracking-wider">
                <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
                Mengapa GateLLM?
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                GateLLM menyediakan **API gateway tunggal** yang memungkikan pengembang memanggil LLM tercanggih di industri tanpa mendaftar di masing-masing platform. Anda hanya perlu mendepositkan saldo (prepaid Rupiah), membuat API Key, lalu panggil router kami.
              </p>

              {/* 3 Step Tutorial Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 font-sans">
                <div className="p-4 bg-slate-900/60 border border-slate-900 rounded-lg space-y-1.5 hover:border-cyan-500/10 transition">
                  <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-mono text-xs font-bold">1</div>
                  <h4 className="text-xs font-bold text-white">Deposit Saldo</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">Lakukan isi ulang saldo wallet pengujian Anda di tab Billing instan via QRIS.</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-900 rounded-lg space-y-1.5 hover:border-cyan-500/10 transition">
                  <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-mono text-xs font-bold">2</div>
                  <h4 className="text-xs font-bold text-white">Buat Kredensial</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">Hasilkan API token aman di bawah lingkup tab API Credentials.</p>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-900 rounded-lg space-y-1.5 hover:border-cyan-500/10 transition">
                  <div className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-mono text-xs font-bold">3</div>
                  <h4 className="text-xs font-bold text-white">Lakukan Request</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">Panggil endpoint dan mulai nikmati biaya rendah berdasar token.</p>
                </div>
              </div>
            </div>

            {/* Quickstart Code Simulator Snippets */}
            <div className="glass-panel rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-900 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-white font-bold">Integrasi Kode Instan</span>
                </div>

                {/* Language buttons selector */}
                <div className="flex flex-wrap gap-1 bg-slate-900/80 p-0.5 rounded-md border border-slate-800 self-start sm:self-auto">
                  {(["curl", "javascript", "python", "python-sdk"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-2 py-1 rounded text-[10px] uppercase font-bold transition whitespace-nowrap ${selectedLanguage === lang ? "bg-cyan-500 text-slate-950" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      {lang === "python-sdk" ? "openai sdk" : lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Styled Code Box */}
              <div className="p-5 bg-slate-950/80 relative font-mono text-xs text-slate-300 min-h-[160px] overflow-x-auto select-all">
                <button
                  type="button"
                  onClick={() => handleCopyCode(codeSnippets[selectedLanguage], "quickcode")}
                  className="absolute right-3.5 top-3.5 p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white transition"
                  title="Copy Code"
                >
                  {copiedSection === "quickcode" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <pre className="whitespace-pre">{codeSnippets[selectedLanguage]}</pre>
              </div>
            </div>
          </div>

          {/* Quick Specifications sidebar parameters */}
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-xl space-y-4">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-b-slate-900">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                Keamanan & Token
              </div>

              <div className="space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
                <div>
                  <h4 className="font-mono text-[11px] font-bold text-slate-400 block uppercase">Base URL API</h4>
                  <code className="text-cyan-400 font-mono text-[11px] block mt-1 bg-slate-900 p-2 rounded border border-slate-900 shadow-inner select-all break-all">https://api.gatellm.id/v1</code>
                </div>

                <div>
                  <h4 className="font-mono text-[11px] font-bold text-slate-400 block uppercase mb-1">Skema Autentikasi</h4>
                  <p>Sertakan API Key dalam setiap header dengan format standard bearer token:</p>
                  <code className="text-amber-500 font-mono text-[11px] block mt-1.5 bg-slate-900 p-2 rounded border border-slate-900 break-all leading-normal">Authorization: Bearer YOUR_GLM_API_KEY</code>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-500/10 rounded-lg flex gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400">Gunakan API Key yang digenerate di GateLLM Console. Jangan pernah membeberkan token ini pada frontend client publik browser.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* REFERENSI ENDPOINT SECTION */}
      {activeTab === "endpoints" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Mini left sidebar: list of endpoints menu selection */}
          <div className="lg:col-span-1 glass-panel p-3 rounded-xl space-y-1.5 font-mono">
            <span className="text-[10px] text-slate-500 font-bold block uppercase px-2 mb-2">Pilih Endpoint</span>
            <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none lg:overflow-x-visible">
              <button
                onClick={() => setSelectedEndpoint("chat")}
                className={`flex-1 lg:flex-initial text-left p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs transition min-w-[145px] lg:min-w-0 ${selectedEndpoint === "chat" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 font-bold animate-pulse-subtle" : "text-slate-400 hover:text-white border border-transparent"}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-400 rounded text-[9px] font-bold border border-cyan-500/10 shrink-0">POST</span>
                  <span className="truncate">/chat/completions</span>
                </span>
                <ChevronRight className="w-3 h-3 shrink-0 hidden lg:block" />
              </button>

              <button
                onClick={() => setSelectedEndpoint("models")}
                className={`flex-1 lg:flex-initial text-left p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs transition min-w-[145px] lg:min-w-0 ${selectedEndpoint === "models" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 font-bold" : "text-slate-400 hover:text-white border border-transparent"}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 bg-slate-900 text-purple-400 rounded text-[9px] font-bold border border-slate-800 shrink-0">GET</span>
                  <span className="truncate">/models</span>
                </span>
                <ChevronRight className="w-3 h-3 shrink-0 hidden lg:block" />
              </button>

              <button
                onClick={() => setSelectedEndpoint("balance")}
                className={`flex-1 lg:flex-initial text-left p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs transition min-w-[145px] lg:min-w-0 ${selectedEndpoint === "balance" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 font-bold" : "text-slate-400 hover:text-white border border-transparent"}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 bg-slate-900 text-emerald-400 rounded text-[9px] font-bold border border-slate-800 shrink-0">GET</span>
                  <span className="truncate">/balance</span>
                </span>
                <ChevronRight className="w-3 h-3 shrink-0 hidden lg:block" />
              </button>
            </div>
          </div>

          {/* Endpoint Details Area (Col Span 3) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="glass-panel p-6 rounded-xl space-y-5">
              
              {/* Method and path layout */}
              <div className="flex flex-wrap items-center gap-2.5 pb-4 border-b border-slate-900">
                <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${endpoints[selectedEndpoint].method === "POST" ? "bg-cyan-500 text-slate-950" : "bg-slate-950 border border-slate-950 text-cyan-400"}`}>
                  {endpoints[selectedEndpoint].method}
                </span>
                <code className="text-xs sm:text-sm font-mono font-bold text-white select-all break-all">{endpoints[selectedEndpoint].path}</code>
                <span className="text-[10px] font-mono text-slate-500 uppercase md:ml-auto">Protected via BearerToken</span>
              </div>

              {/* Endpoint Summary */}
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{endpoints[selectedEndpoint].description}</p>

              {/* Table of Headers */}
              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">Required HTTP Headers</h4>
                <div className="overflow-x-auto border border-slate-900 rounded-lg">
                  <table className="w-full text-left text-xs font-mono min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-950 text-slate-500 border-b border-slate-900">
                        <th className="p-3 w-[25%] min-w-[120px]">HEADER NAME</th>
                        <th className="p-3 w-[35%] min-w-[180px]">MOCK/EXAMPLE VALUE</th>
                        <th className="p-3 w-[40%]">KETERANGAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-slate-300">
                      {endpoints[selectedEndpoint].headers.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-950/20">
                          <td className="p-3 text-cyan-400 break-all align-top">{h.key}</td>
                          <td className="p-3 text-white select-all break-all font-semibold align-top">{h.value}</td>
                          <td className="p-3 text-slate-400 text-[11px] leading-relaxed align-top">{h.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Request JSON Schema, if available */}
              {endpoints[selectedEndpoint].requestBody && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">Request Payload (JSON Body)</h4>
                    <span className="text-[9px] font-mono text-slate-600">application/json</span>
                  </div>
                  <div className="p-4 bg-slate-950/80 rounded-xl relative border border-slate-900/80 font-mono text-xs text-slate-300 overflow-x-auto select-all min-h-[140px]">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(endpoints[selectedEndpoint].requestBody || "", "reqbody")}
                      className="absolute right-3 top-3 p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-500 hover:text-white transition"
                      title="Copy JSON Payload"
                    >
                      {copiedSection === "reqbody" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <pre className="whitespace-pre">{endpoints[selectedEndpoint].requestBody}</pre>
                  </div>
                </div>
              )}

              {/* Response JSON Schema representation */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider font-sans">JSON Response Body Structure (HTTP 200 OK)</h4>
                  <span className="text-[9px] font-mono text-slate-600">application/json</span>
                </div>
                <div className="p-4 bg-slate-950/80 rounded-xl relative border border-slate-900/80 font-mono text-xs text-emerald-300/90 overflow-x-auto select-all min-h-[140px]">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(endpoints[selectedEndpoint].responseBody, "respbody")}
                    className="absolute right-3 top-3 p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-500 hover:text-white transition"
                    title="Copy Response JSON"
                  >
                    {copiedSection === "respbody" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <pre className="whitespace-pre">{endpoints[selectedEndpoint].responseBody}</pre>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ERROR CODES SECTION */}
      {activeTab === "errors" && (
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-900 bg-slate-950/40">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Kode Respons Gagal & Status Deteksi
            </h3>
            <p className="text-slate-400 text-xs mt-1">Gunakan kode status HTTP standard ini untuk menganalisis kegagalan request dalam alur transaksi API Anda.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono min-w-[650px] table-fixed">
              <thead>
                <tr className="bg-slate-950 text-slate-500 border-b border-slate-900">
                  <th className="p-4 px-5 w-[20%] text-left">HTTP CODE</th>
                  <th className="p-4 px-5 w-[22%] text-left">ERROR REASON</th>
                  <th className="p-4 px-5 w-[30%] text-left">DEKSRIPSI MASALAH</th>
                  <th className="p-4 px-5 w-[28%] text-left font-sans">REKOMENDASI SOLUSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-300">
                <tr className="hover:bg-slate-950/30">
                  <td className="p-4 px-5 text-red-400 font-bold align-top">400 Bad Request</td>
                  <td className="p-4 px-5 text-white font-medium align-top break-words">Invalid Request Payload</td>
                  <td className="p-4 px-5 text-slate-400 leading-relaxed align-top break-words">JSON payload rusak, format percakapan salah, parameter `temperature` berada di luar range, dll.</td>
                  <td className="p-4 px-5 text-slate-200 align-top break-words leading-relaxed font-sans">Periksa kembali struktur payload JSON string kiriman Anda agar sesuai spesifikasi skema di tab referensi kami.</td>
                </tr>
                <tr className="hover:bg-slate-950/30">
                  <td className="p-4 px-5 text-red-400 font-bold align-top">401 Unauthorized</td>
                  <td className="p-4 px-5 text-white font-medium align-top break-words">Invalid API Key</td>
                  <td className="p-4 px-5 text-slate-400 leading-relaxed align-top break-words">Header authorization tidak disertakan atau token `bearer` yang dikirim tidak lagi valid (telah di-revoke).</td>
                  <td className="p-4 px-5 text-slate-200 align-top break-words leading-relaxed font-sans">Integrasikan token `glm_prod_...` yang valid dan pastikan status token tersebut tertulis "Active".</td>
                </tr>
                <tr className="hover:bg-slate-950/30">
                  <td className="p-4 px-5 text-red-400 font-bold align-top">402 Payment Required</td>
                  <td className="p-4 px-5 text-white font-medium align-top break-words">Balance Is Depleted</td>
                  <td className="p-4 px-5 text-slate-400 leading-relaxed align-top break-words">Saldo dompet developer Anda berada di bawah batas minimum (atau Rp 0) untuk model yang bersangkutan.</td>
                  <td className="p-4 px-5 text-slate-200 align-top break-words leading-relaxed font-sans">Lakukan penambahan dana secara instan di tab Billing untuk menyalakan kembali transmisi request Anda.</td>
                </tr>
                <tr className="hover:bg-slate-950/30">
                  <td className="p-4 px-5 text-amber-500 font-bold align-top">429 Too Many Requests</td>
                  <td className="p-4 px-5 text-white font-medium align-top break-words">Rate Limit Exceeded</td>
                  <td className="p-4 px-5 text-slate-400 leading-relaxed align-top break-words">Kecepatan pengiriman permintaan melebihi batas (rate limit) akun Anda (misal, 60 requests per menit).</td>
                  <td className="p-4 px-5 text-slate-200 align-top break-words leading-relaxed font-sans">Kurangi intensitas request per detik atau berikan jeda penanganan back-off algoritma eksponensial.</td>
                </tr>
                <tr className="hover:bg-slate-950/30">
                  <td className="p-4 px-5 text-red-500 font-bold align-top">502 Bad Gateway</td>
                  <td className="p-4 px-5 text-white font-medium align-top break-words">Router Connection Error</td>
                  <td className="p-4 px-5 text-slate-400 leading-relaxed align-top break-words">Provider upstream asli (seperti OpenAI atau Anthropic) sedang mengalami kendala teknis atau timeout internal.</td>
                  <td className="p-4 px-5 text-slate-200 align-top break-words leading-relaxed font-sans">Atur alternatif endpoint lain di GateLLM router (misalnya beralih instan ke Google Gemini series).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
