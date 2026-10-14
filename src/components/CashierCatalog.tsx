import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, SlidersHorizontal, PlusCircle } from 'lucide-react';
import { db, seedDefaultProducts, type Product } from '../db/db';
import { formatRupiah } from '../utils/formatters';

interface CashierCatalogProps {
  onSelectProduct: (product: Product) => void;
  onOpenCreateModal: () => void;
  searchQuery: string;
}

/**
 * Extract 2-3 letter initials for uniform neutral avatar
 */
function getProductInitials(product: Product): string {
  const name = product.name.toUpperCase().trim();
  if (name.includes('PLN') || name.includes('TOKEN')) return 'PLN';
  if (name.includes('TELKOMSEL') || name.includes('TSEL')) return 'TSL';
  if (name.includes('INDOSAT') || name.includes('ISAT')) return 'ISAT';
  if (name.includes('AXIS')) return 'AXS';
  if (name.includes('SMARTFREN')) return 'SMF';
  if (name.includes('VOUCHER')) return 'VOU';
  
  const words = name.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

export const CashierCatalog: React.FC<CashierCatalogProps> = ({
  onSelectProduct,
  onOpenCreateModal,
  searchQuery,
}) => {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'DIGITAL' | 'PHYSICAL'>('ALL');
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

  const filteredProducts = products.filter((p) => {
    const matchesFilter =
      selectedFilter === 'ALL' ? true : p.category === selectedFilter;
    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="pb-12 -mx-4">
      {/* Bar Kategori Monokrom Native */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-2 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        <div className="relative">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as 'ALL' | 'DIGITAL' | 'PHYSICAL')}
            className="appearance-none bg-white border border-slate-300 text-slate-900 font-semibold text-xs rounded-lg pl-3 pr-7 py-1.5 shadow-2xs hover:border-slate-400 focus:outline-none focus:border-slate-900 cursor-pointer"
          >
            <option value="ALL">Semua Produk ({products.length})</option>
            <option value="DIGITAL">Produk Digital</option>
            <option value="PHYSICAL">Produk Fisik</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 text-[10px]">
            ▼
          </div>
        </div>

        <button
          onClick={() => {
            const next = selectedFilter === 'ALL' ? 'DIGITAL' : selectedFilter === 'DIGITAL' ? 'PHYSICAL' : 'ALL';
            setSelectedFilter(next);
          }}
          className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-900 active:bg-slate-100 active:scale-95 transition cursor-pointer"
          title="Filter Kategori"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List Produk Edge-to-Edge Monokrom & Bersih */}
      {filteredProducts.length === 0 ? (
        <div className="py-14 px-6 text-center space-y-3">
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `Tidak ada produk dengan kata kunci "${searchQuery}"`
              : 'Belum ada produk di katalog.'}
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-4 py-2 bg-slate-900 active:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
            >
              Muat Katalog Bawaan
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white divide-y divide-slate-100">
          {filteredProducts.map((product) => {
            const initials = getProductInitials(product);
            const isPhysical = product.category === 'PHYSICAL';
            const isOutOfStock = isPhysical && product.stock <= 0;

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 active:bg-slate-100/80 transition-colors duration-75 cursor-pointer touch-manipulation border-b border-slate-100 last:border-b-0"
              >
                {/* Kiri: Kotak Avatar Inisial Seragam & Netral 48x48px (#f1f5f9 / text-slate-700) */}
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 tracking-wider">
                    {initials}
                  </div>

                  {/* Tengah: Nama Produk & Harga */}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 text-sm truncate leading-tight">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-slate-800 tracking-tight">
                        {formatRupiah(product.sellingPrice)}
                      </span>
                      {isPhysical && (
                        <span
                          className={`text-[11px] font-medium ${
                            isOutOfStock ? 'text-rose-600 font-bold' : 'text-slate-400'
                          }`}
                        >
                          • Stok: {product.stock}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kanan: Tombol Bulat (+) Netral & Native (Lingkaran Putih, Border Tipis, Ikon Hitam/Gelap) */}
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(product);
                    }}
                    className="w-10 h-10 rounded-full bg-white border border-slate-300 text-slate-800 flex items-center justify-center active:bg-slate-100 active:scale-95 transition-all duration-75 cursor-pointer shadow-2xs"
                    title="Pilih Produk"
                  >
                    <Plus className="w-5 h-5 stroke-[2.2]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tombol "+ Buat Produk Baru" Bersih (Solid/Outline Rounded, Bukan Dashed) */}
      <div className="px-4 pt-4">
        <button
          onClick={onOpenCreateModal}
          className="w-full py-3 bg-white border border-slate-300 hover:border-slate-400 active:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <PlusCircle className="w-4 h-4 text-slate-700" />
          <span>+ Buat Produk Baru</span>
        </button>
      </div>
    </div>
  );
};
