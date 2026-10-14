import { db, type Transaction, type Product, type PaymentStatus } from './db';

export interface CreateTransactionPayload {
  productId?: number;
  productName: string;
  category?: 'PHYSICAL' | 'DIGITAL';
  customerTarget?: string;
  customerId?: number | null;
  costPrice: number;
  sellingPrice: number;
  outWalletId: string;
  inWalletId: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes?: string;
  quantity?: number;
}

/**
 * Eksekusi transaksi kasir secara ATOMIK menggunakan db.transaction
 */
export async function executeCashierTransaction(
  payload: CreateTransactionPayload
): Promise<Transaction> {
  const qty = payload.quantity && payload.quantity > 0 ? payload.quantity : 1;
  const totalCost = payload.costPrice * qty;
  const totalSelling = payload.sellingPrice * qty;
  const profit = totalSelling - totalCost;

  const txnId = `TRX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const transactionRecord: Transaction = {
    id: txnId,
    date: new Date().toISOString(),
    productId: payload.productId || 0,
    productName: payload.productName,
    customerId: payload.customerId || null,
    customerTarget: payload.customerTarget?.trim() || undefined,
    costPrice: totalCost,
    sellingPrice: totalSelling,
    profit,
    outWalletId: payload.outWalletId,
    inWalletId: payload.inWalletId,
    paymentStatus: payload.paymentStatus,
    paymentMethod: payload.paymentMethod,
    notes: payload.notes?.trim() || undefined,
  };

  await db.transaction('rw', [db.wallets, db.products, db.transactions, db.customers], async () => {
    // 1. Ambil dompet modal (outWalletId)
    const outWallet = await db.wallets.get(payload.outWalletId);
    if (!outWallet) {
      throw new Error(`Kantong modal sumber (${payload.outWalletId}) tidak ditemukan.`);
    }

    // 2. Potong saldo modal di outWalletId sebesar totalCost
    await db.wallets.update(payload.outWalletId, {
      currentBalance: outWallet.currentBalance - totalCost,
      updatedAt: new Date().toISOString(),
    });

    // 3. Jika status PAID, tambah saldo inWalletId sebesar totalSelling
    if (payload.paymentStatus === 'PAID') {
      const inWallet = await db.wallets.get(payload.inWalletId);
      if (!inWallet) {
        throw new Error(`Kantong tampungan (${payload.inWalletId}) tidak ditemukan.`);
      }
      await db.wallets.update(payload.inWalletId, {
        currentBalance: inWallet.currentBalance + totalSelling,
        updatedAt: new Date().toISOString(),
      });
    }
    // Jika UNPAID: saldo inWalletId TIDAK bertambah

    // 4. Jika produk fisik, kurangi stok barang
    if (payload.productId && payload.productId > 0) {
      const product = await db.products.get(payload.productId);
      if (product && product.category === 'PHYSICAL') {
        const newStock = Math.max(0, product.stock - qty);
        await db.products.update(payload.productId, {
          stock: newStock,
        });
      }
    }

    // 5. Simpan catatan transaksi
    await db.transactions.add(transactionRecord);
  });

  return transactionRecord;
}

/**
 * Melunasi piutang (UNPAID -> PAID):
 * Menambah saldo inWalletId sebesar sellingPrice transaksi
 */
export async function settleUnpaidTransaction(
  transactionId: string,
  settleInWalletId: string,
  settlePaymentMethod: string
): Promise<void> {
  await db.transaction('rw', [db.wallets, db.transactions], async () => {
    const txn = await db.transactions.get(transactionId);
    if (!txn) throw new Error('Data transaksi tidak ditemukan.');
    if (txn.paymentStatus === 'PAID') throw new Error('Transaksi ini sudah lunas.');

    const inWallet = await db.wallets.get(settleInWalletId);
    if (!inWallet) throw new Error('Kantong penerima pelunasan tidak ditemukan.');

    // Tambah saldo penerima
    await db.wallets.update(settleInWalletId, {
      currentBalance: inWallet.currentBalance + txn.sellingPrice,
      updatedAt: new Date().toISOString(),
    });

    // Perbarui status transaksi
    await db.transactions.update(transactionId, {
      paymentStatus: 'PAID',
      inWalletId: settleInWalletId,
      paymentMethod: settlePaymentMethod,
      notes: txn.notes ? `${txn.notes} (Dilunasi ${new Date().toLocaleDateString('id-ID')})` : `Dilunasi ${new Date().toLocaleDateString('id-ID')}`,
    });
  });
}
