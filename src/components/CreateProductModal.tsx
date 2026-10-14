import React, { useState } from 'react';
import { X, AlertCircle, Layers } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '../db/db';
import { formatRupiah } from '../utils/formatters';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_SERVERS = [
  'Digipos Aja!',
  'WeKios',
  'Server PLN',
  'Toko Fisik',
  'Mitra Bukalapak',
  'BSI / Bank',
  'DANA Bisnis',
];

const COMMON_CATEGORIES = [
  'Pulsa Reguler',
  'Paket Data',
  'Token Listrik',
  'Kartu Perdana',
  'Voucher Fisik',
  'Aksesoris',
  'E-Wallet',
  'Tagihan / PPOB',
];

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
}) => {
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];
  const existingProducts = useLiveQuery(() => db.products.toArray(), []) || [];

  const serverOptions = Array.from(
    new Set([
      ...COMMON_SERVERS,
      ...existingProducts.map((p) => p.serverChannel || p.category).filter(Boolean),
    ])
  );

  const categoryOptions = Array.from(
    new Set([
      ...COMMON_CATEGORIES,
      ...existingProducts.map((p) => p.category).filter(Boolean),
    ])
  );

  const [name, setName] = useState('');
  const [server, setServer] = useState('Digipos Aja!');
  const [customServer, setCustomServer] = useState('');
  const [category, setCategory] = useState('Pulsa Reguler');
  const [customCategory, setCustomCategory] = useState('');
  const [isPhysical, setIsPhysical] = useState(false);
  const [stock, setStock] = useState<number>(10);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [defaultWalletId, setDefaultWalletId] = useState('server_digipos');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto associate default wallet when server changes
  const handleServerChange = (selected: string) => {
    setServer(selected);
    const lower = selected.toLowerCase();

    const match = wallets.find((w) => {
      const wLower = w.name.toLowerCase();
      const idLower = w.id.toLowerCase();
      if (lower.includes('digipos') && (wLower.includes('digipos') || idLower.includes('digipos'))) return true;
      if (lower.includes('wekios') && (wLower.includes('wekios') || idLower.includes('wekios'))) return true;
      if (lower.includes('pln') && (wLower.includes('pln') || idLower.includes('pln'))) return true;
      if (lower.includes('perdana') || lower.includes('fisik') || lower.includes('toko') || lower.includes('aksesoris')) {
        return w.category === 'CASH' || idLower.includes('cash');
      }
      return wLower.includes(lower);
    });

    if (match) {
      setDefaultWalletId(match.id);
    }

    if (lower.includes('perdana') || lower.includes('fisik') || lower.includes('toko') || lower.includes('aksesoris')) {
      setIsPhysical(true);
    }
  };

  if (!isOpen) return null;

  const profitRp = sellingPrice - costPrice;
  const marginPercent =
    costPrice > 0 ? ((profitRp / costPrice) * 100).toFixed(1) : '100.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }
    if (costPrice < 0 || sellingPrice < 0) {
      setError('Harga tidak boleh bernilai negatif.');
      return;
    }

    const finalServer =
      server === 'CUSTOM' ? customServer.trim() || 'Server Eksternal' : server;
    const finalCategory =
      category === 'CUSTOM' ? customCategory.trim() || 'Umum' : category;

    setIsSubmitting(true);
    try {
      await db.products.add({
        name: name.trim(),
        serverChannel: finalServer,
        category: finalCategory,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stock: isPhysical ? Number(stock) || 0 : 0,
        isPhysical,
        trackStock: isPhysical,
        defaultWalletId: defaultWalletId || undefined,
      });

      setName('');
      setCostPrice(0);
      setSellingPrice(0);
      setStock(10);
      setIsPhysical(false);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal menyimpan produk.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Buat Produk Baru</h3>
              <p className="text-xs text-slate-500">Tentukan server eksekutor, harga & stok</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 active:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-800 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Nama Produk */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs">
              Nama Produk <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Telkomsel Data 10GB atau Token PLN 50rb"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-sm focus:border-slate-900 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* 2. Pilihan Server / Eksekutor */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs">
              Server / Aplikasi Eksekutor <span className="text-rose-500">*</span>
            </label>
            <select
              value={server}
              onChange={(e) => handleServerChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-xs cursor-pointer focus:border-slate-900"
            >
              {serverOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="CUSTOM">+ Ketik Server Baru...</option>
            </select>

            {server === 'CUSTOM' && (
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: BSI Smart, Kiosbank, Voucher Indosat"
                value={customServer}
                onChange={(e) => setCustomServer(e.target.value)}
                className="w-full mt-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:bg-white focus:border-slate-900"
              />
            )}
          </div>

          {/* 3. Pilihan Kategori */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 text-xs">
              Jenis Kategori Produk <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-xs cursor-pointer focus:border-slate-900"
            >
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="CUSTOM">+ Ketik Kategori Baru...</option>
            </select>

            {category === 'CUSTOM' && (
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: Paket Roaming, Voucher Wifi"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full mt-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:bg-white focus:border-slate-900"
              />
            )}
          </div>

          {/* 4. Switch Kelola Stok Fisik */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Barang Fisik (Memiliki Stok)
                </span>
                <span className="text-[11px] text-slate-500">
                  {isPhysical
                    ? 'Stok berkurang otomatis saat terjual'
                    : 'Tanpa batas stok fisik (produk server/digital)'}
                </span>
              </div>

              {/* Native Toggle Switch */}
              <button
                type="button"
                onClick={() => setIsPhysical(!isPhysical)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isPhysical ? 'bg-slate-900' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                    isPhysical ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {isPhysical && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                  Jumlah Stok Fisik Tersedia:
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:border-slate-900"
                />
              </div>
            )}
          </div>

          {/* 5. Harga Modal & Jual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                Harga Modal (Beli)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">Rp</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={costPrice || ''}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-bold text-xs focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                Harga Jual (Kasir)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">Rp</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-bold text-xs focus:border-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 6. Live Margin Calculation */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-800 font-semibold block">
                Estimasi Laba Bersih
              </span>
              <span className="text-sm font-black text-emerald-900">
                +{formatRupiah(profitRp)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-800 font-semibold block">Margin</span>
              <span className="text-xs font-bold text-emerald-900">
                {costPrice > 0 ? `+${marginPercent}%` : '100%'}
              </span>
            </div>
          </div>

          {/* 7. Default Kantong Modal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-700 font-bold text-xs">
                Potong Modal Dari Dompet:
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Otomatis saat transaksi</span>
            </div>
            <select
              value={defaultWalletId}
              onChange={(e) => setDefaultWalletId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-semibold text-xs cursor-pointer focus:border-slate-900"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatRupiah(w.currentBalance)})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
