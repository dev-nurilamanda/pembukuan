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

export type ProductCategory = 'PHYSICAL' | 'DIGITAL';

export interface Product {
  id?: number; // autoincrement (++id)
  name: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  defaultWalletId?: string;
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

    // Define table schemas exactly according to specification
    this.version(1).stores({
      wallets: '&id, name, category, currentBalance, updatedAt',
      customers: '++id, name, phoneNumber, notes',
      products: '++id, name, category, costPrice, sellingPrice, stock, defaultWalletId',
      transactions: '&id, date, productId, productName, customerId, customerTarget, costPrice, sellingPrice, profit, outWalletId, inWalletId, paymentStatus, paymentMethod',
      walletTransfers: '++id, date, fromWalletId, toWalletId, amount, fee, notes',
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

/**
 * Meminta browser agar IndexedDB tidak dihapus otomatis oleh memory eviction
 */
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

// --- INITIAL SEED HELPER ---

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
    id: 'bank_main',
    name: 'Rekening Bank',
    category: 'BANK',
    currentBalance: 2000000,
    updatedAt: new Date().toISOString(),
    notes: 'Rekening operasional bank (BCA/BRI/Mandiri/dsb)',
  },
  {
    id: 'server_pulsa',
    name: 'Saldo Server Pulsa',
    category: 'SERVER',
    currentBalance: 1000000,
    updatedAt: new Date().toISOString(),
    notes: 'Deposit saldo modal transaksi pulsa, paket data, & token PLN',
  },
  {
    id: 'qris_ewallet',
    name: 'E-Wallet / QRIS',
    category: 'EWALLET',
    currentBalance: 350000,
    updatedAt: new Date().toISOString(),
    notes: 'Tampungan pembayaran QRIS, Gopay, OVO, ShopeePay, DANA',
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    name: 'Token PLN 20.000',
    category: 'DIGITAL',
    costPrice: 20300,
    sellingPrice: 23000,
    stock: 999,
    defaultWalletId: 'server_pulsa',
  },
  {
    name: 'Token PLN 50.000',
    category: 'DIGITAL',
    costPrice: 50300,
    sellingPrice: 53000,
    stock: 999,
    defaultWalletId: 'server_pulsa',
  },
  {
    name: 'Pulsa Telkomsel 10.000',
    category: 'DIGITAL',
    costPrice: 10250,
    sellingPrice: 12000,
    stock: 999,
    defaultWalletId: 'server_pulsa',
  },
  {
    name: 'Pulsa Telkomsel 25.000',
    category: 'DIGITAL',
    costPrice: 25100,
    sellingPrice: 27000,
    stock: 999,
    defaultWalletId: 'server_pulsa',
  },
  {
    name: 'Paket Data Indosat 10GB',
    category: 'DIGITAL',
    costPrice: 34500,
    sellingPrice: 40000,
    stock: 999,
    defaultWalletId: 'server_pulsa',
  },
  {
    name: 'Voucher Axis Aigo 2GB',
    category: 'PHYSICAL',
    costPrice: 11000,
    sellingPrice: 13500,
    stock: 14,
    defaultWalletId: 'cash_main',
  },
  {
    name: 'Voucher Smartfren Unlimited',
    category: 'PHYSICAL',
    costPrice: 22000,
    sellingPrice: 25000,
    stock: 8,
    defaultWalletId: 'cash_main',
  },
  {
    name: 'Air Mineral Botol 600ml',
    category: 'PHYSICAL',
    costPrice: 2500,
    sellingPrice: 4000,
    stock: 24,
    defaultWalletId: 'cash_main',
  },
];

/**
 * Seed produk awal jika database produk masih kosong
 */
export async function seedDefaultProducts(): Promise<boolean> {
  return await db.transaction('rw', db.products, async () => {
    const count = await db.products.count();
    if (count === 0) {
      await db.products.bulkAdd(DEFAULT_PRODUCTS);
      return true;
    }
    return false;
  });
}

/**
 * Seed kantong saldo awal jika belum ada data sama sekali
 */
export async function seedDefaultWallets(): Promise<boolean> {
  return await db.transaction('rw', db.wallets, async () => {
    const count = await db.wallets.count();
    if (count === 0) {
      await db.wallets.bulkAdd(DEFAULT_WALLETS);
      return true;
    }
    return false;
  });
}

