import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  Wallet,
  Clock,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Share,
} from 'lucide-react';
import { db, seedDefaultWallets, seedDefaultProducts } from '../db/db';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: 'cashier' | 'wallets' | 'debts';
  onSelectView: (view: 'cashier' | 'wallets' | 'debts') => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      onClose();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleExportBackup = async () => {
    try {
      const wallets = await db.wallets.toArray();
      const products = await db.products.toArray();
      const customers = await db.customers.toArray();
      const transactions = await db.transactions.toArray();
      const walletTransfers = await db.walletTransfers.toArray();

      const backupData = {
        app: 'Kasir Mandiri PWA',
        exportedAt: new Date().toISOString(),
        data: {
          wallets,
          products,
          customers,
          transactions,
          walletTransfers,
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_kasir_mandiri_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor backup data.');
    }
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          if (!parsed.data) throw new Error('Format file backup tidak valid.');

          if (
            !confirm(
              'Pulihkan data dari backup? Seluruh data kasir saat ini akan ditimpa dengan data backup.'
            )
          ) {
            return;
          }

          await db.transaction(
            'rw',
            [db.wallets, db.products, db.customers, db.transactions, db.walletTransfers],
            async () => {
              if (parsed.data.wallets) {
                await db.wallets.clear();
                await db.wallets.bulkAdd(parsed.data.wallets);
              }
              if (parsed.data.products) {
                await db.products.clear();
                await db.products.bulkAdd(parsed.data.products);
              }
              if (parsed.data.customers) {
                await db.customers.clear();
                await db.customers.bulkAdd(parsed.data.customers);
              }
              if (parsed.data.transactions) {
                await db.transactions.clear();
                await db.transactions.bulkAdd(parsed.data.transactions);
              }
              if (parsed.data.walletTransfers) {
                await db.walletTransfers.clear();
                await db.walletTransfers.bulkAdd(parsed.data.walletTransfers);
              }
            }
          );

          alert('Data berhasil dipulihkan dari backup!');
          onClose();
        } catch (err: unknown) {
          console.error(err);
          alert(err instanceof Error ? err.message : 'Gagal membaca file backup.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleResetData = async () => {
    if (!confirm('Yakin ingin mereset seluruh data kembali ke setelan bawaan?')) {
      return;
    }
    await db.transaction('rw', [db.wallets, db.products, db.transactions, db.walletTransfers], async () => {
      await db.wallets.clear();
      await db.products.clear();
      await db.transactions.clear();
      await db.walletTransfers.clear();
    });
    await seedDefaultWallets();
    await seedDefaultProducts();
    alert('Database berhasil direset dengan data default bawaan!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-150">
        {/* Drawer Header (Monokrom Bersih) */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-white text-xs">
              KM
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight text-slate-900">Kasir Mandiri</h3>
              <p className="text-[11px] text-slate-500 font-medium">100% Offline-First PWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 active:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1 flex-1 overflow-y-auto text-xs font-semibold">
          {/* PWA Install Button if not already standalone */}
          {!isInstalled && (isInstallable || isIOS) && (
            <div className="mb-2 p-2.5 bg-slate-100 border border-slate-300 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Smartphone className="w-4 h-4 text-slate-900" />
                <span>Pasang Aplikasi di HP</span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal leading-tight">
                Akses instan dari layar utama HP tanpa kuota.
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full py-2 bg-slate-900 hover:bg-black active:scale-95 text-white font-bold rounded-lg text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Install Kasir Mandiri</span>
              </button>
            </div>
          )}

          <button
            onClick={() => {
              onSelectView('cashier');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              activeView === 'cashier'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100 active:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Kasir Utama</span>
          </button>

          <button
            onClick={() => {
              onSelectView('wallets');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              activeView === 'wallets'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100 active:bg-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Dompet & Saldo Modal</span>
          </button>

          <button
            onClick={() => {
              onSelectView('debts');
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
              activeView === 'debts'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100 active:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Riwayat & Piutang</span>
          </button>

          <div className="pt-3 pb-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
              Backup & Penyimpanan
            </span>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-100 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Ekspor Backup JSON</span>
          </button>

          <button
            onClick={handleImportBackup}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-100 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Impor Pulihkan Backup</span>
          </button>

          <button
            onClick={handleResetData}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 active:bg-rose-50 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-rose-500" />
            <span>Reset ke Setelan Awal</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Dexie IndexedDB • PWA Siap Install</span>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900">Pasang di iPhone / iPad</h4>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              1. Buka di browser Safari.<br />
              2. Tekan tombol <strong className="text-slate-900">Bagikan (Share)</strong> <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> di bar bawah.<br />
              3. Gulir ke bawah dan pilih <strong className="text-slate-900">Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
