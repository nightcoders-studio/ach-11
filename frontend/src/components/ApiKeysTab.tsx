import React, { useState } from "react";
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { ApiKey } from "../types";

interface ApiKeysTabProps {
  apiKeys: ApiKey[];
  onCreateKey: (name: string) => Promise<ApiKey>;
  onRevokeKey: (id: string) => void;
}

export default function ApiKeysTab({ apiKeys, onCreateKey, onRevokeKey }: ApiKeysTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<Required<ApiKey> | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      const key = await onCreateKey(keyName);
      
      // Show the raw generated key once inside the modal!
      setNewlyCreatedKey({
        ...key,
        rawKey: key.rawKey || `glm_prod_` + Array.from({length: 24}, () => Math.random().toString(36)[2]).join('')
      });
      
      setKeyName("");
    } catch (err) {
      console.error("Gagal membuat API Key:", err);
      alert("Gagal membuat API Key. Silakan coba kembali.");
    }
  };

  const copyKeyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyRawText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const closeModal = () => {
    setModalOpen(false);
    setNewlyCreatedKey(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section with Create actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Manajemen API Credentials</h1>
          <p className="text-slate-400 text-sm">Gunakan API Key berikut untuk mengautentikasi request dalam aplikasi backend atau server Anda.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-sm rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_15px_rgba(6,182,212,0.45)] transition flex items-center justify-center gap-2 self-start sm:self-auto"
          id="btn-create-key"
        >
          <Plus className="w-4 h-4" />
          Generate New Key
        </button>
      </div>

      {/* Warning Box */}
      <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl flex gap-3.5 text-xs text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold font-mono">Keamanan Credential Tingkat Tinggi (CRITICAL WARNING)</span>
          <p className="leading-relaxed text-slate-400">
            Kunci API KedaiAI memberikan akses tak bebas hambatan ke saldo wallet Anda. Jangan pernah menyimpan API metrics di kode frontend browser klien. 
            Direkomendasikan melakukan parsing value API keys di server-side backend wrapper (Express, NextJS API route, Django, dll).
          </p>
        </div>
      </div>

      {/* Main Table List */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-900 bg-slate-950/40 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold font-mono text-white">Daftar API Keys Aktif</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400">
                <th className="py-4 px-5 font-medium">NAMA KUNCI API</th>
                <th className="py-4 px-5 font-medium">KUNCI VALUE MASKED</th>
                <th className="py-4 px-5 font-medium">TANGGAL DIBUAT</th>
                <th className="py-4 px-5 font-medium">TERAKHIR DIGUNAKAN</th>
                <th className="py-4 px-5 font-medium text-center">STATUS</th>
                <th className="py-4 px-5 font-medium text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-950/40 transition">
                  <td className="py-4 px-5">
                    <span className="font-bold text-white text-sm block">{key.name}</span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-900 px-2 py-1 rounded text-slate-400 font-mono text-[11px] border border-slate-900">{key.keyMasked}</code>
                      {key.status === "Active" && (
                        <button 
                          onClick={() => copyKeyText(key.keyMasked, key.id)}
                          className="p-1 hover:text-white text-slate-500 transition"
                          title="Copy Masked Key"
                        >
                          {copiedId === key.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-slate-400/80">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {key.createdAt}</span>
                  </td>
                  <td className="py-4 px-5 text-slate-400/80">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {key.lastUsedAt || "Belum digunakan"}</span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    {key.status === "Active" ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-950/30 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/10">
                        <CheckCircle className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-900 text-slate-500 px-2.5 py-0.5 rounded-full text-[10px] border border-slate-800">
                        <XCircle className="w-3 h-3" /> Revoked
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-center">
                    {key.status === "Active" ? (
                      <button 
                        onClick={() => {
                          onRevokeKey(key.id);
                        }}
                        className="p-1.5 hover:bg-red-950/40 border border-transparent hover:border-red-500/20 rounded text-red-400 hover:text-red-300 transition"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model instructions snippet at bottom */}
      <div className="glass-panel p-6 rounded-xl flex gap-4 items-start bg-slate-950/40">
        <div className="p-2.5 bg-cyan-950/30 border border-cyan-500/20 rounded-lg text-cyan-400 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 text-xs text-slate-400 leading-relaxed">
          <span className="font-bold text-white font-mono block">Cara Autentikasi Menggunakan Library API KedaiAI</span>
          <p>Setelah melakukan top-up rupiah, copy API Key (baik key staging atau key produksi) ke codebase Anda. Modifikasi base URL client open-source Anda mengarah ke endpoint proxy kami:</p>
          <code className="block bg-slate-950 p-2.5 rounded border border-slate-900 text-[11px] text-cyan-300 font-mono mt-2 select-all">
            baseUrl: "https://api.kedai_ai.id/v1"
          </code>
        </div>
      </div>

      {/* Generator Modal Window Overlay (Exactly like Image 4) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                Generate New API Key
              </span>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition font-mono text-sm cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="p-6 space-y-5">
              {!newlyCreatedKey ? (
                // Step 1: Input name form
                <form onSubmit={handleGenerateKey} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-400 block">Kunci API Name / Identifier</label>
                    <input 
                      type="text" 
                      required
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. My Telegram Bot Production"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/60 placeholder-slate-600 font-mono"
                    />
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Setiap kunci API dapat Anda beri nama khusus untuk mempermudah audit logs pada analytic dashboard nantinya.
                  </p>

                  <div className="pt-2 flex justify-end gap-3 font-mono text-xs">
                    <button 
                      type="button" 
                      onClick={closeModal} 
                      className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 transition"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition"
                    >
                      Create API Token
                    </button>
                  </div>
                </form>
              ) : (
                // Step 2: Show newly created raw key with copy warnings!
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-950/15 border border-emerald-500/20 rounded-xl flex gap-3 text-xs text-emerald-300">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold font-mono">Kunci API Berhasil Dihasilkan!</span>
                      <p className="text-slate-400 mt-1 leading-normal">Simpan token ini dengan aman di env secret server Anda. Kami tidak akan menyimpan kredensial asli kunci API di sistem database demi kepatuhan enkripsi penuh.</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-red-950/20 border border-red-500/20 rounded-xl flex gap-3 text-xs text-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold font-mono">Security Notice: Copy Now!</span>
                      <p className="text-slate-400 mt-0.5 leading-normal">Kunci API di bawah ini **HANYA DITUNJUKKAN SATU KALI SAJA**. Setelah ditutup, Anda tidak dapat mereview isi kunci lengkapnya lagi.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-400 block">KUNCI API ANDA</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly
                        value={newlyCreatedKey.rawKey}
                        className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-cyan-400 font-mono select-all focus:outline-none"
                      />
                      <button 
                        onClick={() => copyRawText(newlyCreatedKey.rawKey || "")}
                        className="px-3.5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-mono font-bold text-xs transition-all flex items-center gap-1 shrink-0"
                      >
                        {copiedRaw ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                        {copiedRaw ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={closeModal} 
                      className="px-5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 font-mono text-xs rounded-lg text-white transition font-bold"
                    >
                      Saya Sudah Menyalinnya — Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
