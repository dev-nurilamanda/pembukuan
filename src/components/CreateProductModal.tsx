import React, { useState } from 'react';
import { X, Plus, AlertCircle, Package } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ProductCategory } from '../db/db';
import { formatRupiah } from '../utils/formatters';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
}) => {
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('DIGITAL');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(999);
  const [defaultWalletId, setDefaultWalletId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }
    if (costPrice < 0 || sellingPrice < 0) {
      setError('Harga tidak boleh negatif.');
      return;
    }

    setIsSubmitting(true);
    try {
      await db.products.add({
        name: name.trim(),
        category,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stock: category === 'PHYSICAL' ? Number(stock) || 0 : 999,
        defaultWalletId: defaultWalletId || undefined,
      });

      setName('');
      setCostPrice(0);
      setSellingPrice(0);
      setStock(10);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Buat Produk Baru</h3>
              <p className="text-xs text-slate-500">Katalog kasir fisik atau digital</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 active:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs text-slate-800">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Nama Produk <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Token PLN 50.000 atau Voucher Axis 5GB"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Jenis Produk</label>
              <select
                value={category}
                onChange={(e) => {
                  const val = e.target.value as ProductCategory;
                  setCategory(val);
                  if (val === 'PHYSICAL' && stock === 999) setStock(10);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs cursor-pointer focus:border-slate-900"
              >
                <option value="DIGITAL">Digital (Pulsa/PLN)</option>
                <option value="PHYSICAL">Fisik (Stok Barang)</option>
              </select>
            </div>

            {category === 'PHYSICAL' ? (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Jumlah Stok</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:border-slate-900"
                />
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Stok</label>
                <input
                  type="text"
                  disabled
                  value="Tidak Terbatas (Server)"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-400 font-medium text-xs"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Harga Modal (Beli)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={costPrice || ''}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-slate-900 font-semibold text-xs focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Harga Jual (Kasir)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">Rp</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-slate-900 font-semibold text-xs focus:border-slate-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Kantong Modal Default (Opsional)
            </label>
            <select
              value={defaultWalletId}
              onChange={(e) => setDefaultWalletId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs cursor-pointer focus:border-slate-900"
            >
              <option value="">Pilih otomatis saat kasir</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatRupiah(w.currentBalance)})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 font-medium rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-black active:scale-95 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
