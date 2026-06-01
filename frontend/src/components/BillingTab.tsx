import { useState } from "react";
import { 
  Wallet, 
  CheckCircle, 
  Coins, 
  Sliders, 
  CreditCard, 
  Smartphone, 
  Plus, 
  Check, 
  TrendingUp, 
  ArrowUpRight,
  User,
  Activity,
  AlertCircle
} from "lucide-react";
import { UserSession, Transaction } from "../types";

interface BillingTabProps {
  session: UserSession;
  transactions: Transaction[];
  onTopUp: (amount: number, method: string) => void;
}

export default function BillingTab({ session, transactions, onTopUp }: BillingTabProps) {
  const [selectedNominal, setSelectedNominal] = useState<number | null>(100000); // default Rp 100.000
  const [customAmount, setCustomAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"QRIS" | "VA" | "GoPay">("QRIS");
  const [showQROverlay, setShowQROverlay] = useState(false);

  const nominalPresets = [50000, 100000, 250000, 500000];

  const handleTopUpTrigger = () => {
    const finalAmount = selectedNominal !== null ? selectedNominal : parseInt(customAmount);
    
    if (!finalAmount || isNaN(finalAmount) || finalAmount < 10000) {
      alert("Metode minimal top up adalah Rp 10.000.");
      return;
    }

    // Toggle QR screen or instant trigger if VA is used
    if (selectedMethod === "QRIS" || selectedMethod === "GoPay") {
      setShowQROverlay(true);
    } else {
      // Simulate VA success immediately
      onTopUp(finalAmount, "Virtual Account");
      alert(`Top Up Sukses! Dana senilai Rp ${finalAmount.toLocaleString("id-ID")} didepositkan ke saldo Anda.`);
    }
  };

  const simulateQRSuccess = () => {
    const finalAmount = selectedNominal !== null ? selectedNominal : parseInt(customAmount);
    onTopUp(finalAmount || 50000, selectedMethod);
    setShowQROverlay(false);
  };

  const getActiveAmount = () => {
    if (selectedNominal !== null) return selectedNominal;
    return parseInt(customAmount) || 0;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section info */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight font-mono">Dompet & Pengisian Saldo</h1>
        <p className="text-slate-400 text-sm">Kelola sisa dana akun pengujian Anda dan lakukan top-up instant tanpa komitmen reguler bulanan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Setup Top Up parameters (2 cols span) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-6">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Lakukan Pengisian Saldo (Deposit)
            </h3>

            {/* Nominal Presets Grid selection */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 block">Pilih Nominal Pengisian</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {nominalPresets.map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => {
                      setSelectedNominal(nominal);
                      setCustomAmount("");
                    }}
                    className={`p-3.5 rounded-lg border text-center font-mono text-xs transition-all ${selectedNominal === nominal ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold" : "bg-slate-900 border-slate-900 hover:border-slate-800 text-slate-400"}`}
                  >
                    Rp {nominal.toLocaleString("id-ID")}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom inputs */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 block">Atau Tulis Nominal Custom (Minimal Rp 10.000)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500 font-bold">Rp</span>
                <input 
                  type="number" 
                  value={customAmount}
                  onChange={(e) => {
                    setSelectedNominal(null);
                    setCustomAmount(e.target.value);
                  }}
                  placeholder="e.g. 75000"
                  className="w-full bg-slate-900 border border-slate-900 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-700 font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Choice Payment Methods */}
            <div className="space-y-2.5 pt-4 border-t border-slate-900">
              <label className="text-xs font-mono text-slate-400 block">Pilih Metode Pembayaran</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                <button
                  type="button"
                  onClick={() => setSelectedMethod("QRIS")}
                  className={`p-4 rounded-lg border text-left flex items-start gap-3 transition ${selectedMethod === "QRIS" ? "bg-cyan-500/10 border-cyan-500/40 text-white" : "bg-slate-900/45 border-slate-900 text-slate-400 hover:text-slate-300"}`}
                >
                  <Smartphone className="w-5 h-5 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block text-white leading-none mb-1">QRIS Cashless</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Instant, OVO/Gopay</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("VA")}
                  className={`p-4 rounded-lg border text-left flex items-start gap-3 transition ${selectedMethod === "VA" ? "bg-cyan-500/10 border-cyan-500/40 text-white" : "bg-slate-900/45 border-slate-900 text-slate-400 hover:text-slate-300"}`}
                >
                  <CreditCard className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block text-white leading-none mb-1">Virtual Account</span>
                    <span className="text-[10px] text-slate-500 block font-mono">BCA, Mandiri, BNI</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("GoPay")}
                  className={`p-4 rounded-lg border text-left flex items-start gap-3 transition ${selectedMethod === "GoPay" ? "bg-cyan-500/10 border-cyan-500/40 text-white" : "bg-slate-900/45 border-slate-900 text-slate-400 hover:text-slate-300"}`}
                >
                  <Smartphone className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold block text-white leading-none mb-1">GoPay Wallet</span>
                    <span className="text-[10px] text-slate-500 block font-mono">One-click checkout</span>
                  </div>
                </button>

              </div>
            </div>

            {/* Quick Summary payment details and Action Button */}
            <div className="pt-4 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
              <div className="text-left">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Bayar:</span>
                <span className="text-lg font-bold text-white">Rp {getActiveAmount().toLocaleString("id-ID")}</span>
              </div>
              <button 
                type="button"
                onClick={handleTopUpTrigger}
                className="w-full sm:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
              >
                Bayar Sekarang & Tambah Saldo
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Wallet overview summary and info limits */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest block">Ringkasan Wallet</span>
            
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Sisa Saldo Anda:</span>
                 <span className="text-xl font-bold font-mono text-white">Rp {session.balance.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <Wallet className="w-8 h-8 text-cyan-400 shrink-0 opacity-80" />
            </div>

            <div className="text-xs text-slate-400 space-y-3 leading-relaxed">
              <div className="flex gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Tanpa batas minimum pemakaian bulanan</span>
              </div>
              <div className="flex gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Konversi kurs valas USD ter-stabilkan otomatis</span>
              </div>
              <div className="flex gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Bebas dari denda bulanan/maintenance wallet</span>
              </div>
            </div>
          </div>

          <div className="p-4.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl flex gap-3 text-xs text-cyan-300">
            <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0" />
            <p className="leading-relaxed text-slate-400">
              Saldo KedaiAI tidak hangus atau kadaluarsa. Dana deposit dapat selalu digunakan kapan saja sepanjang akun developer Anda aktif di KedaiAI.
            </p>
          </div>
        </div>

      </div>

      {/* Transaction log/invoice table list */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-900 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white">Riwayat Transaksi</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Semua nominal dalam IDR</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400 pb-3">
                <th className="py-4 px-5 font-medium">ID TRANSAKSI</th>
                <th className="py-4 px-5 font-medium">TANGGAL</th>
                <th className="py-4 px-5 font-medium">DESKRIPSI PENERIMAAN</th>
                <th className="py-4 px-5 font-medium">METODE</th>
                <th className="py-4 px-5 font-medium text-right font-bold">NOMINAL</th>
                <th className="py-4 px-5 font-medium text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300">
              {transactions.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-950/40 transition">
                  <td className="py-4 px-5 text-slate-500">{tr.id}</td>
                  <td className="py-4 px-5 text-slate-400">{tr.timestamp}</td>
                  <td className="py-4 px-5 text-white font-medium">{tr.description}</td>
                  <td className="py-4 px-5 text-slate-400">{tr.method || "System"}</td>
                  <td className={`py-4 px-5 text-right font-bold ${tr.amount > 0 ? "text-emerald-400" : "text-amber-500"}`}>
                    {tr.amount > 0 ? `+ Rp ${tr.amount.toLocaleString("id-ID")}` : `- Rp ${Math.abs(tr.amount).toLocaleString("id-ID")}`}
                  </td>
                  <td className="py-4 px-5 text-center">
                    {tr.status === "Success" ? (
                      <span className="inline-flex bg-emerald-950/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] border border-emerald-500/10">Selesai</span>
                    ) : (
                      <span className="inline-flex bg-red-950/30 text-red-500 px-2 py-0.5 rounded text-[10px] border border-red-500/10">Failed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QRIS Sandbox Payment Simulator Mock Modal */}
      {showQROverlay && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-scale-up text-center p-6 space-y-5">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 px-2 rounded bg-cyan-950/40 border border-cyan-500/20 inline-block mb-1">KedaiAI QRIS Merchant</span>
              <h3 className="text-base font-bold font-mono text-white">Metode QRIS Prabayar</h3>
              <p className="text-slate-400 text-xs mt-1">Scan kode QR di bawah ini menggunakan aplikasi OVO / GoPay / ShopeePay / Mobile Banking Anda.</p>
            </div>

            {/* QR Code Graphic Mockup */}
            <div className="bg-white p-3 rounded-xl inline-block mx-auto border-2 border-slate-200">
              {/* QR Image hotlink from unsplash with referral policy */}
              <img 
                src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=260&h=260&q=80" 
                alt="QR Code Simulator" 
                className="w-48 h-48 rounded object-cover mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1 bg-slate-900 border border-slate-900 p-3 rounded-lg text-xs font-mono">
              <span className="text-slate-500 block">NOMINAL YANG MAU DIBAYAR:</span>
              <span className="text-lg font-bold text-white">Rp {getActiveAmount().toLocaleString("id-ID")}</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={simulateQRSuccess}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-lg transition hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                ✓ Simulasikan Pembayaran Berhasil
              </button>
              <button
                type="button"
                onClick={() => setShowQROverlay(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs rounded-lg transition border border-slate-800"
              >
                Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
