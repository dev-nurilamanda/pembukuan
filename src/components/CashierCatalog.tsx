import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, SlidersHorizontal, PlusCircle, Check, X, Layers, Package } from 'lucide-react';
import { db, seedDefaultProducts, type Product } from '../db/db';
import { formatRupiah } from '../utils/formatters';

interface CashierCatalogProps {
  onSelectProduct: (product: Product) => void;
  onOpenCreateModal: () => void;
  onOpenProductManagement?: () => void;
  searchQuery: string;
}

/**
 * Inisial avatar netral (2-3 huruf)
 */
function getProductInitials(product: Product): string {
  const name = product.name.toUpperCase().trim();
  if (name.includes('PLN') || name.includes('TOKEN')) return 'PLN';
  if (name.includes('TELKOMSEL') || name.includes('TSL') || name.includes('DIGIPOS')) return 'TSL';
  if (name.includes('INDOSAT') || name.includes('ISAT')) return 'ISAT';
  if (name.includes('AXIS')) return 'AXS';
  if (name.includes('SMARTFREN')) return 'SMF';
  if (name.includes('DANA')) return 'DANA';
  if (name.includes('BY.U')) return 'BYU';
  if (name.includes('PERDANA')) return 'SIM';
  if (name.includes('WEKIOS')) return 'WKS';

  const words = name.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

export const CashierCatalog: React.FC<CashierCatalogProps> = ({
  onSelectProduct,
  onOpenCreateModal,
  onOpenProductManagement,
  searchQuery,
}) => {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  React.useEffect(() => {
    seedDefaultProducts().catch(console.error);
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDefaultProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Daftar unik Channel / Server Eksekusi dari database
  const uniqueChannels = Array.from(
    new Set(products.map((p) => p.serverChannel || p.category).filter(Boolean))
  );

  const filteredProducts = products.filter((p) => {
    const channel = p.serverChannel || p.category || '';
    const category = p.category || '';
    const matchesChannel =
      selectedChannel === 'ALL' ? true : channel === selectedChannel;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === ''
        ? true
        : p.name.toLowerCase().includes(q) ||
          channel.toLowerCase().includes(q) ||
          category.toLowerCase().includes(q);
    return matchesChannel && matchesSearch;
  });

  return (
    <div className="pb-16 -mx-4">
      {/* Bar Filter Channel / Sumber Eksekusi Dinamis */}
      <div className="px-4 py-3 flex items-center justify-between gap-2.5 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className="flex-1 flex items-center justify-between bg-white border border-slate-300 text-slate-900 font-bold text-xs sm:text-sm rounded-xl px-3.5 py-2.5 shadow-2xs hover:border-slate-400 active:bg-slate-100 transition cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <Layers className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="truncate">
              {selectedChannel === 'ALL'
                ? `Semua Server (${products.length})`
                : `${selectedChannel} (${
                    products.filter((p) => (p.serverChannel || p.category) === selectedChannel).length
                  })`}
            </span>
          </div>
          <span className="text-slate-400 text-xs ml-2">Ganti ▼</span>
        </button>

        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 active:bg-slate-100 active:scale-95 transition cursor-pointer shadow-2xs"
          title="Filter Server / Eksekutor"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* List Produk Lega (4-5 per layar HP, Row Height py-4.5 s/d py-5) */}
      {filteredProducts.length === 0 ? (
        <div className="py-16 px-6 text-center space-y-3.5">
          <p className="text-sm text-slate-500">
            {searchQuery
              ? `Tidak ada produk dengan kata kunci "${searchQuery}"`
              : `Belum ada produk di server "${selectedChannel}".`}
          </p>
          <div className="flex justify-center gap-2">
            {selectedChannel !== 'ALL' && (
              <button
                onClick={() => setSelectedChannel('ALL')}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                Tampilkan Semua Server
              </button>
            )}
            {products.length === 0 && (
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="px-5 py-2.5 bg-slate-900 active:bg-slate-800 text-white rounded-xl text-sm font-bold cursor-pointer transition shadow-xs"
              >
                Muat Katalog Bawaan (DigiPos, WeKios, Perdana)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white divide-y divide-slate-100">
          {filteredProducts.map((product) => {
            const initials = getProductInitials(product);
            const isPhysical = product.isPhysical ?? product.trackStock ?? (product.stock > 0);
            const isOutOfStock = isPhysical && product.stock <= 0;
            const server = product.serverChannel || product.category;
            const category = product.category;

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="flex items-center justify-between px-4 py-4.5 sm:py-5 bg-white hover:bg-slate-50 active:bg-slate-100/90 transition-colors duration-75 cursor-pointer touch-manipulation border-b border-slate-100 last:border-b-0"
              >
                {/* Kiri: Kotak Avatar Inisial 56x56px */}
                <div className="flex items-center gap-4 min-w-0 pr-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200/90 text-slate-700 font-bold text-base flex items-center justify-center shrink-0 tracking-wider shadow-2xs">
                    {initials}
                  </div>

                  {/* Tengah: Nama Produk & Subteks Server & Kategori */}
                  <div className="min-w-0 space-y-1">
                    <h4 className="font-semibold text-slate-900 text-base truncate leading-snug">
                      {product.name}
                    </h4>

                    {/* Subteks: Harga Jual • Server • Kategori • Info Stok */}
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-black text-slate-900 tracking-tight text-base">
                        {formatRupiah(product.sellingPrice)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                          {server}
                        </span>
                        {category && category !== server && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 font-medium text-[11px] border border-slate-200">
                            {category}
                          </span>
                        )}
                        {isPhysical ? (
                          <span
                            className={
                              isOutOfStock
                                ? 'text-rose-600 font-bold text-xs'
                                : 'text-slate-500 font-medium text-xs'
                            }
                          >
                            • {isOutOfStock ? 'Stok Habis' : `Stok: ${product.stock}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-xs">
                            • Modal {formatRupiah(product.costPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kanan: Tombol Bulat (+) Ukuran Sentuh Mantap 44x44px */}
                <div className="shrink-0 pl-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(product);
                    }}
                    className="w-11 h-11 rounded-full bg-white border border-slate-300 text-slate-800 flex items-center justify-center active:bg-slate-100 active:scale-95 transition-all duration-75 cursor-pointer shadow-2xs"
                    title="Pilih Produk"
                  >
                    <Plus className="w-5 h-5 stroke-[2.4]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tombol Aksi Bawah: "+ Buat Produk Baru" & "Kelola Produk" */}
      <div className="px-4 pt-5 grid grid-cols-2 gap-2.5">
        <button
          onClick={onOpenCreateModal}
          className="h-12 bg-white border border-slate-300 hover:border-slate-400 active:bg-slate-100 text-slate-900 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <PlusCircle className="w-4 h-4 text-slate-700" />
          <span>+ Buat Produk</span>
        </button>

        {onOpenProductManagement && (
          <button
            onClick={onOpenProductManagement}
            className="h-12 bg-slate-900 hover:bg-black active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Package className="w-4 h-4 text-white" />
            <span>Manajemen Produk</span>
          </button>
        )}
      </div>

      {/* Bottom Sheet Filter Channel / Sumber Eksekusi */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 duration-150 flex flex-col max-h-[85vh]">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 sm:hidden" />
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Pilih Server / Eksekutor</h4>
                <p className="text-xs text-slate-500">Filter katalog kasir berdasarkan sumber modal & eksekusi</p>
              </div>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 divide-y divide-slate-100 overflow-y-auto flex-1">
              {/* Opsi Semua Produk */}
              <button
                type="button"
                onClick={() => {
                  setSelectedChannel('ALL');
                  setIsFilterSheetOpen(false);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 text-left transition cursor-pointer"
              >
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 text-sm block">Semua Server</span>
                  <span className="text-xs text-slate-500">Total {products.length} produk terdaftar</span>
                </div>
                {selectedChannel === 'ALL' && (
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
              </button>

              {/* Opsi Tiap Server Nyata */}
              {uniqueChannels.map((channel) => {
                const count = products.filter(
                  (p) => (p.serverChannel || p.category) === channel
                ).length;
                const isSelected = selectedChannel === channel;

                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(channel);
                      setIsFilterSheetOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 text-left transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 text-sm block truncate">{channel}</span>
                      <span className="text-xs text-slate-500">{count} item produk</span>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
