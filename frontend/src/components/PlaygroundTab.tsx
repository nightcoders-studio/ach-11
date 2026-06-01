import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Terminal, 
  RefreshCw, 
  Sliders, 
  Cpu, 
  User, 
  FileText, 
  CornerDownLeft,
  Sparkles,
  Zap,
  Info,
  Shield,
  Clock,
  Coins
} from "lucide-react";
import { UserSession, UsageLog } from "../types";
import { supabase } from "../lib/supabase";

interface PlaygroundTabProps {
  session: UserSession;
  onUpdateSession: (newSession: UserSession) => void;
  onAddUsageLog: (log: UsageLog) => void;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export default function PlaygroundTab({ session, onUpdateSession, onAddUsageLog }: PlaygroundTabProps) {
  // Config Model states
  const [model, setModel] = useState<string>("openrouter/google/gemini-2.0-flash-lite-preview-02-05:free");
  const [systemPrompt, setSystemPrompt] = useState("Anda adalah asisten AI teknis. Jawab dengan ringkas dalam bahasa Indonesia.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Chat message states
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Saya adalah API Proxy Playground GateLLM. Di sini Anda bisa menguji fungsionalitas LLM Router kami secara langsung menggunakan API Key GateLLM Anda!" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Scroll to bottom helper
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isStreaming) return;

    if (session.balance <= 0 && !model.endsWith(":free")) {
      alert("Saldo Anda habis! Silakan lakukan Top Up di tab Billing untuk melanjutkan pengujian model berbayar.");
      return;
    }

    // Ambil API Key GateLLM aktif dari database
    const { data: keysData } = await supabase
      .from("api_keys")
      .select("key_hash")
      .eq("status", "active")
      .limit(1);

    // Gunakan static testing API key fallback jika user belum memiliki credential
    const userApiKey = keysData && keysData.length > 0 
      ? keysData[0].key_hash 
      : "glm_dev_key_fallback_simulation_playground_3287ac";

    const promptText = inputVal;
    setInputVal("");

    const updatedMessages = [...messages, { role: "user", content: promptText } as Message];
    setMessages(updatedMessages);
    setIsStreaming(true);

    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      
      const response = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userApiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
          ],
          stream: true,
          temperature: temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || "Gagal menghubungi Gateway API");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantResponse = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataContent = line.slice(6).trim();
            if (dataContent === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataContent);
              const deltaContent = parsed.choices[0]?.delta?.content || "";
              if (deltaContent) {
                assistantResponse += deltaContent;
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: assistantResponse };
                  return copy;
                });
              }
            } catch (err) {
              // silent
            }
          }
        }
      }

      // Hitung simulasi token usage
      const inputTokens = Math.ceil(promptText.length / 4.0);
      const outputTokens = Math.ceil(assistantResponse.length / 4.0);

      onAddUsageLog({
        id: `pg-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString().substring(0, 19).replace("T", " "),
        modelName: model,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        costDeducted: model.endsWith(":free") ? 0 : 15,
        latencyMs: 320,
        status: "Success"
      });

    } catch (error: any) {
      console.error("Playground exception:", error);
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { 
          role: "assistant", 
          content: `Maaf, terjadi gangguan koneksi ke API Gateway:\n\n${error.message || "Silakan pastikan server backend berjalan lokal."}` 
        };
        return copy;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClear = () => {
    setMessages([
      { role: "assistant", content: "Chat di-reset ulang. Silakan tanyakan hal teknis baru di sini!" }
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 animate-fade-in items-stretch h-auto lg:h-[calc(100vh-12rem)] lg:max-h-[850px] pb-4">
      
      {/* LEFT COLUMN: Sidebar Model Settings Panel */}
      <div className="glass-panel rounded-xl p-5 flex flex-col justify-between space-y-6 lg:overflow-y-auto lg:col-span-1 h-auto lg:h-full">
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-900">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Konfigurasi Model</h3>
          </div>

          {/* Model Selector Card Group */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Model Endpoint Router</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/60 font-mono"
            >
              <optgroup label="Premium Models (Berbayar)">
                <option value="gemini/gemini-1.5-flash">Gemini 1.5 Flash (Rp 11.200/M)</option>
                <option value="gemini/gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
              </optgroup>
              <optgroup label="OpenRouter Free Models (GRATIS)">
                <option value="openrouter/google/gemini-2.0-flash-lite-preview-02-05:free">Gemini 2.0 Flash Lite Free</option>
                <option value="openrouter/poolside/laguna-m.1:free">Poolside Laguna M.1 Free</option>
                <option value="openrouter/google/gemma-4-26b-a4b-it:free">Google Gemma 4 26B Free</option>
                <option value="openrouter/google/gemma-4-31b-it:free">Google Gemma 4 31B Free</option>
                <option value="openrouter/nvidia/nemotron-3-super-120b-a12b:free">Nvidia Nemotron 3 Super Free</option>
                <option value="openrouter/liquid/lfm-2.5-1.2b-thinking:free">Liquid LFM 2.5 Thinking Free</option>
                <option value="openrouter/nvidia/nemotron-3-nano-30b-a3b:free">Nvidia Nemotron 3 Nano Free</option>
                <option value="openrouter/qwen/qwen3-coder:free">Qwen 3 Coder Free</option>
                <option value="openrouter/meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Free</option>
              </optgroup>
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900/40">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase font-bold">
              <span>Temperature</span>
              <span className="text-cyan-400 font-bold font-mono">{temperature.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="1.2" 
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[8px] font-mono text-slate-600">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          {/* System Prompt TextArea */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900/40">
            <label className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Instruksi System Prompt</label>
            <textarea 
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-900 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/60 font-sans leading-relaxed resize-none"
              placeholder="Berikan instruksi pembatasan watak dan format asisten di sini..."
            />
          </div>
        </div>

        {/* Clear Trigger at bottom of sidebar */}
        <button 
          onClick={handleClear}
          className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition font-mono text-xs font-bold flex items-center justify-center gap-1.5 mt-4 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Chat History
        </button>
      </div>

      {/* RIGHT COLUMN: Interactive Chat Window layout (Col Span 3) */}
      <div className="lg:col-span-3 glass-panel rounded-xl flex flex-col justify-between overflow-hidden items-stretch h-[550px] lg:h-full">
        
        {/* Chat Window Head bar */}
        <div className="px-5 py-3 border-b border-slate-900 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-slate-400 shadow-sm shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-white font-bold uppercase">{model} Proxy</span>
            <span className="hidden sm:inline">-</span>
            <span className="hidden sm:inline text-slate-500">API Gateway Active</span>
          </div>

          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Coins className="w-3.5 h-3.5 animate-pulse" />
            <span>Saldo: {session.balance.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Active messages flow area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0a0e17]/30 min-h-0">
          {messages.map((msg, idx) => {
            const isAsst = msg.role === "assistant";
            return (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-3xl ${isAsst ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                {/* Chat Avatar bubble */}
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-lg ${isAsst ? "bg-cyan-950/40 border-cyan-500/20 text-cyan-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
                  {isAsst ? <Terminal className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Text Bubble body */}
                <div className={`p-4 rounded-xl text-xs sm:text-sm font-sans leading-relaxed ${isAsst ? "bg-[#0f172a]/80 text-slate-200 border border-slate-900" : "bg-cyan-500 text-slate-950 font-medium"}`}>
                  {isAsst ? (
                    <div className="whitespace-pre-wrap select-text markdown-body">
                      {msg.content === "" && isStreaming ? (
                        <div className="flex items-center gap-1 py-1 text-slate-500 font-mono text-xs">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Streaming tokens from API proxy...</span>
                        </div>
                      ) : (
                        msg.content
                      )}
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

        {/* Input prompt controller bar (Shrink 0) */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/60 shrink-0">
          <form onSubmit={handleSend} className="relative">
            <input 
              type="text"
              required
              disabled={isStreaming}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={isStreaming ? "Harap tunggu, asisten sedang membalas..." : "Kirimkan prompt Anda (contoh: 'Tulis fungsi fibonacci JS')..."}
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-lg p-3.5 pr-12 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition font-sans"
              id="input-playground"
            />
            <button 
              type="submit"
              disabled={isStreaming || !inputVal.trim()}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-md transition ${isStreaming || !inputVal.trim() ? "text-slate-600 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"}`}
              id="btn-send-playground"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Prompt tips */}
          <div className="mt-2 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2 font-mono">
            <span>Tekan Enter untuk lekas mengirimkan prompt.</span>
            <span className="text-cyan-500/80 font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> Auto-pricing active</span>
          </div>
        </div>

      </div>

    </div>
  );
}
