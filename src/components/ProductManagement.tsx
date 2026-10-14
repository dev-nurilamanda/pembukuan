import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  Zap,
  Layers,
  Tag,
  AlertCircle,
  X,
  Check,
  TrendingUp,
  Boxes,
  ChevronDown,
} from 'lucide-react';
import { db, type Product } from '../db/db';
import { formatRupiah } from '../utils/formatters';

interface ProductManagementProps {
  onBackToCashier?: () => void;
}

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

const COMMON_SERVERS = [
  'Digipos Aja!',
  'WeKios',
  'Server PLN',
  'Toko Fisik',
  'Mitra Bukalapak',
  'BSI / Bank',
  'DANA Bisnis',
];

export const ProductManagement: React.FC<ProductManagementProps> = ({
  onBackToCashier,
}) => {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const wallets = useLiveQuery(() => db.wallets.toArray(), []) || [];

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Price Edit State
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [quickCostPrice, setQuickCostPrice] = useState<number>(0);
  const [quickSellingPrice, setQuickSellingPrice] = useState<number>(0);
  const [isSavingQuickPrice, setIsSavingQuickPrice] = useState(false);

  // Form Fields for Full Modal
  const [formName, setFormName] = useState('');
  const [formServer, setFormServer] = useState('Digipos Aja!');
  const [customServer, setCustomServer] = useState('');
  const [formCategory, setFormCategory] = useState('Pulsa Reguler');
  const [customCategory, setCustomCategory] = useState('');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formDefaultWalletId, setFormDefaultWalletId] = useState('server_digipos');
  const [formIsPhysical, setFormIsPhysical] = useState(false);
  const [formStock, setFormStock] = useState<number>(10);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unique server list from db + common
  const serverOptions = useMemo(() => {
    const list = new Set([
      ...COMMON_SERVERS,
      ...products.map((p) => p.serverChannel || p.category).filter(Boolean),
    ]);
    return Array.from(list);
  }, [products]);

  // Unique category list from db + common
  const categoryOptions = useMemo(() => {
    const list = new Set([
      ...COMMON_CATEGORIES,
      ...products.map((p) => p.category).filter(Boolean),
    ]);
    return Array.from(list);
  }, [products]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalVariants = products.length;
    let totalStockAssetValue = 0;
    let totalProfit = 0;
    let totalMarginPercent = 0;

    products.forEach((p) => {
      const isPhys = p.isPhysical ?? p.trackStock ?? (p.stock > 0);
      if (isPhys && p.stock > 0) {
        totalStockAssetValue += p.costPrice * p.stock;
      }
      const profit = p.sellingPrice - p.costPrice;
      totalProfit += profit;
      if (p.costPrice > 0) {
        totalMarginPercent += (profit / p.costPrice) * 100;
      }
    });

    const avgProfit = totalVariants > 0 ? Math.round(totalProfit / totalVariants) : 0;
    const avgMarginPercent =
      totalVariants > 0 ? (totalMarginPercent / totalVariants).toFixed(1) : '0';

    return {
      totalVariants,
      totalStockAssetValue,
      avgProfit,
      avgMarginPercent,
    };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const server = p.serverChannel || p.category || '';
      const category = p.category || '';

      const matchServer = selectedServer === 'ALL' || server === selectedServer;
      const matchCat = selectedCategory === 'ALL' || category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        server.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q);

      return matchServer && matchCat && matchSearch;
    });
  }, [products, selectedServer, selectedCategory, searchQuery]);

  // Handlers for Full Modal
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormServer('Digipos Aja!');
    setCustomServer('');
    setFormCategory('Pulsa Reguler');
    setCustomCategory('');
    setFormCostPrice(0);
    setFormSellingPrice(0);
    setFormDefaultWalletId('server_digipos');
    setFormIsPhysical(false);
    setFormStock(10);
    setFormError(null);
    setIsFullModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);

    const sChannel = p.serverChannel || p.category || 'Digipos Aja!';
    if (serverOptions.includes(sChannel)) {
      setFormServer(sChannel);
      setCustomServer('');
    } else {
      setFormServer('CUSTOM');
      setCustomServer(sChannel);
    }

    const cat = p.category || 'Pulsa Reguler';
    if (categoryOptions.includes(cat)) {
      setFormCategory(cat);
      setCustomCategory('');
    } else {
      setFormCategory('CUSTOM');
      setCustomCategory(cat);
    }

    setFormCostPrice(p.costPrice);
    setFormSellingPrice(p.sellingPrice);
    setFormDefaultWalletId(p.defaultWalletId || 'cash_main');
    const isPhys = p.isPhysical ?? p.trackStock ?? (p.stock > 0);
    setFormIsPhysical(isPhys);
    setFormStock(p.stock || 0);
    setFormError(null);
    setIsFullModalOpen(true);
  };

  // Auto-matching default wallet when server changes
  const handleServerSelectionChange = (val: string) => {
    setFormServer(val);
    const lower = val.toLowerCase();
    const matched = wallets.find((w) => {
      const idLower = w.id.toLowerCase();
      const nameLower = w.name.toLowerCase();
      if (lower.includes('digipos') && (idLower.includes('digipos') || nameLower.includes('digipos'))) return true;
      if (lower.includes('wekios') && (idLower.includes('wekios') || nameLower.includes('wekios'))) return true;
      if (lower.includes('pln') && (idLower.includes('pln') || nameLower.includes('pln'))) return true;
      if (lower.includes('fisik') || lower.includes('toko')) {
        return w.category === 'CASH' || idLower.includes('cash');
      }
      return nameLower.includes(lower);
    });

    if (matched) {
      setFormDefaultWalletId(matched.id);
    }

    // Auto toggle physical if Toko Fisik is picked
    if (lower.includes('fisik') || lower.includes('perdana') || lower.includes('voucher') || lower.includes('aksesoris')) {
      setFormIsPhysical(true);
    }
  };

  const handleSaveFullProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Nama produk wajib diisi.');
      return;
    }
    if (formCostPrice < 0 || formSellingPrice < 0) {
      setFormError('Harga modal atau harga jual tidak boleh negatif.');
      return;
    }

    const finalServer =
      formServer === 'CUSTOM' ? customServer.trim() || 'Server Eksternal' : formServer;
    const finalCategory =
      formCategory === 'CUSTOM' ? customCategory.trim() || 'Umum' : formCategory;

    setIsSubmitting(true);
    try {
      const payload: Omit<Product, 'id'> = {
        name: formName.trim(),
        serverChannel: finalServer,
        category: finalCategory,
        costPrice: Number(formCostPrice) || 0,
        sellingPrice: Number(formSellingPrice) || 0,
        isPhysical: formIsPhysical,
        trackStock: formIsPhysical,
        stock: formIsPhysical ? Number(formStock) || 0 : 0,
        defaultWalletId: formDefaultWalletId || undefined,
      };

      if (editingProduct?.id) {
        await db.products.update(editingProduct.id, payload);
      } else {
        await db.products.add(payload as Product);
      }

      setIsFullModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Gagal menyimpan data produk ke IndexedDB.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!p.id) return;
    const confirmed = window.confirm(
      `Hapus produk "${p.name}" dari katalog?\nData yang terhapus tidak dapat dikembalikan.`
    );
    if (!confirmed) return;

    try {
      await db.products.delete(p.id);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus produk.');
    }
  };

  // Handlers for Quick Price Edit
  const openQuickPriceModal = (p: Product) => {
    setQuickPriceProduct(p);
    setQuickCostPrice(p.costPrice);
    setQuickSellingPrice(p.sellingPrice);
  };

  const handleSaveQuickPrice = async () => {
    if (!quickPriceProduct?.id) return;
    if (quickCostPrice < 0 || quickSellingPrice < 0) {
      alert('Harga modal atau harga jual tidak boleh bernilai negatif.');
      return;
    }

    setIsSavingQuickPrice(true);
    try {
      await db.products.update(quickPriceProduct.id, {
        costPrice: Number(quickCostPrice) || 0,
        sellingPrice: Number(quickSellingPrice) || 0,
      });
      setQuickPriceProduct(null);
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui harga produk.');
    } finally {
      setIsSavingQuickPrice(false);
    }
  };

  return (
    <div className="w-full space-y-2.5 pb-20">
      {/* 1. Header Bersih Sejajar Tanpa Subteks Boros Ruang */}
      <div className="flex items-center justify-between gap-3 pt-0.5 w-full">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Package className="w-5 h-5 text-slate-800" />
          <span>Manajemen Produk</span>
        </h2>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ Tambah</span>
        </button>
      </div>

      {/* 2. Kartu Ringkasan Finansial & Varian (Padat & Hemat Ruang) */}
      <div className="grid grid-cols-3 gap-2 w-full">
        <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs w-full min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
            <Boxes className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">Varian</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">
            {summaryMetrics.totalVariants} <span className="text-[10px] font-medium text-slate-500">item</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs w-full min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
            <Package className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">Aset Stok</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">
            {formatRupiah(summaryMetrics.totalStockAssetValue)}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs w-full min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 uppercase tracking-tight">
            <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">Rata Laba</span>
          </div>
          <div className="text-xs sm:text-sm font-black text-emerald-700 truncate mt-0.5">
            {formatRupiah(summaryMetrics.avgProfit)}{' '}
            <span className="text-[10px] text-emerald-600 font-semibold">
              (+{summaryMetrics.avgMarginPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bar Pencarian & Filter Pill Mandiri (Tanpa Outer Box) */}
      <div className="space-y-2 w-full">
        {/* Kolom Pencarian h-11 Mandiri */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama produk, server, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-white border border-slate-200 rounded-xl pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills Berdampingan di Bawah Search */}
        <div className="flex items-center gap-2 w-full">
          {/* Pill Server */}
          <div className="relative flex-1 min-w-0">
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="w-full h-9 bg-white border border-slate-200 hover:border-slate-300 rounded-full pl-3 pr-7 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-900 shadow-2xs cursor-pointer appearance-none truncate transition"
            >
              <option value="ALL">Semua Server ({products.length})</option>
              {serverOptions.map((s) => {
                const count = products.filter(
                  (p) => (p.serverChannel || p.category) === s
                ).length;
                return (
                  <option key={s} value={s}>
                    {s} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Pill Kategori */}
          <div className="relative flex-1 min-w-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 bg-white border border-slate-200 hover:border-slate-300 rounded-full pl-3 pr-7 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-900 shadow-2xs cursor-pointer appearance-none truncate transition"
            >
              <option value="ALL">Semua Kategori</option>
              {categoryOptions.map((c) => {
                const count = products.filter((p) => p.category === c).length;
                return (
                  <option key={c} value={c}>
                    {c} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Active Filter Clear Indicator */}
        {(selectedServer !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
          <div className="flex items-center justify-between px-1 text-xs pt-0.5 w-full">
            <span className="text-slate-500 font-medium text-[11px]">
              Menampilkan <strong>{filteredProducts.length}</strong> dari{' '}
              {products.length} produk
            </span>
            <button
              onClick={() => {
                setSelectedServer('ALL');
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="text-slate-900 font-bold hover:underline cursor-pointer text-[11px]"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* 4. Daftar Produk (Edge-to-Edge List Bersih & Lega) */}
      <div className="-mx-3 bg-white border-y border-slate-200 divide-y divide-slate-100 w-[calc(100%+1.5rem)]">
        {filteredProducts.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">
              {searchQuery
                ? `Tidak ditemukan produk dengan kata kunci "${searchQuery}".`
                : 'Belum ada produk untuk kriteria filter yang dipilih.'}
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
            >
              + Tambah Produk Baru
            </button>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const server = p.serverChannel || p.category || 'Toko Fisik';
            const category = p.category || 'Umum';
            const isPhys = p.isPhysical ?? p.trackStock ?? (p.stock > 0);
            const isOutOfStock = isPhys && p.stock <= 0;
            const profitRp = p.sellingPrice - p.costPrice;
            const marginPercent =
              p.costPrice > 0
                ? ((profitRp / p.costPrice) * 100).toFixed(1)
                : '100.0';

            return (
              <div
                key={p.id}
                className="px-4 py-4 sm:py-5 hover:bg-slate-50 transition-colors space-y-3"
              >
                {/* Baris Atas: Nama Produk & Tag Server/Kategori */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                        {server}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 font-semibold text-[11px] border border-slate-200">
                        {category}
                      </span>
                      {isPhys ? (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isOutOfStock ? 'Stok Habis' : `Stok: ${p.stock}`}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Non-Fisik
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi Kanan: Quick Edit, Edit, Hapus (Gaya Outline Halus, Stroke 1.75, Sejajar & Minimalis) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openQuickPriceModal(p)}
                      className="p-2 text-slate-600 hover:text-amber-600 hover:bg-slate-100 active:bg-slate-100 active:scale-95 rounded-lg transition cursor-pointer"
                      title="Update Harga Cepat"
                    >
                      <Zap className="w-4 h-4 stroke-[1.75]" />
                    </button>

                    <button
                      onClick={() => openEditModal(p)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-100 active:scale-95 rounded-lg transition cursor-pointer"
                      title="Edit Detail Produk"
                    >
                      <Edit2 className="w-4 h-4 stroke-[1.75]" />
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(p)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 active:bg-rose-100 active:scale-95 rounded-lg transition cursor-pointer"
                      title="Hapus Produk"
                    >
                      <Trash2 className="w-4 h-4 stroke-[1.75]" />
                    </button>
                  </div>
                </div>

                {/* Baris Bawah: Rincian Finansial (Modal vs Jual vs Laba) */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">
                      Harga Modal
                    </span>
                    <span className="font-bold text-slate-700">
                      {formatRupiah(p.costPrice)}
                    </span>
                  </div>

                  <div className="text-right sm:text-center">
                    <span className="text-[11px] text-slate-500 block font-medium">
                      Harga Jual
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {formatRupiah(p.sellingPrice)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-emerald-700 font-semibold block">
                      Margin Laba
                    </span>
                    <span className="font-black text-emerald-700 text-xs sm:text-sm">
                      +{formatRupiah(profitRp)}
                      <span className="text-[10px] ml-1 text-emerald-600 font-bold">
                        ({marginPercent}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. MODAL UPDATE HARGA CEPAT (Quick Price Edit) */}
      {quickPriceProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl border border-slate-200/80">
                  <Zap className="w-4 h-4 stroke-[1.75] text-slate-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Ubah Harga Cepat
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Penyesuaian saat harga server atau modal berubah
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickPriceProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Produk
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                  {quickPriceProduct.name}
                </h4>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                  {quickPriceProduct.serverChannel || quickPriceProduct.category}
                </span>
              </div>

              {/* Input Modal */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Harga Modal Baru (Beli Server):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={quickCostPrice || ''}
                    onChange={(e) => setQuickCostPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-bold text-sm focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Input Jual */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Harga Jual Baru (Ke Pembeli):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={quickSellingPrice || ''}
                    onChange={(e) => setQuickSellingPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-bold text-sm focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Margin Calculation Card */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 font-medium block">
                    Estimasi Laba Bersih
                  </span>
                  <span className="text-sm font-black text-emerald-900">
                    +{formatRupiah(quickSellingPrice - quickCostPrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-emerald-800 font-medium block">
                    Margin
                  </span>
                  <span className="text-xs font-bold text-emerald-900">
                    {quickCostPrice > 0
                      ? `+${(((quickSellingPrice - quickCostPrice) / quickCostPrice) * 100).toFixed(1)}%`
                      : '100%'}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPriceProduct(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingQuickPrice}
                  onClick={handleSaveQuickPrice}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black active:scale-95 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingQuickPrice ? 'Menyimpan...' : 'Simpan Harga'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL PENUH: TAMBAH & EDIT DETAIL PRODUK */}
      {isFullModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingProduct ? 'Edit Data Produk' : 'Tambah Produk Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur nama, server eksekutor, harga & stok
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFullModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 active:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveFullProduct}
              className="p-5 space-y-4 text-xs text-slate-800 max-h-[82vh] overflow-y-auto"
            >
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
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
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-sm focus:border-slate-900 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* 2. Server / Aplikasi Eksekutor */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                  Server / Aplikasi Eksekutor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formServer}
                  onChange={(e) => handleServerSelectionChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-xs cursor-pointer focus:border-slate-900"
                >
                  {serverOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Ketik Server / Channel Baru...</option>
                </select>

                {formServer === 'CUSTOM' && (
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Contoh: Mitra Tokopedia, BSI Smart, Kiosbank"
                    value={customServer}
                    onChange={(e) => setCustomServer(e.target.value)}
                    className="w-full mt-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:bg-white focus:border-slate-900"
                  />
                )}
              </div>

              {/* 3. Kategori Produk */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                  Jenis Kategori Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-xs cursor-pointer focus:border-slate-900"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Ketik Kategori Baru...</option>
                </select>

                {formCategory === 'CUSTOM' && (
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Contoh: Paket Roaming, Voucher Wifi, Game Topup"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full mt-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:bg-white focus:border-slate-900"
                  />
                )}
              </div>

              {/* 4. Kantong Modal Default */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 font-bold text-xs">
                    Kantong Modal Terpotong:
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Otomatis terkunci saat transaksi kasir
                  </span>
                </div>
                <select
                  value={formDefaultWalletId}
                  onChange={(e) => setFormDefaultWalletId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-semibold text-xs cursor-pointer focus:border-slate-900"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Switch: Barang Fisik (Memiliki Stok) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Barang Fisik (Memiliki Stok)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formIsPhysical
                        ? 'Stok berkurang otomatis saat kasir memproses pesanan'
                        : 'Produk digital/server (tanpa batas stok fisik)'}
                    </span>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setFormIsPhysical(!formIsPhysical)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formIsPhysical ? 'bg-slate-900' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                        formIsPhysical ? 'left-6.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {formIsPhysical && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                      Jumlah Stok Tersedia:
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:border-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* 6. Harga Modal & Jual */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                    Harga Modal (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={formCostPrice || ''}
                      onChange={(e) => setFormCostPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-bold text-xs focus:border-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                    Harga Jual (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={formSellingPrice || ''}
                      onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-bold text-xs focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 7. Live Margin Calculation */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 font-semibold block">
                    Estimasi Laba Bersih
                  </span>
                  <span className="text-sm font-black text-emerald-900">
                    +{formatRupiah(formSellingPrice - formCostPrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-emerald-800 font-semibold block">
                    Margin
                  </span>
                  <span className="text-xs font-bold text-emerald-900">
                    {formCostPrice > 0
                      ? `+${(((formSellingPrice - formCostPrice) / formCostPrice) * 100).toFixed(1)}%`
                      : '100%'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFullModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Menyimpan...'
                    : editingProduct
                    ? 'Simpan Perubahan'
                    : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
