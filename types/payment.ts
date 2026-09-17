export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PAID'
  | 'REWARD_PENDING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

export interface PaymentRequest {
  id: string; // e.g. "db_8f72k9a1b2c3" (hex-safe)
  restaurantId: string;
  restaurantName: string;
  restaurantWallet: `0x${string}`;
  invoiceId: string; // Merchant order/invoice reference (e.g. "INV-2026-0891")
  tableNumber?: string;
  billAmount: number; // in USD / USDC units, e.g. 45.50
  currency: 'USDC';
  tokenAddress: `0x${string}`;
  cashbackBps: number; // e.g. 500 = 5%
  expectedCashback: number; // calculated preview in USDC
  maxCashback: number;
  campaignId?: string;
  campaignTitle?: string;
  status: PaymentStatus;
  paymentUrl: string;
  notes?: string;
  createdAt: number; // Unix timestamp in ms
  expiresAt: number; // Unix timestamp in ms
  updatedAt: number;

  // Blockchain settlement placeholders (Populated ONLY after on-chain verification in Phase 7/8)
  txHash?: `0x${string}` | null;
  blockNumber?: number | null;
  payerAddress?: `0x${string}` | null;
  chainId?: number | null;
  confirmedAt?: number | null;
}

export interface PaymentReceipt {
  paymentId: string;
  paymentRequestId: string;
  txHash: `0x${string}`;
  payer: `0x${string}`;
  restaurant: `0x${string}`;
  amount: number;
  cashbackAmount: number;
  blockNumber: number;
  timestamp: number;
  status: 'SUCCESS' | 'REVERTED';
}
