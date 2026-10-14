import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Clock,
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Wallet } from '../db/db';
import { executeCartTransaction, type CartItem } from '../db/transactionService';
import { formatRupiah } from '../utils/formatters';

interface CheckoutBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onSuccess: (summary: string) => void;
}

export const CheckoutBottomSheet: React.FC<CheckoutBottomSheetProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSuccess,
}) => {
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];

  const [paymentType, setPaymentType] = useState<'CASH' | 'QRIS' | 'TRANSFER' | 'UNPAID'>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [inWalletId, setInWalletId] = useState('');
  const [debtCustomerName, setDebtCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perhitungan Keuangan Keranjang
  const totalItems = cart.length;
  const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCost = cart.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);
  const totalSelling = cart.reduce((acc, item) => acc + item.sellingPrice * item.quantity, 0);
  const totalProfit = totalSelling - totalCost;

  // Inisialisasi wallet penerima uang
  useEffect(() => {
    if (wallets.length > 0 && !inWalletId) {
      const defaultIn = wallets.find((w) => w.category === 'CASH') || wallets[0];
      if (defaultIn) setInWalletId(defaultIn.id);
    }
  }, [wallets, inWalletId]);

  // Set nilai awal uang diterima saat keranjang berubah atau modal dibuka
  useEffect(() => {
    if (isOpen) {
      setCashReceived(totalSelling);
      setError(null);
      setNotes('');
      setDebtCustomerName('');
    }
  }, [isOpen, totalSelling]);

  if (!isOpen) return null;

  // Pilihan pecahan uang cepat
  const quickCashOptions = () => {
    const opts = new Set<number>();
    opts.add(totalSelling); // Uang Pas
    [10000, 20000, 50000, 100000].forEach((denom) => {
      if (denom >= totalSelling) {
        opts.add(denom);
      } else {
        const rounded = Math.ceil(totalSelling / denom) * denom;
        if (rounded > totalSelling) opts.add(rounded);
      }
    });
    return Array.from(opts).sort((a, b) => a - b).slice(0, 4);
  };

  const change = Math.max(0, cashReceived - totalSelling);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError('Keranjang belanja kosong. Tambahkan produk terlebih dahulu.');
      return;
    }

    // Validasi piutang
    if (paymentType === 'UNPAID' && !debtCustomerName.trim()) {
      setError('Wajib memasukkan Nama Pelanggan yang Berhutang.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Tentukan dompet penerima berdasarkan metode
      let targetInWalletId = inWalletId;
      if (!targetInWalletId && wallets.length > 0) {
        const cashWallet = wallets.find((w) => w.category === 'CASH') || wallets[0];
        targetInWalletId = cashWallet.id;
      }

      await executeCartTransaction({
        items: cart,
        inWalletId: targetInWalletId,
        paymentStatus: paymentType === 'UNPAID' ? 'UNPAID' : 'PAID',
        paymentMethod: paymentType === 'UNPAID' ? 'HUTANG' : paymentType,
        customerTarget: paymentType === 'UNPAID' ? debtCustomerName.trim() : undefined,
        cashReceived: paymentType === 'CASH' ? cashReceived : undefined,
        notes: notes.trim() || undefined,
      });

      const summaryText =
        paymentType === 'UNPAID'
          ? `Piutang ${totalQty} item (${debtCustomerName}) berhasil dicatat`
          : `Pembayaran ${totalQty} item (${formatRupiah(totalSelling)}) berhasil`;

      onSuccess(summaryText);
      onClearCart();
      onClose();
    } catch (err: unknown) {
      console.error('Checkout error:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memproses transaksi kasir.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bersih & Aksi Cepat */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                Keranjang Belanja
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {totalItems} Produk • {totalQty} Unit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 active:scale-95 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/50 transition cursor-pointer flex items-center gap-1"
                title="Kosongkan Semua Item"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 active:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Isi Scrollable Keranjang & Form Pembayaran */}
        <div className="overflow-y-auto px-4 py-4 space-y-4.5 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. DAFTAR ITEM DI DALAM KERANJANG */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
              <span>Item Terpilih ({totalItems})</span>
              <span>Subtotal</span>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm border border-slate-200 rounded-2xl bg-slate-50">
                Keranjang masih kosong.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {cart.map((item) => {
                  const isPhys = item.isPhysical;
                  const isMaxStock = isPhys && item.quantity >= item.stock;
                  const itemSubtotal = item.sellingPrice * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                    >
                      {/* Kiri: Nama & Info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {item.productName}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-800">
                            {formatRupiah(item.sellingPrice)}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px] border border-slate-200">
                            {item.serverChannel}
                          </span>
                          {isPhys && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              (Stok: {item.stock})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Kanan: Stepper Qty & Tombol Hapus */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white active:bg-slate-200 flex items-center justify-center text-slate-700 shadow-2xs cursor-pointer active:scale-90 transition"
                            title="Kurangi Qty"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>

                          <span className="w-7 text-center font-black text-xs text-slate-900 select-none">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            disabled={isMaxStock}
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-white active:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700 shadow-2xs cursor-pointer active:scale-90 transition"
                            title={isMaxStock ? 'Batas stok tercapai' : 'Tambah Qty'}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <span className="font-extrabold text-slate-900 text-sm block">
                            {formatRupiah(itemSubtotal)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 active:scale-90 transition cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. RINGKASAN FINANSIAL (Total Tagihan, Modal, & Estimasi Laba Bersih) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Total Modal Terpotong</span>
              <span className="font-semibold text-slate-800">{formatRupiah(totalCost)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Estimasi Laba Bersih</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                +{formatRupiah(totalProfit)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Total Tagihan</span>
              <span className="text-xl font-black text-slate-900">
                {formatRupiah(totalSelling)}
              </span>
            </div>
          </div>

          {/* 3. METODE PEMBAYARAN */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Metode Pembayaran
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('CASH')}
                className={`py-3 px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentType === 'CASH'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <Banknote className="w-4 h-4 stroke-[2.2]" />
                <span>Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('QRIS')}
                className={`py-3 px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentType === 'QRIS'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4 stroke-[2.2]" />
                <span>QRIS / Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('UNPAID')}
                className={`py-3 px-2 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentType === 'UNPAID'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <Clock className="w-4 h-4 stroke-[2.2]" />
                <span>Piutang (Hutang)</span>
              </button>
            </div>

            {/* Opsi Khusus Tunai: Pecahan Cepat & Kembalian */}
            {paymentType === 'CASH' && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Uang Diterima Konsumen</span>
                  {cashReceived !== totalSelling && (
                    <button
                      type="button"
                      onClick={() => setCashReceived(totalSelling)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Uang Pas</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-black text-base pointer-events-none">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    placeholder="0"
                    className="w-full h-12 bg-white border border-slate-300 rounded-xl pl-11 pr-4 text-lg font-black text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs"
                  />
                </div>

                {/* Tombol Cepat Uang Pecahan */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashReceived(totalSelling)}
                    className={`h-9 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
                      cashReceived === totalSelling
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Uang Pas
                  </button>
                  {quickCashOptions()
                    .filter((val) => val !== totalSelling)
                    .map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashReceived(val)}
                        className={`h-9 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center ${
                          cashReceived === val
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {val >= 1000 ? `${val / 1000}k` : val}
                      </button>
                    ))}
                </div>

                {/* Kembalian Banner */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    {cashReceived >= totalSelling ? 'Kembalian:' : 'Uang Kurang:'}
                  </span>
                  <span
                    className={`text-base font-black ${
                      cashReceived >= totalSelling ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {cashReceived >= totalSelling
                      ? formatRupiah(change)
                      : formatRupiah(totalSelling - cashReceived)}
                  </span>
                </div>
              </div>
            )}

            {/* Pilihan Dompet Penerima (untuk QRIS/Bank atau jika kasir ingin simpan di dompet khusus) */}
            {paymentType === 'QRIS' && (
              <div className="space-y-1.5 pt-1 animate-in fade-in duration-100">
                <label className="block text-xs font-bold text-slate-600">
                  Rekening / Dompet Penerima
                </label>
                <select
                  value={inWalletId}
                  onChange={(e) => setInWalletId(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatRupiah(w.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Kolom WAJIB jika Piutang (Hutang) */}
            {paymentType === 'UNPAID' && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-100">
                <label className="block text-xs font-bold text-slate-700">
                  Nama Pelanggan yang Berhutang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={debtCustomerName}
                  onChange={(e) => setDebtCustomerName(e.target.value)}
                  placeholder="Ketik nama pelanggan / nomor telp..."
                  className="w-full h-12 bg-white border border-slate-300 rounded-xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                />
                <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  Pesanan ini akan dicatat sebagai <strong>Belum Bayar (UNPAID)</strong> dan masuk ke daftar Piutang Kasir.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Tombol Eksekusi Bersih & Cepat */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <button
            type="button"
            disabled={
              isSubmitting ||
              cart.length === 0 ||
              (paymentType === 'UNPAID' && !debtCustomerName.trim())
            }
            onClick={handleExecute}
            className="w-full h-14 bg-slate-900 hover:bg-black active:scale-[0.98] disabled:opacity-40 text-white font-bold rounded-2xl shadow-md text-base flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {isSubmitting ? (
              <span>Memproses...</span>
            ) : paymentType === 'UNPAID' ? (
              <span>Catat Sebagai Piutang • {formatRupiah(totalSelling)}</span>
            ) : paymentType === 'CASH' && cashReceived >= totalSelling ? (
              <span>
                Bayar Tunai • Kembalian {formatRupiah(change)}
              </span>
            ) : (
              <span>Bayar & Catat Transaksi • {formatRupiah(totalSelling)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
