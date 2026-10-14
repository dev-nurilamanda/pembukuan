import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface ManualCashierProps {
  onProceedManual: (item: {
    name: string;
    costPrice: number;
    sellingPrice: number;
    category: 'PHYSICAL' | 'DIGITAL';
  }) => void;
}

export const ManualCashier: React.FC<ManualCashierProps> = ({ onProceedManual }) => {
  const [name, setName] = useState('Transaksi Manual');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [category, setCategory] = useState<'DIGITAL' | 'PHYSICAL'>('DIGITAL');

  const addSelling = (amount: number) => {
    setSellingPrice((prev) => prev + amount);
  };

  const handleQuickPreset = (presetName: string, sell: number, cost: number) => {
    setName(presetName);
    setSellingPrice(sell);
    setCostPrice(cost);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sellingPrice <= 0) {
      alert('Masukkan harga jual terlebih dahulu.');
      return;
    }
    onProceedManual({
      name: name.trim() || 'Transaksi Bebas',
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice),
      category,
    });
  };

  const profit = Math.max(0, sellingPrice - costPrice);

  return (
    <div className="space-y-4 pt-1 max-w-md mx-auto pb-12">
      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => handleQuickPreset('Tarik Tunai', 105000, 100000)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 hover:border-slate-400 font-semibold whitespace-nowrap shadow-2xs active:bg-slate-100 cursor-pointer"
        >
          Tarik Tunai
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset('Transfer Bank', 55000, 50000)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 hover:border-slate-400 font-semibold whitespace-nowrap shadow-2xs active:bg-slate-100 cursor-pointer"
        >
          Transfer Uang
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset('Jasa Cetak', 5000, 1000)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 hover:border-slate-400 font-semibold whitespace-nowrap shadow-2xs active:bg-slate-100 cursor-pointer"
        >
          Jasa Cetak
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset('Pulsa Bebas', 12000, 10300)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 hover:border-slate-400 font-semibold whitespace-nowrap shadow-2xs active:bg-slate-100 cursor-pointer"
        >
          Pulsa Bebas
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Transaksi / Keterangan
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Transfer Bank, Jasa Cetak Foto, Token Custom"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
          />
        </div>

        {/* Harga Jual Konsumen */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Harga Jual (Konsumen Bayar) <span className="text-rose-500">*</span>
            </label>
            {sellingPrice > 0 && (
              <button
                type="button"
                onClick={() => setSellingPrice(0)}
                className="text-[11px] text-rose-500 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">Rp</span>
            <input
              type="number"
              min="1"
              required
              value={sellingPrice || ''}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-lg font-black text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* Quick Add Chips */}
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[5000, 10000, 20000, 50000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => addSelling(amt)}
                className="py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                +{amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
          </div>
        </div>

        {/* Harga Modal */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Harga Modal (Terpotong dari Dompet)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">Rp</span>
            <input
              type="number"
              min="0"
              value={costPrice || ''}
              onChange={(e) => setCostPrice(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Profit Preview */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">Estimasi Laba Bersih:</span>
          <span className="font-bold text-slate-900 text-sm">
            +{formatRupiah(profit)}
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={sellingPrice <= 0}
          className="w-full py-3.5 bg-slate-900 hover:bg-black active:scale-[0.98] disabled:opacity-40 text-white font-bold rounded-xl shadow-xs text-xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <span>Pilih Pembayaran • {formatRupiah(sellingPrice)}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
