import Dexie, { type EntityTable } from 'dexie';

// --- INTERFACES & TYPES ---

export type WalletCategory = 'CASH' | 'BANK' | 'SERVER' | 'EWALLET' | 'OTHER';

export interface Wallet {
  id: string; // primary key (&id)
  name: string;
  category: WalletCategory;
  currentBalance: number;
  updatedAt: string; // ISO string
  notes?: string;
}

export interface Customer {
  id?: number; // autoincrement (++id)
  name: string;
  phoneNumber: string;
  notes?: string;
  createdAt?: string;
}

export interface Product {
  id?: number; // autoincrement (++id)
  name: string;
  serverChannel: string; // Nama Server / Aplikasi Eksekutor (misal: "Digipos Aja!", "WeKios", "Mitra Bukalapak", "Server PLN", "Toko Fisik")
  category: string; // Jenis Kategori Produk (misal: "Pulsa Reguler", "Paket Data", "Token Listrik", "Kartu Perdana", "Voucher Fisik", "Aksesoris")
  costPrice: number;
  sellingPrice: number;
  stock: number;
  isPhysical: boolean; // True jika barang fisik (kelola stok)
  trackStock?: boolean; // alias kompatibilitas
  defaultWalletId?: string; // id dompet modal yang otomatis terpotong
  sku?: string;
}

export type PaymentStatus = 'PAID' | 'UNPAID';

export interface Transaction {
  id: string; // primary key (&id), e.g., 'TRX-1712345678-ABCD'
  date: string; // ISO string
  productId: number;
  productName: string;
  customerId?: number | null;
  customerTarget?: string; // target input: no hp pulsa, id pln, atau nama pembeli
  costPrice: number;
  sellingPrice: number;
  profit: number;
  outWalletId: string; // dompet modal terpotong
  inWalletId: string; // dompet penerima hasil penjualan
  paymentStatus: PaymentStatus;
  paymentMethod: string; // 'CASH' | 'TRANSFER' | 'QRIS' | 'HUTANG' dll
  notes?: string;
}

export interface WalletTransfer {
  id?: number; // autoincrement (++id)
  date: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  fee: number;
  notes?: string;
}

// --- DEXIE DATABASE CLASS ---

export class KasirMandiriDatabase extends Dexie {
  wallets!: EntityTable<Wallet, 'id'>;
  customers!: EntityTable<Customer, 'id'>;
  products!: EntityTable<Product, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  walletTransfers!: EntityTable<WalletTransfer, 'id'>;

  constructor() {
    super('KasirMandiriDB');

    this.version(1).stores({
      wallets: '&id, name, category, currentBalance, updatedAt',
      customers: '++id, name, phoneNumber, notes',
      products: '++id, name, category, costPrice, sellingPrice, stock, defaultWalletId',
      transactions: '&id, date, productId, productName, customerId, customerTarget, costPrice, sellingPrice, profit, outWalletId, inWalletId, paymentStatus, paymentMethod',
      walletTransfers: '++id, date, fromWalletId, toWalletId, amount, fee, notes',
    });

    this.version(2).stores({
      products: '++id, name, serverChannel, category, costPrice, sellingPrice, stock, defaultWalletId, isPhysical',
    }).upgrade(async tx => {
      const productsTable = tx.table<Product, number>('products');
      const all = await productsTable.toArray();
      for (const p of all) {
        const anyP = p as unknown as Record<string, unknown>;
        if (!anyP.serverChannel) {
          const oldCat = (p.category || '') as string;
          let channel = 'Toko Fisik';
          let cat = oldCat;
          if (oldCat.includes('DigiPos') || oldCat.includes('Digipos')) {
            channel = 'Digipos Aja!';
            cat = p.name.includes('Data') ? 'Paket Data' : 'Pulsa Reguler';
          } else if (oldCat.includes('WeKios')) {
            channel = 'WeKios';
            cat = p.name.includes('DANA') ? 'E-Wallet' : 'Paket Data';
          } else if (oldCat.includes('PLN')) {
            channel = 'Server PLN';
            cat = 'Token Listrik';
          } else if (oldCat.includes('Perdana')) {
            channel = 'Toko Fisik';
            cat = 'Kartu Perdana';
          }
          await productsTable.update(p.id!, {
            serverChannel: channel,
            category: cat || 'Umum',
            isPhysical: p.isPhysical ?? p.trackStock ?? (p.stock > 0),
          });
        }
      }
    });
  }
}

export const db = new KasirMandiriDatabase();

// --- PERSISTENT STORAGE HELPER ---

export interface StorageStatus {
  isPersisted: boolean;
  quotaBytes?: number;
  usedBytes?: number;
  percentUsed?: number;
}

export async function requestPersistentStorage(): Promise<StorageStatus> {
  let isPersisted = false;

  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      isPersisted = await navigator.storage.persist();
      if (!isPersisted && navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
    } catch (err) {
      console.warn('Gagal meminta persistent storage:', err);
    }
  }

  let quotaBytes: number | undefined;
  let usedBytes: number | undefined;
  let percentUsed: number | undefined;

  if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usedBytes = estimate.usage;
      if (quotaBytes && usedBytes !== undefined) {
        percentUsed = Number(((usedBytes / quotaBytes) * 100).toFixed(2));
      }
    } catch (err) {
      console.warn('Gagal estimasi kuota penyimpanan:', err);
    }
  }

  return { isPersisted, quotaBytes, usedBytes, percentUsed };
}

// --- INITIAL SEED HELPER (Data Nyata Berbasis Channel & Server) ---

export const DEFAULT_WALLETS: Wallet[] = [
  {
    id: 'cash_main',
    name: 'Kas Tunai (Laci)',
    category: 'CASH',
    currentBalance: 500000,
    updatedAt: new Date().toISOString(),
    notes: 'Uang fisik tunai kasir & uang kembalian',
  },
  {
    id: 'server_digipos',
    name: 'Saldo DigiPos Aja!',
    category: 'SERVER',
    currentBalance: 850000,
    updatedAt: new Date().toISOString(),
    notes: 'Modal pulsa, paket data & perdana Telkomsel',
  },
  {
    id: 'server_wekios',
    name: 'Saldo WeKios',
    category: 'SERVER',
    currentBalance: 950000,
    updatedAt: new Date().toISOString(),
    notes: 'Modal e-wallet, data all operator & multipayment',
  },
  {
    id: 'server_pln',
    name: 'Saldo Server PLN',
    category: 'SERVER',
    currentBalance: 1200000,
    updatedAt: new Date().toISOString(),
    notes: 'Modal token listrik PLN & tagihan',
  },
  {
    id: 'bank_main',
    name: 'Rekening Bank',
    category: 'BANK',
    currentBalance: 2500000,
    updatedAt: new Date().toISOString(),
    notes: 'Rekening operasional bank',
  },
  {
    id: 'qris_ewallet',
    name: 'QRIS / E-Wallet',
    category: 'EWALLET',
    currentBalance: 400000,
    updatedAt: new Date().toISOString(),
    notes: 'Tampungan pembayaran QRIS masuk',
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  // DigiPos Aja! (Server Eksekutor)
  {
    name: 'Telkomsel Data 14GB 30 Hari',
    serverChannel: 'Digipos Aja!',
    category: 'Paket Data',
    costPrice: 42000,
    sellingPrice: 47000,
    stock: 0,
    isPhysical: false,
    trackStock: false,
    defaultWalletId: 'server_digipos',
  },
  {
    name: 'Pulsa Telkomsel 10.000',
    serverChannel: 'Digipos Aja!',
    category: 'Pulsa Reguler',
    costPrice: 10250,
    sellingPrice: 12000,
    stock: 0,
    isPhysical: false,
    trackStock: false,
    defaultWalletId: 'server_digipos',
  },
  {
    name: 'Pulsa Telkomsel 25.000',
    serverChannel: 'Digipos Aja!',
    category: 'Pulsa Reguler',
    costPrice: 25100,
    sellingPrice: 27000,
    stock: 0,
    isPhysical: false,
    trackStock: false,
    defaultWalletId: 'server_digipos',
  },

  // WeKios
  {
    name: 'Topup Saldo DANA 50.000',
    serverChannel: 'WeKios',
    category: 'E-Wallet',
    costPrice: 50500,
    sellingPrice: 52500,
    stock: 0,
    isPhysical: false,
    trackStock: false,
    defaultWalletId: 'server_wekios',
  },
  {
    name: 'Paket Data Indosat 10GB',
    serverChannel: 'WeKios',
    category: 'Paket Data',
    costPrice: 34500,
    sellingPrice: 40000,
    stock: 0,
    isPhysical: false,
    trackStock: false,
    defaultWalletId: 'server_wekios',
  },

  // Server PLN
  {
    name: 'Token PLN 20.000',
    serverChannel: 'Server PLN',
    category: 'Token Listrik',
    costPrice: 20300,
    sellingPrice: 23000,
    stock: 0,
    isPhysical: false,
    trackStock: false,
    defaultWalletId: 'server_pln',
  },
  {
    name: 'Token PLN 50.000',
    serverChannel: 'Server PLN',
    category: 'Token Listrik',
    costPrice: 50300,
    sellingPrice: 53000,
    stock: 0,
    isPhysical: false,
    trackStock: false,
    defaultWalletId: 'server_pln',
  },

  // Toko Fisik (Barang Fisik Memiliki Stok)
  {
    name: 'Perdana Telkomsel Lite 3GB',
    serverChannel: 'Toko Fisik',
    category: 'Kartu Perdana',
    costPrice: 18000,
    sellingPrice: 22000,
    stock: 12,
    isPhysical: true,
    trackStock: true,
    defaultWalletId: 'cash_main',
  },
  {
    name: 'Perdana Telkomsel By.U 10GB',
    serverChannel: 'Toko Fisik',
    category: 'Kartu Perdana',
    costPrice: 28000,
    sellingPrice: 33000,
    stock: 8,
    isPhysical: true,
    trackStock: true,
    defaultWalletId: 'cash_main',
  },
  {
    name: 'Perdana Telkomsel Super Seru 25GB',
    serverChannel: 'Toko Fisik',
    category: 'Kartu Perdana',
    costPrice: 45000,
    sellingPrice: 52000,
    stock: 5,
    isPhysical: true,
    trackStock: true,
    defaultWalletId: 'cash_main',
  },
  {
    name: 'Voucher Telkomsel 2.5GB 5 Hari',
    serverChannel: 'Toko Fisik',
    category: 'Voucher Fisik',
    costPrice: 10000,
    sellingPrice: 12500,
    stock: 20,
    isPhysical: true,
    trackStock: true,
    defaultWalletId: 'cash_main',
  },
  {
    name: 'Kabel Data Type-C Fast Charging',
    serverChannel: 'Toko Fisik',
    category: 'Aksesoris',
    costPrice: 12000,
    sellingPrice: 25000,
    stock: 15,
    isPhysical: true,
    trackStock: true,
    defaultWalletId: 'cash_main',
  },
];

/**
 * Seed produk awal berbasis channel eksekusi & kategori nyata
 */
export async function seedDefaultProducts(): Promise<boolean> {
  return await db.transaction('rw', db.products, async () => {
    const existing = await db.products.toArray();
    if (existing.length === 0) {
      await db.products.bulkAdd(DEFAULT_PRODUCTS);
      return true;
    }

    // Auto-update jika masih ada data yang belum memiliki serverChannel
    const hasMissingServerChannel = existing.some((p) => !p.serverChannel);
    if (hasMissingServerChannel) {
      for (const p of existing) {
        if (!p.serverChannel) {
          const oldCat = p.category || '';
          let channel = 'Toko Fisik';
          let cat = oldCat;
          if (oldCat.includes('DigiPos') || oldCat.includes('Digipos')) {
            channel = 'Digipos Aja!';
            cat = p.name.includes('Data') ? 'Paket Data' : 'Pulsa Reguler';
          } else if (oldCat.includes('WeKios')) {
            channel = 'WeKios';
            cat = p.name.includes('DANA') ? 'E-Wallet' : 'Paket Data';
          } else if (oldCat.includes('PLN')) {
            channel = 'Server PLN';
            cat = 'Token Listrik';
          } else if (oldCat.includes('Perdana')) {
            channel = 'Toko Fisik';
            cat = 'Kartu Perdana';
          }
          await db.products.update(p.id!, {
            serverChannel: channel,
            category: cat || 'Umum',
            isPhysical: p.isPhysical ?? p.trackStock ?? (p.stock > 0),
          });
        }
      }
      return true;
    }

    return false;
  });
}

/**
 * Seed kantong saldo modal bawaan
 */
export async function seedDefaultWallets(): Promise<boolean> {
  return await db.transaction('rw', db.wallets, async () => {
    const count = await db.wallets.count();
    if (count === 0) {
      await db.wallets.bulkAdd(DEFAULT_WALLETS);
      return true;
    }

    // Pastikan server_digipos dan server_wekios terdaftar
    const hasDigipos = await db.wallets.get('server_digipos');
    if (!hasDigipos) {
      await db.wallets.put({
        id: 'server_digipos',
        name: 'Saldo DigiPos Aja!',
        category: 'SERVER',
        currentBalance: 850000,
        updatedAt: new Date().toISOString(),
        notes: 'Modal DigiPos Aja!',
      });
    }

    const hasWekios = await db.wallets.get('server_wekios');
    if (!hasWekios) {
      await db.wallets.put({
        id: 'server_wekios',
        name: 'Saldo WeKios',
        category: 'SERVER',
        currentBalance: 950000,
        updatedAt: new Date().toISOString(),
        notes: 'Modal WeKios',
      });
    }

    return false;
  });
}
