import { useState, useEffect } from "react";
import { 
  Terminal, 
  Wallet, 
  Cpu, 
  Activity, 
  Layers, 
  LogOut, 
  ChevronRight, 
  User, 
  Compass, 
  ArrowUpRight,
  Sparkles,
  Zap,
  Volume2,
  BookOpen
} from "lucide-react";
import { ApiKey, UsageLog, Transaction, UserSession } from "./types";
import { 
  initialSession, 
  initialKeys, 
  initialUsageLogs, 
  initialTransactions 
} from "./mockData";
import { supabase } from "./lib/supabase";

import LandingPage from "./components/LandingPage";
import DashboardTab from "./components/DashboardTab";
import ApiKeysTab from "./components/ApiKeysTab";
import PlaygroundTab from "./components/PlaygroundTab";
import BillingTab from "./components/BillingTab";
import UsageTab from "./components/UsageTab";
import DocumentationTab from "./components/DocumentationTab";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function App() {
  // Sync state with Supabase session
  const [session, setSession] = useState<UserSession | null>(null);
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTab, setCurrentTab] = useState<"dashboard" | "api-keys" | "playground" | "billing" | "usage" | "documentation">("dashboard");

  // Sync Supabase Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      if (activeSession) {
        setSupabaseToken(activeSession.access_token);
        // Fetch real balance from database wallet table
        fetchWalletData(activeSession.user.id, activeSession.user.email || "");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      if (activeSession) {
        setSupabaseToken(activeSession.access_token);
        fetchWalletData(activeSession.user.id, activeSession.user.email || "");
      } else {
        setSession(null);
        setSupabaseToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWalletData = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .single();
      
      if (data) {
        setSession({
          name: email.split("@")[0],
          email: email,
          balance: parseFloat(data.balance) * 16000, // simulated IDR rate multiplier
          totalSpent: 0,
          totalTokens: 0
        });
      } else {
        // Fallback default mock
        setSession({
          name: email.split("@")[0],
          email: email,
          balance: 5000,
          totalSpent: 0,
          totalTokens: 0
        });
      }
    } catch (e) {
      console.error("Gagal mengambil data wallet:", e);
    }
  };

  // Fetch API Keys & Usage logs from real DB tables
  useEffect(() => {
    if (!session) return;

    const fetchKeysAndLogs = async () => {
      // 1. Fetch API Keys
      const { data: keys } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
      if (keys) {
        setApiKeys(keys.map(k => ({
          id: k.id,
          name: k.name,
          keyMasked: k.key_prefix + "••••••••••••",
          status: k.status === "active" ? "Active" : "Revoked",
          createdAt: k.created_at.substring(0, 19).replace("T", " "),
          lastUsedAt: k.last_used_at ? k.last_used_at.substring(0, 19).replace("T", " ") : "-"
        })));
      }

      // 2. Fetch Usage Logs
      const { data: logs } = await supabase.from("usage_logs").select("*").order("created_at", { ascending: false });
      if (logs) {
        setUsageLogs(logs.map(l => ({
          id: l.id,
          timestamp: l.created_at.substring(0, 19).replace("T", " "),
          modelName: l.model_name,
          promptTokens: l.prompt_tokens,
          completionTokens: l.completion_tokens,
          costDeducted: Math.ceil(parseFloat(l.cost_deducted) * 16000), // convert simulator rate
          latencyMs: l.latency_ms || 250,
          status: l.status === "success" ? "Success" : "Error"
        })));
      }

      // 3. Fetch Topup Logs
      const { data: topups } = await supabase.from("topup_logs").select("*").order("created_at", { ascending: false });
      if (topups) {
        setTransactions(topups.map(t => ({
          id: t.id.substring(0, 8).toUpperCase(),
          timestamp: t.created_at.substring(0, 19).replace("T", " "),
          description: `Top Up via ${t.method}`,
          amount: Math.ceil(parseFloat(t.amount) * 16000),
          status: t.status === "completed" ? "Success" : "Failed",
          method: t.method
        })));
      }
    };

    fetchKeysAndLogs();

    // Subscribe to real-time wallet update channel
    const walletChannel = supabase
      .channel("schema-db-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets" }, payload => {
        if (payload.new) {
          setSession(prev => prev ? {
            ...prev,
            balance: parseFloat(payload.new.balance) * 16000,
            totalSpent: parseFloat(payload.new.total_spent || 0) * 16000,
            totalTokens: parseFloat(payload.new.total_spent || 0) * 0.08
          } : null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
    };
  }, [session?.email]);

  const handleLogin = (user: UserSession) => {
    setSession(user);
    setCurrentTab("dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setSupabaseToken(null);
  };

  const handleCreateKey = async (name: string): Promise<ApiKey> => {
    if (!supabaseToken) {
      // Fallback local key generation untuk Demo Mode
      const mockKey: ApiKey = {
        id: `key_${Math.random().toString(36).substring(2, 10)}`,
        name: name,
        keyMasked: "glm_mock_" + Math.random().toString(36).substring(2, 6) + "••••••••••••",
        status: "Active",
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        lastUsedAt: "-"
      };
      setApiKeys(prev => [mockKey, ...prev]);
      return { ...mockKey, rawKey: "glm_mock_" + Array.from({length: 24}, () => Math.random().toString(36)[2]).join('') };
    }
    
    // Panggil real API backend
    const res = await fetch(`${API_BASE_URL}/dashboard/api-keys`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });
    
    if (!res.ok) throw new Error("Gagal generate API Key");
    const data = await res.json();
    
    const newKey: ApiKey = {
      id: data.id,
      name: data.name,
      keyMasked: data.key_prefix + "••••••••••••",
      status: "Active",
      createdAt: data.created_at.substring(0, 19).replace("T", " "),
      lastUsedAt: "-"
    };

    setApiKeys(prev => [newKey, ...prev]);
    return { ...newKey, rawKey: data.raw_key };
  };

  const handleRevokeKey = async (id: string) => {
    if (!supabaseToken) {
      // Fallback local key revocation untuk Demo Mode
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: "Revoked" } : k));
      return;
    }

    await fetch(`${API_BASE_URL}/dashboard/api-keys/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${supabaseToken}`
      }
    });

    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: "Revoked" } : k));
  };

  const handleTopUp = async (amount: number, method: string) => {
    if (!session) return;

    if (!supabaseToken) {
      // Fallback local balance top-up untuk Demo Mode
      setSession(prev => prev ? {
        ...prev,
        balance: prev.balance + amount
      } : null);

      const newTr: Transaction = {
        id: `TR-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        description: `Top Up via ${method}`,
        amount: amount,
        status: "Success",
        method: method
      };
      setTransactions(prev => [newTr, ...prev]);
      return;
    }

    // nominal slider ke USD conversion simulator rate
    const usdAmount = amount / 16000;
    console.log(`Sending top-up request to backend: Rp ${amount} (${usdAmount} USD) via ${method}`);

    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/topup`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: usdAmount })
      });

      if (res.ok) {
        const data = await res.json();
        const newBalance = parseFloat(data.balance) * 16000;
        console.log(`Top-up successful! New balance returned: ${data.balance} USD (Rp ${newBalance})`);
        
        setSession(prev => prev ? {
          ...prev,
          balance: newBalance
        } : null);

        // Register transaction locally to reflect instant update
        const newTr: Transaction = {
          id: `TR-${Date.now().toString(36).toUpperCase()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          description: `Top Up via ${method}`,
          amount: amount,
          status: "Success",
          method: method
        };
        setTransactions(prev => [newTr, ...prev]);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Top-up request failed on backend:", res.status, errorData);
        alert(`Gagal top-up: ${errorData.message || "Unknown error"}`);
      }
    } catch (e: any) {
      console.error("Top-up request connection error:", e);
      alert(`Gagal menghubungi API Top Up: ${e.message}`);
    }
  };

  const handleAddUsageLog = (log: UsageLog) => {
    setUsageLogs(prev => [log, ...prev]);
  };

  // Switch rendered child Tab Panel
  const renderActiveTabContent = () => {
    if (!session) return null;
    
    switch (currentTab) {
      case "dashboard":
        return (
          <DashboardTab 
            session={session} 
            usageLogs={usageLogs} 
            onNavigate={(tab) => setCurrentTab(tab)} 
          />
        );
      case "api-keys":
        return (
          <ApiKeysTab 
            apiKeys={apiKeys} 
            onCreateKey={handleCreateKey} 
            onRevokeKey={handleRevokeKey} 
          />
        );
      case "playground":
        return (
          <PlaygroundTab 
            session={session} 
            onUpdateSession={setSession} 
            onAddUsageLog={handleAddUsageLog} 
          />
        );
      case "billing":
        return (
          <BillingTab 
            session={session} 
            transactions={transactions} 
            onTopUp={handleTopUp} 
          />
        );
      case "usage":
        return <UsageTab usageLogs={usageLogs} />;
      case "documentation":
        return <DocumentationTab />;
      default:
        return null;
    }
  };

  // If session is null, display Landing Page (Unsecured site)
  if (!session) {
    return <LandingPage onLogin={handleLogin} />;
  }

  // Otherwise, render full cloud control panel console (Secured console)
  return (
    <div className="min-h-screen bg-[#070b13] text-[#f1f5f9] font-sans flex antialiased selection:bg-cyan-500 selection:text-black">
      {/* Background glow meshes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293706_1px,transparent_1px),linear-gradient(to_bottom,#1f293706_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none"></div>

      {/* LEFT STATIC SIDEBAR - Developer Panel Navigation */}
      <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 hidden md:flex">
        
        {/* Top brand logo block */}
        <div className="space-y-6 flex-1 py-6 flex flex-col justify-start">
          <div className="px-6 flex items-center gap-3 pb-4 border-b border-slate-900">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              <Terminal className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-mono font-black text-lg tracking-tight text-white flex items-center leading-none">
                Gate<span className="text-cyan-400">LLM</span>
              </span>
              <span className="text-[9px] text-slate-500 font-mono tracking-wider block uppercase mt-1">Console Panel v1.0</span>
            </div>
          </div>

          {/* Quick Balance display widget */}
          <div className="px-4 mx-2.5">
            <div className="bg-[#0b0f19] border border-slate-900 rounded-xl p-3.5 space-y-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none"></div>
              <span className="text-[10px] uppercase font-mono text-slate-500 block font-bold">PREPAID CREDIT:</span>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className="text-sm font-mono font-bold text-white leading-none">
                  Rp {session.balance.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <button 
                onClick={() => setCurrentTab("billing")}
                className="w-full mt-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-500/30 font-mono text-[9px] font-bold text-cyan-400 rounded-md transition text-center flex items-center justify-center gap-1"
              >
                + Top Up Wallet <ArrowUpRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Nav Item selectors */}
          <nav className="space-y-1.5 px-3">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition duration-200 outline-none ${currentTab === "dashboard" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400 hover:text-white"}`}
            >
              <span className="flex items-center gap-3">
                <Compass className="w-4 h-4 shrink-0" />
                <span>Overview Dashboard</span>
              </span>
              {currentTab === "dashboard" && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>

            <button
              onClick={() => setCurrentTab("api-keys")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition duration-200 outline-none ${currentTab === "api-keys" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400 hover:text-white"}`}
              id="nav-api-keys"
            >
              <span className="flex items-center gap-3">
                <Layers className="w-4 h-4 shrink-0" />
                <span>API Credentials</span>
              </span>
              {currentTab === "api-keys" && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>

            <button
              onClick={() => setCurrentTab("playground")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition duration-200 outline-none ${currentTab === "playground" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400 hover:text-white"}`}
              id="nav-playground"
            >
              <span className="flex items-center gap-3">
                <Terminal className="w-4 h-4 shrink-0" />
                <span>AI API Playground</span>
              </span>
              {currentTab === "playground" && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>

            <button
              onClick={() => setCurrentTab("billing")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition duration-200 outline-none ${currentTab === "billing" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400 hover:text-white"}`}
              id="nav-billing"
            >
              <span className="flex items-center gap-3">
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Billing / Wallet</span>
              </span>
              {currentTab === "billing" && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>

            <button
              onClick={() => setCurrentTab("usage")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition duration-200 outline-none ${currentTab === "usage" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400 hover:text-white"}`}
              id="nav-usage"
            >
              <span className="flex items-center gap-3">
                <Activity className="w-4 h-4 shrink-0" />
                <span>Usage & Logs</span>
              </span>
              {currentTab === "usage" && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>

            <button
              onClick={() => setCurrentTab("documentation")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition duration-200 outline-none ${currentTab === "documentation" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400 hover:text-white"}`}
              id="nav-documentation"
            >
              <span className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>API Reference</span>
              </span>
              {currentTab === "documentation" && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </nav>
        </div>

        {/* Profiles Footer block / sign out helper */}
        <div className="p-4 border-t border-slate-950 bg-slate-950 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold font-mono">
              {session.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold font-mono text-white block truncate leading-none mb-1">{session.name}</span>
              <span className="text-[10px] text-slate-500 block truncate leading-none">{session.email}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleLogout}
            className="w-full py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center gap-1.5"
            id="btn-logout"
          >
            <LogOut className="w-3 h-3 text-red-500" />
            Keluar (Sign Out)
          </button>
        </div>
      </aside>

      {/* PRIMARY CONTROLLER RIGHT VIEW AREA */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen">
        
        {/* Mobile Navbar Header */}
        <header className="px-5 py-3.5 bg-slate-950 border-b border-slate-900 flex md:hidden items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-bold text-white text-sm">GateLLM Console</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Saldo: {session.balance.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <button 
              onClick={handleLogout}
              className="p-1 hover:text-white transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </header>

        {/* Mobile quick tab bar selector */}
        <div className="bg-slate-950/80 border-b border-slate-900/60 p-1 flex md:hidden gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button 
            onClick={() => setCurrentTab("dashboard")} 
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shrink-0 transition ${currentTab === "dashboard" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400"}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setCurrentTab("api-keys")} 
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shrink-0 transition ${currentTab === "api-keys" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400"}`}
          >
            API Credentials
          </button>
          <button 
            onClick={() => setCurrentTab("playground")} 
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shrink-0 transition ${currentTab === "playground" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400"}`}
          >
            Playground
          </button>
          <button 
            onClick={() => setCurrentTab("billing")} 
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shrink-0 transition ${currentTab === "billing" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400"}`}
          >
            Billing
          </button>
          <button 
            onClick={() => setCurrentTab("usage")} 
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shrink-0 transition ${currentTab === "usage" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400"}`}
          >
            Analytics
          </button>
          <button 
            onClick={() => setCurrentTab("documentation")} 
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shrink-0 transition ${currentTab === "documentation" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" : "text-slate-400"}`}
          >
            API Docs
          </button>
        </div>

        {/* Main Render contents viewport */}
        <section className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-0 relative">
          {renderActiveTabContent()}
        </section>
      </main>
    </div>
  );
}
