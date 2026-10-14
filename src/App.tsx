/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Menu,
  Search,
  X,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDefaultWallets, seedDefaultProducts, type Product } from './db/db';
import { CashierCatalog } from './components/CashierCatalog';
import { ManualCashier } from './components/ManualCashier';
import { OrdersAndDebts } from './components/OrdersAndDebts';
import { CheckoutBottomSheet } from './components/CheckoutBottomSheet';
import { CreateProductModal } from './components/CreateProductModal';
import { DrawerMenu } from './components/DrawerMenu';
import { WalletList } from './components/WalletList';

export default function App() {
  const [activeView, setActiveView] = useState<'cashier' | 'wallets' | 'debts'>('cashier');
  const [subTab, setSubTab] = useState<'katalog' | 'manual' | 'pesanan'>('katalog');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Checkout Bottom Sheet state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [manualItem, setManualItem] = useState<{
    name: string;
    costPrice: number;
    sellingPrice: number;
    category: 'PHYSICAL' | 'DIGITAL';
  } | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Create Product Modal state
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);

  // Success Notification Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Offline / Online state
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Unpaid count for badge
  const unpaidCount = useLiveQuery(
    () => db.transactions.where('paymentStatus').equals('UNPAID').count(),
    []
  ) || 0;

  useEffect(() => {
    seedDefaultWallets().catch(console.error);
    seedDefaultProducts().catch(console.error);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setManualItem(null);
    setIsCheckoutOpen(true);
  };

  const handleProceedManual = (item: {
    name: string;
    costPrice: number;
    sellingPrice: number;
    category: 'PHYSICAL' | 'DIGITAL';
  }) => {
    setManualItem(item);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = (txnId: string) => {
    setSuccessToast(`Transaksi berhasil dicatat (${txnId})`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* 1. HEADER ATAS (Putih Bersih Monokrom Menyatu dengan Layar HP) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Kiri: Hamburger Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-1.5 -ml-1.5 text-slate-800 hover:text-black active:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900">
              {activeView === 'cashier'
                ? 'Kasir'
                : activeView === 'wallets'
                ? 'Dompet Modal'
                : 'Riwayat & Piutang'}
            </h1>
          </div>

          {/* Kanan: Search Icon & Offline Indicator */}
          <div className="flex items-center gap-1">
            {activeView === 'cashier' && subTab === 'katalog' && (
              <button
                onClick={() => setIsSearchActive(!isSearchActive)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isSearchActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700 hover:text-black active:bg-slate-100'
                }`}
                title="Cari Produk"
              >
                {isSearchActive ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            )}

            {!isOnline && (
              <span
                className="p-1.5 rounded-lg text-amber-600 bg-amber-50"
                title="Mode Offline"
              >
                <WifiOff className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>

        {/* Expandable Search Input Bar */}
        {isSearchActive && activeView === 'cashier' && (
          <div className="max-w-md mx-auto px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Cari nama produk / token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 text-slate-900 placeholder:text-slate-400 pl-9 pr-8 py-2 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. SUB-TAB SEDERHANA: KATALOG | MANUAL | PESANAN (Underline Indicator Simpel) */}
        {activeView === 'cashier' && (
          <div className="border-t border-slate-100 bg-white">
            <div className="max-w-md mx-auto flex items-center px-4">
              <button
                onClick={() => setSubTab('katalog')}
                className={`flex-1 py-2.5 text-xs font-semibold text-center transition cursor-pointer border-b-2 ${
                  subTab === 'katalog'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Katalog
              </button>

              <button
                onClick={() => setSubTab('manual')}
                className={`flex-1 py-2.5 text-xs font-semibold text-center transition cursor-pointer border-b-2 ${
                  subTab === 'manual'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Manual
              </button>

              <button
                onClick={() => setSubTab('pesanan')}
                className={`flex-1 py-2.5 text-xs font-semibold text-center transition cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                  subTab === 'pesanan'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Pesanan</span>
                {unpaidCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-900 text-white text-[10px] font-bold rounded-full">
                    {unpaidCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm p-3 bg-slate-900 text-white rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{successToast}</span>
        </div>
      )}

      {/* 3. MAIN CONTENT CONTAINER (Edge-to-Edge on Mobile) */}
      <main className="max-w-md mx-auto px-4 py-0 flex-1 w-full overflow-x-hidden">
        {activeView === 'cashier' ? (
          <>
            {subTab === 'katalog' && (
              <CashierCatalog
                searchQuery={searchQuery}
                onSelectProduct={handleSelectProduct}
                onOpenCreateModal={() => setIsCreateProductOpen(true)}
              />
            )}

            {subTab === 'manual' && (
              <div className="py-3">
                <ManualCashier onProceedManual={handleProceedManual} />
              </div>
            )}

            {subTab === 'pesanan' && (
              <div className="py-3">
                <OrdersAndDebts />
              </div>
            )}
          </>
        ) : activeView === 'wallets' ? (
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-700">Manajemen Saldo Modal</span>
              <button
                onClick={() => setActiveView('cashier')}
                className="text-xs font-bold text-slate-900 active:underline cursor-pointer"
              >
                &larr; Kembali ke Kasir
              </button>
            </div>
            <WalletList />
          </div>
        ) : (
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-700">Pelacakan Tagihan & Piutang</span>
              <button
                onClick={() => setActiveView('cashier')}
                className="text-xs font-bold text-slate-900 active:underline cursor-pointer"
              >
                &larr; Kembali ke Kasir
              </button>
            </div>
            <OrdersAndDebts />
          </div>
        )}
      </main>

      {/* Bottom Sheet Kasir Ringkas (<10 detik) */}
      <CheckoutBottomSheet
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        product={selectedProduct}
        manualItem={manualItem}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Modal Tambah Produk Baru */}
      <CreateProductModal
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
      />

      {/* Drawer Menu Kiri (Hamburger) */}
      <DrawerMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
          if (view === 'cashier') setSubTab('katalog');
        }}
      />
    </div>
  );
}
