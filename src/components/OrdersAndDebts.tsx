import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { db, type Transaction } from '../db/db';
import { settleUnpaidTransaction } from '../db/transactionService';
import { formatRupiah, formatDateTime } from '../utils/formatters';

export const OrdersAndDebts: React.FC = () => {
  const transactions = useLiveQuery(
    () => db.transactions.reverse().sortBy('date'),
    []
  ) || [];

  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

  // Settle modal state
  const [settleTxn, setSettleTxn] = useState<Transaction | null>(null);
  const [settleWalletId, setSettleWalletId] = useState('');
  const [settleMethod, setSettleMethod] = useState('CASH');
  const [isSettling, setIsSettling] = useState(false);

  const unpaidCount = transactions.filter((t) => t.paymentStatus === 'UNPAID').length;
  const totalUnpaidNominal = transactions
    .filter((t) => t.paymentStatus === 'UNPAID')
    .reduce((sum, t) => sum + t.sellingPrice, 0);

  const filtered = transactions.filter((t) => {
    if (filter === 'UNPAID') return t.paymentStatus === 'UNPAID';
    if (filter === 'PAID') return t.paymentStatus === 'PAID';
    return true;
  });

  const handleOpenSettle = (txn: Transaction) => {
    setSettleTxn(txn);
    const defaultWallet = wallets.find((w) => w.category === 'CASH') || wallets[0];
    if (defaultWallet) setSettleWalletId(defaultWallet.id);
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTxn || !settleWalletId) return;

    setIsSettling(true);
    try {
      await settleUnpaidTransaction(settleTxn.id, settleWalletId, settleMethod);
      setSettleTxn(null);
    } catch (err) {
      console.error(err);
      alert('Gagal melunasi piutang.');
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="space-y-3 pb-12">
      {/* Unpaid Debt Banner if any */}
      {unpaidCount > 0 && (
        <div className="bg-white border border-slate-300 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                {unpaidCount} Tagihan Belum Lunas
              </h4>
              <p className="text-[11px] text-slate-500">
                Total piutang: <strong className="text-slate-900">{formatRupiah(totalUnpaidNominal)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('UNPAID')}
            className="px-3 py-1.5 bg-slate-900 active:bg-black text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            Lihat
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 text-xs">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Semua ({transactions.length})
        </button>

        <button
          onClick={() => setFilter('UNPAID')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            filter === 'UNPAID'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span>Piutang</span>
          {unpaidCount > 0 && (
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${filter === 'UNPAID' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-800'}`}>
              {unpaidCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilter('PAID')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
            filter === 'PAID'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Lunas
        </button>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 shadow-2xs">
          Belum ada riwayat transaksi pada filter ini.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {filtered.map((t) => {
            const isUnpaid = t.paymentStatus === 'UNPAID';

            return (
              <div key={t.id} className="px-4 py-4.5 sm:py-5 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                        isUnpaid
                          ? 'bg-slate-100 text-slate-800 border border-slate-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isUnpaid ? 'BELUM LUNAS' : 'LUNAS'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatDateTime(t.date)}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-900 text-base truncate">
                    {t.productName}
                  </h4>

                  {t.customerTarget && (
                    <p className="text-sm text-slate-600 font-medium truncate">
                      Tujuan: <span className="font-semibold text-slate-800">{t.customerTarget}</span>
                    </p>
                  )}

                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>Modal: {formatRupiah(t.costPrice)}</span>
                    <span>•</span>
                    <span className="text-slate-800 font-medium">Laba: +{formatRupiah(t.profit)}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-2">
                  <div className="text-base font-bold text-slate-900">
                    {formatRupiah(t.sellingPrice)}
                  </div>

                  {isUnpaid ? (
                    <button
                      onClick={() => handleOpenSettle(t)}
                      className="px-3.5 py-1.5 bg-slate-900 active:bg-black text-white font-bold rounded-xl text-xs shadow-2xs cursor-pointer transition"
                    >
                      Lunasi
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium block">
                      {t.paymentMethod}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pelunasan Piutang Modal */}
      {settleTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Pelunasan Piutang</h3>
              <button
                onClick={() => setSettleTxn(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettle} className="p-5 space-y-3.5 text-xs text-slate-800">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="text-slate-500 text-[11px]">Tagihan Barang:</p>
                <p className="font-bold text-slate-900 text-sm">{settleTxn.productName}</p>
                {settleTxn.customerTarget && (
                  <p className="text-slate-600">Konsumen: {settleTxn.customerTarget}</p>
                )}
                <p className="text-base font-extrabold text-slate-900 pt-1">
                  {formatRupiah(settleTxn.sellingPrice)}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Masukkan Uang Pelunasan ke Kantong:
                </label>
                <select
                  value={settleWalletId}
                  onChange={(e) => setSettleWalletId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium text-xs cursor-pointer focus:border-slate-900"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Metode Penerimaan:
                </label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium text-xs cursor-pointer focus:border-slate-900"
                >
                  <option value="CASH">Uang Tunai</option>
                  <option value="TRANSFER">Transfer Bank</option>
                  <option value="QRIS">QRIS / E-Wallet</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettleTxn(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="px-4 py-2 bg-slate-900 hover:bg-black active:scale-95 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {isSettling ? 'Memproses...' : 'Tandai Lunas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
