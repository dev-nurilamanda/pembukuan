import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, CreditCard, Banknote, Clock, Wallet as WalletIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type Wallet, type PaymentStatus } from '../db/db';
import { executeCashierTransaction } from '../db/transactionService';
import { formatRupiah } from '../utils/formatters';

interface CheckoutBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  manualItem?: {
    name: string;
    costPrice: number;
    sellingPrice: number;
    category: 'PHYSICAL' | 'DIGITAL';
  } | null;
  onSuccess: (txnId: string) => void;
}

export const CheckoutBottomSheet: React.FC<CheckoutBottomSheetProps> = ({
  isOpen,
  onClose,
  product,
  manualItem,
  onSuccess,
}) => {
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];

  const itemTitle = product ? product.name : manualItem ? manualItem.name : '';
  const itemCost = product ? product.costPrice : manualItem ? manualItem.costPrice : 0;
  const itemSelling = product ? product.sellingPrice : manualItem ? manualItem.sellingPrice : 0;
  const itemCategory = product ? product.category : manualItem ? manualItem.category : 'DIGITAL';

  const [customerTarget, setCustomerTarget] = useState('');
  const [outWalletId, setOutWalletId] = useState('');
  const [inWalletId, setInWalletId] = useState('');
  const [paymentType, setPaymentType] = useState<'CASH' | 'QRIS' | 'TRANSFER' | 'UNPAID'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallets.length > 0) {
      const defaultOut = product?.defaultWalletId
        ? wallets.find((w) => w.id === product.defaultWalletId)
        : itemCategory === 'DIGITAL'
        ? wallets.find((w) => w.category === 'SERVER') || wallets[0]
        : wallets.find((w) => w.category === 'CASH') || wallets[0];

      if (defaultOut) {
        setOutWalletId(defaultOut.id);
      } else {
        setOutWalletId(wallets[0].id);
      }

      const defaultIn = wallets.find((w) => w.category === 'CASH') || wallets[0];
      if (defaultIn) {
        setInWalletId(defaultIn.id);
      }
    }
  }, [product, manualItem, wallets]);

  useEffect(() => {
    if (isOpen) {
      setCustomerTarget('');
      setNotes('');
      setError(null);
      setPaymentType('CASH');
    }
  }, [isOpen]);

  if (!isOpen || (!product && !manualItem)) return null;

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!outWalletId) {
      setError('Pilih kantong modal sumber pemotongan.');
      return;
    }

    const paymentStatus: PaymentStatus = paymentType === 'UNPAID' ? 'UNPAID' : 'PAID';
    if (paymentStatus === 'PAID' && !inWalletId) {
      setError('Pilih kantong penampung uang masuk.');
      return;
    }

    setIsSubmitting(true);

    try {
      const txn = await executeCashierTransaction({
        productId: product?.id,
        productName: itemTitle,
        category: itemCategory,
        customerTarget: customerTarget.trim() || undefined,
        costPrice: itemCost,
        sellingPrice: itemSelling,
        outWalletId,
        inWalletId: paymentStatus === 'PAID' ? inWalletId : outWalletId,
        paymentStatus,
        paymentMethod: paymentType === 'UNPAID' ? 'PIUTANG' : paymentType,
        notes: notes.trim() || undefined,
        quantity: 1,
      });

      onSuccess(txn.id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal memproses transaksi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOutWallet = wallets.find((w) => w.id === outWalletId);
  const profitEstimate = itemSelling - itemCost;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs transition-opacity">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Top Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Transaksi Kasir
            </span>
            <h3 className="text-sm font-bold text-slate-900 truncate max-w-[280px]">
              {itemTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 active:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExecute} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-slate-800 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Pricing Highlight Pill */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-medium">Harga Jual</span>
              <div className="text-lg font-black text-slate-900">
                {formatRupiah(itemSelling)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-medium">Estimasi Laba</span>
              <div className="text-xs font-bold text-slate-700">
                +{formatRupiah(profitEstimate)}
              </div>
            </div>
          </div>

          {/* 1. Target Pembeli */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 text-xs">
              Tujuan Transaksi / Pelanggan
            </label>
            <input
              type="text"
              autoFocus
              placeholder="No. HP / ID PLN / Nama Pembeli (Opsional)"
              value={customerTarget}
              onChange={(e) => setCustomerTarget(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:outline-none focus:border-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* 2. Sumber Modal */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold text-xs">
                Potong Saldo Modal Dari:
              </label>
              {selectedOutWallet && (
                <span className="text-[10px] text-slate-500">
                  Sisa: <strong className="text-slate-800">{formatRupiah(selectedOutWallet.currentBalance)}</strong>
                </span>
              )}
            </div>
            <select
              value={outWalletId}
              onChange={(e) => setOutWalletId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:border-slate-900 cursor-pointer"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatRupiah(w.currentBalance)})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Modal terpotong: {formatRupiah(itemCost)}
            </span>
          </div>

          {/* 3. Metode Pembayaran */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 text-xs">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('CASH')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border font-semibold text-xs transition cursor-pointer ${
                  paymentType === 'CASH'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Banknote className="w-4 h-4 shrink-0" />
                <span>Tunai (Lunas)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('QRIS')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border font-semibold text-xs transition cursor-pointer ${
                  paymentType === 'QRIS'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>QRIS / E-Wallet</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('TRANSFER')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border font-semibold text-xs transition cursor-pointer ${
                  paymentType === 'TRANSFER'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <WalletIcon className="w-4 h-4 shrink-0" />
                <span>Transfer Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('UNPAID')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border font-semibold text-xs transition cursor-pointer ${
                  paymentType === 'UNPAID'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Piutang (Hutang)</span>
              </button>
            </div>
          </div>

          {/* Kantong Penerima Uang Masuk */}
          {paymentType !== 'UNPAID' && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs">
                Tampung Uang Masuk Di:
              </label>
              <select
                value={inWalletId}
                onChange={(e) => setInWalletId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:border-slate-900 cursor-pointer"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (+{formatRupiah(itemSelling)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {paymentType === 'UNPAID' && (
            <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-700">
              📌 Modal tetap terpotong sekarang, namun saldo uang masuk tidak akan bertambah sebelum pembeli melunasinya di tab Pesanan.
            </div>
          )}

          {/* Bottom Execution Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-slate-900 hover:bg-black active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : paymentType === 'UNPAID'
                  ? `Catat Piutang • ${formatRupiah(itemSelling)}`
                  : `Selesaikan Transaksi • ${formatRupiah(itemSelling)}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
