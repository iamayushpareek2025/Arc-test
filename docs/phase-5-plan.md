# DineBack — Phase 5: Restaurant + Payment Request System Architecture

## 1. Overview & Objective
Phase 5 implements the complete off-chain restaurant data layer, merchant cashier workflow, and payment request state machine. It establishes the bridge between merchant POS invoice generation and customer QR scanning on Arc Testnet without trusting unverified client input.

---

## 2. Firestore Collections & Document Schemas

### A. `restaurants`
```typescript
interface RestaurantDoc {
  id: string;                    // Unique slug/ID, e.g. "rest_bistro_01"
  name: string;                  // Restaurant name, e.g. "The Arc Bistro"
  slug: string;                  // URL-friendly slug, e.g. "the-arc-bistro"
  cuisine: string;               // e.g. "Modern Italian"
  address: string;               // Physical address
  city: string;                  // e.g. "San Francisco"
  walletAddress: `0x${string}`;  // Verified settlement address on Arc
  logoUrl?: string;              // Brand logo URL
  coverImageUrl?: string;        // Cover image URL
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  activeCampaignId?: string;     // Currently promoted campaign ID
  totalRevenue: number;          // Aggregated USD/USDC revenue
  totalPaymentsCount: number;    // Total completed bills
  cashbackDistributed: number;   // Total cashback rewarded in USDC
  createdAt: number;             // Timestamp in ms
  updatedAt: number;             // Timestamp in ms
}
```

### B. `campaigns`
```typescript
interface CampaignDoc {
  id: string;                    // bytes32 hex or unique ID (e.g. "cmp_weekend_500")
  restaurantId: string;          // Owning restaurant ID
  title: string;                 // e.g. "Weekend 8% Loyalty Boost"
  description: string;           // Promo terms
  cashbackBps: number;           // Basis points: 800 = 8.00%
  minSpend: number;              // Minimum bill in USDC (e.g. 10.00)
  maxCashback: number;           // Cap per payment in USDC (e.g. 50.00)
  budget: number;                // Total budget in USDC (e.g. 1000.00)
  spent: number;                 // Total disbursed in USDC
  remainingBudget: number;       // budget - spent
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'COMPLETED';
  validFrom: number;             // Start timestamp in ms
  validTo: number;               // Expiry timestamp in ms
  createdAt: number;
  updatedAt: number;
}
```

### C. `paymentRequests`
```typescript
interface PaymentRequestDoc {
  id: string;                    // Unique ID, e.g. "db_8f72k9a1b2c3" (hex-safe)
  restaurantId: string;          // Target restaurant ID
  restaurantName: string;        // Snapshot for fast UI rendering
  restaurantWallet: `0x${string}`;// Verified recipient wallet on Arc
  invoiceId: string;             // Merchant internal order ref (e.g. "INV-2026-0891")
  tableNumber?: string;          // Optional table number (e.g. "Table 12")
  billAmount: number;            // Bill amount in USDC units (e.g. 45.50)
  currency: 'USDC';              // Settlement currency
  tokenAddress: `0x${string}`;   // Arc USDC contract address (0x3600...)
  cashbackBps: number;           // Cashback rate in BPS (e.g. 500 = 5%)
  expectedCashback: number;      // Calculated preview: min((amount * bps)/10000, max)
  maxCashback: number;           // Campaign cap
  campaignId?: string;           // Associated campaign ID
  campaignTitle?: string;        // Snapshot title
  status: PaymentStatus;         // CREATED | PENDING | PAID | REWARD_PENDING | COMPLETED | EXPIRED | FAILED | CANCELLED
  paymentUrl: string;            // Full URL: https://dineback.app/pay/db_8f72k9a1b2c3
  notes?: string;
  createdAt: number;             // Creation time ms
  expiresAt: number;             // Expiry time ms (default: +15 minutes)
  updatedAt: number;

  // Blockchain settlement placeholders (Populated ONLY upon verified on-chain confirmation in Phase 7/8)
  txHash?: `0x${string}` | null;
  blockNumber?: number | null;
  payerAddress?: `0x${string}` | null;
  chainId?: number | null;
  confirmedAt?: number | null;
}
```

---

## 3. State Machine & Status Lifecycle

```
             [Cashier Creates Request]
                        │
                        ▼
                   ┌─────────┐
                   │ CREATED │
                   └────┬────┘
                        │
        ┌───────────────┼───────────────┐
        │ Customer opens│               │ Timeout / Cashier
        ▼ payment page  │               ▼ cancel
   ┌─────────┐          │          ┌───────────┐
   │ PENDING │          │          │ CANCELLED │
   └────┬────┘          │          └───────────┘
        │               ▼
        │          ┌─────────┐
        │          │ EXPIRED │
        │          └─────────┘
        ▼
   [Arc Transaction Broadcast & Receipt Verified]
        │
        ▼
    ┌──────┐
    │ PAID │
    └───┬──┘
        │
        ▼
 ┌────────────────┐
 │ REWARD_PENDING │
 └──────┬─────────┘
        │
        ▼
   ┌───────────┐
   │ COMPLETED │
   └───────────┘
```

### Valid Transition Matrix:
- `CREATED` → `PENDING` | `CANCELLED` | `EXPIRED`
- `PENDING` → `PAID` | `FAILED` | `CANCELLED` | `EXPIRED`
- `PAID` → `REWARD_PENDING` | `COMPLETED`
- `REWARD_PENDING` → `COMPLETED`
- Terminal States: `COMPLETED`, `CANCELLED`, `EXPIRED`, `FAILED`

---

## 4. Security & Anti-Tampering Rules

1. **Client Cannot Fake `PAID` or `COMPLETED`**:
   Status transitions to `PAID` are only accepted when accompanied by a cryptographically verified Arc transaction receipt matching the expected `paymentId`, `recipient`, `amount`, and `tokenAddress`.
2. **Immutable Pricing**:
   `billAmount`, `cashbackBps`, and `restaurantWallet` are immutable once the document is created.
3. **Expiry Enforced**:
   Payments cannot be initiated or completed if `block.timestamp > expiresAt`.
4. **No Sensitive Data in QR**:
   The QR payload contains strictly the public HTTPS URL (e.g. `https://dineback.app/pay/db_8f72k9...`). No private keys, customer IDs, or payment tokens exist in QR codes.

---

## 5. UI Architecture

1. **Merchant POS View (`/merchant`, `/merchant/qr`, `/merchant/payments`)**:
   - Bill entry & invoice number generator
   - Campaign selector with live cashback preview
   - Dynamic QR generation & high-contrast display for customer scanning
   - Real-time payment request status watcher
   - Active payment requests ledger & cancel action
2. **Customer Payment View (`/pay/[paymentRequestId]`)**:
   - Restaurant branding & verification badge
   - Bill amount & token details (USDC)
   - Cashback percentage & reward estimate
   - Expiration countdown timer
   - Status badge (Active, Expired, Cancelled, Paid)
   - "Connect Wallet & Pay" action (prepared for Phase 7 execution)
