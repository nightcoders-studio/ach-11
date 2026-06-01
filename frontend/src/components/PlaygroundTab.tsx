import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Send, 
  Terminal, 
  RefreshCw, 
  Sliders, 
  User, 
  Zap,
  Coins,
  AlertCircle,
  CheckCircle2,
  WifiOff,
  Key
} from "lucide-react";
import { UserSession, UsageLog } from "../types";
import { supabase } from "../lib/supabase";

interface PlaygroundTabProps {
  session: UserSession;
  onUpdateSession: (newSession: UserSession) => void;
  onAddUsageLog: (log: UsageLog) => void;
  onRefreshBalance: () => Promise<void>;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  isError?: boolean;
}

type BackendStatus = "checking" | "online" | "offline";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const AVAILABLE_MODELS = [
  { group: "OpenRouter Free (Direkomendasikan)", models: [
    { id: "openrouter/google/gemini-2.0-flash-lite-preview-02-05:free", label: "Gemini 2.0 Flash Lite — Free" },
    { id: "openrouter/meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B — Free" },
    { id: "openrouter/nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B — Free" },
    { id: "openrouter/google/gemma-4-31b-it:free", label: "Google Gemma 4 31B — Free" },
    { id: "openrouter/google/gemma-4-26b-a4b-it:free", label: "Google Gemma 4 26B — Free" },
    { id: "openrouter/qwen/qwen3-coder:free", label: "Qwen 3 Coder — Free" },
    { id: "openrouter/openai/gpt-oss-120b:free", label: "GPT OSS 120B — Free" },
    { id: "openrouter/liquid/lfm-2.5-1.2b-thinking:free", label: "LFM 2.5 Thinking — Free" },
    { id: "openrouter/poolside/laguna-m.1:free", label: "Poolside Laguna M.1 — Free" },
  ]},
  { group: "Premium (Memerlukan Saldo)", models: [
    { id: "gemini/gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { id: "gemini/gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { id: "openai/gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
    { id: "lmstudio/liquid/lfm2.5-1.2b", label: "Liquid LFM 2.5 1.2B (LM Studio)" },
  ]},
];

export default function PlaygroundTab({ session, onUpdateSession, onAddUsageLog, onRefreshBalance }: PlaygroundTabProps) {
  const [model, setModel] = useState<string>("lmstudio/liquid/lfm2.5-1.2b");
  const [systemPrompt, setSystemPrompt] = useState("Anda adalah asisten AI teknis. Jawab dengan ringkas dalam bahasa Indonesia.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens] = useState(2048);

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Saya adalah API Proxy Playground GateLLM. Di sini Anda bisa menguji fungsionalitas LLM Router kami secara langsung menggunakan API Key GateLLM Anda!" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [apiKeyName, setApiKeyName] = useState<string>("");
  const [keyError, setKeyError] = useState<string>("");
  const [manualKeyInput, setManualKeyInput] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cek health backend
  const checkBackend = useCallback(async () => {
    setBackendStatus("checking");
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
      setBackendStatus(res.ok ? "online" : "offline");
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => { checkBackend(); }, [checkBackend]);

  // Ambil API Key aktif via dashboard endpoint
  const fetchActiveApiKey = useCallback(async () => {
    setKeyError("");
    try {
      const { data: { session: sbSession } } = await supabase.auth.getSession();
      if (!sbSession?.access_token) {
        setKeyError("Sesi tidak ditemukan. Silakan login ulang.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/dashboard/api-keys`, {
        headers: { "Authorization": `Bearer ${sbSession.access_token}` }
      });

      if (!res.ok) {
        setKeyError("Gagal mengambil daftar API Key.");
        return;
      }

      const keys: { id: string; name: string; key_prefix: string; status: string }[] = await res.json();
      const activeKey = keys.find(k => k.status === "active");

      if (!activeKey) {
        setKeyError("Belum ada API Key aktif. Buat di tab API Credentials lalu paste raw key di kolom override.");
        return;
      }

      setApiKeyName(activeKey.name);

      // Cek sessionStorage (disimpan saat user generate key baru di ApiKeysTab)
      const stored = sessionStorage.getItem(`glm_raw_${activeKey.id}`);
      if (stored) {
        setActiveApiKey(stored);
        return;
      }

      setKeyError(`Key "${activeKey.name}" (${activeKey.key_prefix}••••) ditemukan. Paste raw key di kolom override di bawah untuk menggunakan Playground.`);
    } catch (e: any) {
      setKeyError(`Error: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    if (backendStatus === "online") fetchActiveApiKey();
  }, [backendStatus, fetchActiveApiKey]);

  const handleManualKeyChange = (val: string) => {
    setManualKeyInput(val);
    const trimmed = val.trim();
    
    if (trimmed.includes("•") || trimmed.includes("bullet")) {
      setActiveApiKey(null);
      setKeyError("⚠️ Kunci tidak valid: Anda memasukkan Kunci Masked yang disensor (mengandung '•'). Silakan masukkan Kunci API asli (Raw Key) yang Anda salin saat awal pembuatan key.");
    } else if (trimmed.startsWith("glm_") && trimmed.length > 10) {
      setActiveApiKey(trimmed);
      setApiKeyName("Manual Override");
      setKeyError("");
    } else if (trimmed === "") {
      setActiveApiKey(null);
      fetchActiveApiKey();
    } else if (trimmed.length > 0) {
      setActiveApiKey(null);
      setKeyError("⚠️ Format Kunci salah: API Key GateLLM yang valid harus diawali dengan 'glm_'");
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isStreaming) return;

    if (backendStatus === "offline") {
      setMessages(prev => [...prev, {
        role: "assistant",
        isError: true,
        content: `❌ Backend GateLLM tidak dapat dijangkau di ${API_BASE_URL}.\n\nJalankan backend:\n  cd backend\n  venv\\Scripts\\activate\n  uvicorn app.main:app --reload --port 8000`
      }]);
      return;
    }

    if (!activeApiKey) {
      setMessages(prev => [...prev, {
        role: "assistant",
        isError: true,
        content: keyError || "⚠️ Tidak ada API Key aktif.\n\n1. Pergi ke tab API Credentials\n2. Buat API Key baru\n3. Salin raw key (glm_xxx...)\n4. Paste di kolom API Key Override di sidebar kiri"
      }]);
      return;
    }

    setInputVal("");
    const updatedMessages = [...messages.filter(m => !m.isError), { role: "user", content: trimmed } as Message];
    setMessages(updatedMessages);
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeApiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...updatedMessages
              .filter(m => m.role !== "system")
              .map(m => ({ role: m.role, content: m.content }))
          ],
          stream: true,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try { const j = await response.json(); msg = j.message || j.detail || msg; } catch {}
        throw new Error(msg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantText = "";
      let buf = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]" || data === "") continue;
          if (data.startsWith("[ERROR]")) {
            try { const e = JSON.parse(data.slice(7)); throw new Error(e.message || "Stream error"); } catch (se: any) { throw se; }
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) {
              assistantText += delta;
              setMessages(prev => {
                const c = [...prev];
                c[c.length - 1] = { role: "assistant", content: assistantText };
                return c;
              });
            }
          } catch { /* skip malformed */ }
        }
      }

      const latencyMs = Date.now() - startTime;
      const inputTokens = Math.ceil(trimmed.length / 4);
      const outputTokens = Math.ceil(assistantText.length / 4);

      onAddUsageLog({
        id: `pg-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString().substring(0, 19).replace("T", " "),
        modelName: model,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        costDeducted: model.endsWith(":free") ? 0 : Math.ceil((inputTokens + outputTokens) * 0.001 * 16000),
        latencyMs,
        status: "Success"
      });

    } catch (error: any) {
      console.error("Playground error:", error);
      setMessages(prev => {
        const c = [...prev];
        c[c.length - 1] = {
          role: "assistant",
          isError: true,
          content: `❌ Gagal menghubungi API Gateway:\n\n${error.message || "Unknown error"}\n\nPastikan backend berjalan dan API Key valid.`
        };
        return c;
      });
    } finally {
      setIsStreaming(false);
      // Polling saldo terbaru dari database setelah setiap request selesai
      try {
        await onRefreshBalance();
      } catch (e) {
        console.warn("Gagal refresh saldo:", e);
      }
    }
  };

  const handleClear = () => setMessages([{
    role: "assistant",
    content: "Chat di-reset. Silakan mulai percakapan baru!"
  }]);

  const StatusBadge = () => {
    if (backendStatus === "checking") return (
      <span className="flex items-center gap-1 text-yellow-400 text-[10px] font-mono font-bold">
        <RefreshCw className="w-3 h-3 animate-spin" /> Connecting...
      </span>
    );
    if (backendStatus === "online") return (
      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono font-bold">
        <CheckCircle2 className="w-3 h-3" /> Backend Online
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-red-400 text-[10px] font-mono font-bold">
        <WifiOff className="w-3 h-3" /> Backend Offline
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch h-auto lg:h-[calc(100vh-12rem)] lg:max-h-[850px] pb-4">

      {/* SIDEBAR KIRI */}
      <div className="glass-panel rounded-xl p-5 flex flex-col gap-4 lg:overflow-y-auto lg:col-span-1 h-auto lg:h-full">

        <div className="flex items-center gap-2 pb-3 border-b border-slate-900">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Konfigurasi Model</h3>
        </div>

        {/* Status Panel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2">
          <StatusBadge />
          {backendStatus === "offline" && (
            <button onClick={checkBackend} className="w-full text-[10px] font-mono text-cyan-400 hover:text-white transition flex items-center justify-center gap-1 mt-1 border border-slate-800 rounded py-1">
              <RefreshCw className="w-3 h-3" /> Coba Reconnect
            </button>
          )}
          {keyError ? (
            <p className="text-[10px] font-mono text-amber-400 leading-relaxed">{keyError}</p>
          ) : activeApiKey ? (
            <p className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Key className="w-3 h-3" /> Key "{apiKeyName}" aktif
            </p>
          ) : null}
        </div>

        {/* API Key Override */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
            <Key className="w-3 h-3" /> API Key Override
          </label>
          <input
            type="password"
            value={manualKeyInput}
            placeholder="glm_xxxxxxxxxxxxxxxxxxxx"
            className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/60 font-mono placeholder-slate-600"
            onChange={(e) => handleManualKeyChange(e.target.value)}
          />
          <p className="text-[9px] text-slate-600 font-mono leading-tight">
            Paste raw key (glm_...) dari tab API Credentials.
          </p>
        </div>

        {/* Model Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Model Endpoint Router</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/60 font-mono"
          >
            {AVAILABLE_MODELS.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.models.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div className="space-y-1.5 pt-2 border-t border-slate-900/40">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase font-bold">
            <span>Temperature</span>
            <span className="text-cyan-400 font-bold">{temperature.toFixed(2)}</span>
          </div>
          <input
            type="range" min="0.1" max="1.2" step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[8px] font-mono text-slate-600">
            <span>Precise</span><span>Creative</span>
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-1.5 pt-2 border-t border-slate-900/40">
          <label className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Instruksi System Prompt</label>
          <textarea
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full p-2.5 bg-slate-900 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/60 font-sans leading-relaxed resize-none"
            placeholder="Berikan instruksi pembatasan watak asisten..."
          />
        </div>

        {/* Reset */}
        <button
          onClick={handleClear}
          className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition font-mono text-xs font-bold flex items-center justify-center gap-1.5 mt-auto shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset Chat History
        </button>
      </div>

      {/* CHAT PANEL KANAN */}
      <div className="lg:col-span-3 glass-panel rounded-xl flex flex-col overflow-hidden h-[550px] lg:h-full">

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-900 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <div className={`w-1.5 h-1.5 rounded-full ${
              backendStatus === "online" ? "bg-emerald-400 animate-pulse"
              : backendStatus === "offline" ? "bg-red-500"
              : "bg-yellow-400 animate-pulse"
            }`} />
            <span className="text-white font-bold uppercase truncate max-w-[140px] sm:max-w-none">
              {model.split("/").pop()} Proxy
            </span>
            <span className="hidden sm:inline text-slate-500">—</span>
            <span className="hidden sm:inline">
              {backendStatus === "online" ? "API Gateway Active"
               : backendStatus === "offline" ? "Gateway Offline"
               : "Connecting..."}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold shrink-0">
            <Coins className="w-3.5 h-3.5" />
            <span>Saldo: {session.balance.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0a0e17]/30 min-h-0">
          {messages.map((msg, idx) => {
            const isAsst = msg.role === "assistant";
            return (
              <div key={idx} className={`flex gap-3 max-w-3xl ${isAsst ? "mr-auto" : "ml-auto flex-row-reverse"}`}>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-lg ${
                  msg.isError ? "bg-red-950/40 border-red-500/20 text-red-400"
                  : isAsst ? "bg-cyan-950/40 border-cyan-500/20 text-cyan-400"
                  : "bg-slate-900 border-slate-800 text-slate-400"
                }`}>
                  {msg.isError ? <AlertCircle className="w-4 h-4" />
                   : isAsst ? <Terminal className="w-4 h-4" />
                   : <User className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-xl text-xs sm:text-sm font-sans leading-relaxed max-w-[calc(100%-3rem)] ${
                  msg.isError ? "bg-red-950/30 text-red-300 border border-red-900/50"
                  : isAsst ? "bg-[#0f172a]/80 text-slate-200 border border-slate-900"
                  : "bg-cyan-500 text-slate-950 font-medium"
                }`}>
                  {isAsst || msg.isError ? (
                    <div className="whitespace-pre-wrap select-text">
                      {msg.content === "" && isStreaming ? (
                        <div className="flex items-center gap-1 py-1 text-slate-500 font-mono text-xs">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Streaming tokens from API proxy...</span>
                        </div>
                      ) : msg.content}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/60 shrink-0">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              required
              disabled={isStreaming || backendStatus === "offline"}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                backendStatus === "offline"
                  ? "⚠️ Backend offline — jalankan uvicorn di port 8000"
                  : isStreaming
                    ? "Harap tunggu, asisten sedang membalas..."
                    : "Kirimkan prompt Anda (contoh: 'Tulis fungsi fibonacci JS')..."
              }
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-lg p-3.5 pr-12 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition font-sans disabled:opacity-50"
              id="input-playground"
            />
            <button
              type="submit"
              disabled={isStreaming || !inputVal.trim() || backendStatus === "offline"}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-md transition ${
                isStreaming || !inputVal.trim() || backendStatus === "offline"
                  ? "text-slate-600 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              }`}
              id="btn-send-playground"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2 font-mono">
            <span>Tekan Enter untuk lekas mengirimkan prompt.</span>
            <span className="text-cyan-500/80 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3" /> Auto-pricing active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
