# DineBack — Implementation & Architecture Plan

## Executive Summary
**DineBack** is a decentralized restaurant payment and programmable loyalty platform built on the **Arc** blockchain network. DineBack turns every restaurant payment into an on-chain, verifiable customer loyalty and reward event using native USDC.

This document details the complete end-to-end architecture, technical specifications, smart contract designs, Firebase schema, security measures, and phased execution roadmap for the hackathon project.

---

## 1. System Architecture

```
                                  +-----------------------+
                                  |    Arc Testnet        |
                                  |  (Chain ID: 5042002)  |
                                  +-----------+-----------+
                                              |
                   +--------------------------+--------------------------+
                   | (USDC ERC20 Transfers & Events)                     | (Cashback & Reward Pool)
                   v                                                     v
      +------------------------+                            +-------------------------+
      |  DineBackPayment.sol   |<==========================>|     RewardPool.sol      |
      +-----------+------------+      (Authorized Call)     +------------+------------+
                  ^                                                      ^
                  |                                                      |
                  +--------------------------+---------------------------+
                                             |
                                  [viem / wagmi RPC Calls]
                                             |
                                  +----------+-----------+
                                  |   Next.js Frontend   |
                                  | (TypeScript/Tailwind)|
                                  +-----+-------------+--+
                                        |             |
                       +----------------+             +----------------+
                       | (Customer Flow)                               | (Merchant Dashboard)
                       v                                               v
        +-----------------------------+                 +-----------------------------+
        |  Mobile Web Pay & Reward    |                 |   Bill & QR Generation,     |
        |  - Scan QR / Deep Link      |                 |   Real-time Payment Listener|
        |  - Connect Wallet (Arc)     |                 |   Campaign Analytics        |
        |  - Check USDC & Approve     |                 +--------------+--------------+
        |  - Pay & Claim Cashback     |                                |
        +--------------+--------------+                                |
                       |                                               |
                       +-----------------------+-----------------------+
                                               |
                                               v
                                  +---------------------------+
                                  |     Firebase / Firestore  |
                                  |  - Off-chain Data Index   |
                                  |  - Active Payment Requests|
                                  |  - Merchant Profiles      |
                                  |  - Aggregated Analytics   |
                                  +---------------------------+
```

### Architecture Core Principles
1. **Blockchain as the Ultimate Source of Truth**: All financial transactions, settlement, and cashback distributions are executed and recorded immutably on Arc.
2. **Fast & Non-Blocking Off-Chain Metadata**: Invoices, restaurant profiles, active campaigns, and QR payloads are indexed in Firestore for instant UI loading and sub-second QR generation.
3. **Cryptographic & Event Verification**: Frontend and merchant dashboards verify on-chain transaction receipts and contract emitted events before transitioning payment states to `PAID` or `COMPLETED`.

---

## 2. Frontend Structure (Next.js App Router)

```text
dineback/
├── app/
│   ├── layout.tsx                    # Root layout with Web3 & React Query Providers
│   ├── page.tsx                      # Landing page / Product overview & demo portal
│   ├── scan/
│   │   └── page.tsx                  # Mobile QR Scanner interface
│   ├── pay/
│   │   └── [paymentId]/
│   │       └── page.tsx              # Customer payment & bill review page
│   ├── success/
│   │   └── page.tsx                  # Post-payment confirmation & cashback summary
│   ├── rewards/
│   │   └── page.tsx                  # Customer reward balance & active loyalty passes
│   ├── history/
│   │   └── page.tsx                  # Customer personal payment & cashback history
│   ├── restaurants/
│   │   ├── page.tsx                  # Directory of participating restaurants
│   │   └── [id]/
│   │       └── page.tsx              # Specific restaurant details & live campaigns
│   └── merchant/
│       ├── layout.tsx                # Merchant dashboard shell & navigation
│       ├── page.tsx                  # Merchant Overview & KPI metrics
│       ├── payments/
│       │   └── page.tsx              # Live payment monitor & audit trail
│       ├── qr/
│       │   └── page.tsx              # POS Bill creation & dynamic QR display
│       └── campaigns/
│           └── page.tsx              # Cashback campaign builder & budget manager
├── components/
│   ├── ui/                           # Design system (Button, Card, Badge, Modal, Input, etc.)
│   ├── layout/                       # Navbar, Footer, Merchant Sidebar, Container
│   ├── payment/                      # BillDetails, CashbackBreakdown, PaymentStatus, TokenApproval
│   ├── wallet/                       # WalletConnectButton, NetworkGuard, BalanceDisplay
│   ├── qr/                           # QRGenerator, QRScanner, LivePaymentWaiter
│   ├── rewards/                      # RewardCard, TierBadge, LoyaltyMilestone
│   └── merchant/                     # MetricCard, PaymentTable, CampaignCard, CreateRequestModal
├── hooks/
│   ├── usePayment.ts                 # Full payment execution (approval + contract call + verification)
│   ├── useUSDCBalance.ts             # Live Arc USDC balance reader & formatted display
│   ├── useRewardBalance.ts           # Reward pool querying & customer claimed reward data
│   ├── usePaymentRequest.ts          # Firestore realtime listener for specific invoice
│   └── useRestaurant.ts              # Restaurant metadata & active campaign provider
├── lib/
│   ├── arc/
│   │   ├── config.ts                 # Arc network definition (Wagmi config, chain specs)
│   │   ├── contracts.ts              # Contract ABIs, deployed addresses, and Viem clients
│   │   └── format.ts                 # Decimals formatting, currency utils, address truncator
│   ├── firebase/
│   │   ├── client.ts                 # Firebase app initialization & auth
│   │   ├── firestore.ts              # Firestore instance & helper functions
│   │   └── repositories/             # Clean Data Access Layer:
│   │       ├── restaurants.ts
│   │       ├── paymentRequests.ts
│   │       ├── payments.ts
│   │       ├── campaigns.ts
│   │       └── customers.ts
│   ├── validation/
│   │   ├── payment.ts                # Zod schemas for invoices & payments
│   │   └── campaign.ts               # Zod schemas for merchant campaigns
│   └── utils.ts                      # Common styling and UI helper methods
├── contracts/
│   ├── src/
│   │   ├── DineBackPayment.sol       # Primary settlement contract
│   │   ├── RewardPool.sol            # Cashback & campaign vault contract
│   │   └── interfaces/
│   │       ├── IDineBackPayment.sol
│   │       └── IRewardPool.sol
│   ├── script/
│   │   └── Deploy.s.sol              # Foundry Arc testnet deployment script
│   └── test/
│       ├── DineBackPayment.t.sol     # Unit & integration test suites
│       └── RewardPool.t.sol
├── types/
│   ├── payment.ts                    # TypeScript types for PaymentRequest, PaymentReceipt
│   ├── restaurant.ts                 # Restaurant & Merchant types
│   ├── campaign.ts                   # Cashback campaign configuration types
│   └── web3.ts                       # Chain & Transaction state types
├── docs/                             # Project documentation, plans, demo scripts
└── public/                           # Logos, restaurant assets, icons
```

---

## 3. Smart Contract Architecture

### Core Design
1. **`DineBackPayment.sol`**:
   - Manages authorized merchant registrations.
   - Accepts customer USDC payments with unique `bytes32 paymentId`.
   - Transfers the bill amount from customer:
     - (Bill Amount - Platform Fee) directly to the Merchant.
     - Interacts with `RewardPool` to credit or immediately disburse customer cashback in USDC.
   - Enforces invoice expiry, non-reentrancy, single-settlement per `paymentId`, and strict parameter validation.
   - Emits indexed event `PaymentCompleted(bytes32 indexed paymentId, address indexed customer, address indexed restaurant, uint256 amount, uint256 cashback)`.

2. **`RewardPool.sol`**:
   - Holds campaign reserve funds funded by merchants/protocol.
   - Calculates cashback based on active campaign basis points (`bps`), minimum bill thresholds, and maximum cashback caps.
   - Disburses cashback tokens atomically or credits loyalty balances.
   - Strictly enforces per-campaign budgets and authorized caller guards (`onlyPaymentContract` / `onlyOwner`).

```solidity
// Mathematical Safety: Basis Points (BPS)
// 100 BPS = 1.00%
// Cashback = min( (amount * campaign.cashbackBps) / 10000, campaign.maxCashbackAmount )
```

---

## 4. Payment & QR Lifecycle

```
[Merchant POS]
  1. Enters Bill Amount (e.g. 50.00 USDC) & Selects Campaign (e.g. 8% Cashback)
  2. Generates Invoice in Firestore (Status: CREATED, Expiry: +15 mins, ID: "db_8f72k9")
  3. Displays QR with URL: `https://dineback.app/pay/db_8f72k9`
  4. POS listens to Firestore & Arc events for "db_8f72k9"

[Customer Phone]
  1. Scans QR -> Opens /pay/db_8f72k9
  2. Loads validated invoice: Restaurant Name, Bill (50 USDC), Cashback (4.00 USDC, 8%)
  3. Connects Web3 Wallet (Arc Testnet)
  4. Checks USDC balance & allowance
  5. Step A: `USDC.approve(DineBackPayment, 50_000_000)` (if allowance < bill)
  6. Step B: `DineBackPayment.payBill(paymentId, restaurant, amount, campaignId, deadline, signature/nonce)`
  7. Waits for transaction receipt on Arc
  8. Upon on-chain confirmation:
     - Firestore updates to `PAID` / `COMPLETED` with `txHash`
     - Customer is redirected to /success with animated cashback celebration
     - Merchant POS instantly displays "Paid & Verified" screen
```

---

## 5. Firebase / Firestore Data Layer

### Collections & Schemas

1. **`restaurants`**:
   - `id`: string (e.g., `rest_01`)
   - `name`: string
   - `walletAddress`: string (0x...)
   - `cuisine`: string
   - `location`: string
   - `logoUrl`: string
   - `activeCampaignId`: string
   - `createdAt`: timestamp

2. **`paymentRequests`**:
   - `id`: string (`db_` prefixed invoice ID)
   - `restaurantId`: string
   - `restaurantWallet`: string
   - `billAmount`: number (normalized)
   - `cashbackBps`: number (e.g. 500)
   - `expectedCashback`: number
   - `status`: `'CREATED' | 'PENDING' | 'PAID' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'`
   - `txHash`: string | null
   - `payerAddress`: string | null
   - `createdAt`: timestamp
   - `expiresAt`: timestamp

3. **`payments`** (Historical record):
   - `id`: string (txHash or paymentId)
   - `paymentRequestId`: string
   - `customerAddress`: string
   - `restaurantAddress`: string
   - `amount`: number
   - `cashbackAmount`: number
   - `blockNumber`: number
   - `timestamp`: timestamp

4. **`campaigns`**:
   - `id`: string
   - `restaurantId`: string
   - `title`: string (e.g. "Weekend Lunch Special")
   - `cashbackBps`: number
   - `minSpend`: number
   - `maxCashback`: number
   - `budget`: number
   - `spent`: number
   - `isActive`: boolean
   - `validFrom`: timestamp
   - `validTo`: timestamp

---

## 6. Arc Testnet Integration & Token Decimals Strategy

- **Chain ID**: `5042002`
- **RPC URL**: `https://rpc.testnet.arc.io`
- **Block Explorer**: `https://testnet.arcscan.app`
- **Native / Testnet USDC Address**: `0x3600000000000000000000000000000000000000`

### Decimals Handling:
- Token decimals will be dynamically queried using `ERC20.decimals()` via `viem` and cached.
- Never hardcode 18 or 6 decimals statically in math logic; use dynamic `parseUnits(amount, decimals)` and `formatUnits(amount, decimals)`.

---

## 7. Security Architecture

1. **Reentrancy Protection**: All payment and withdrawal functions use `ReentrancyGuardUpgradeable` or standard `ReentrancyGuard`.
2. **Double Payment & Replay Prevention**: Every invoice ID `bytes32 paymentId` can only transition from unpaid to paid once in the contract mapping `mapping(bytes32 => bool) public isPaid`.
3. **Invoice Expiry Enforced on Contract**: Payments submitted past `deadline` revert immediately on-chain.
4. **Access Control**: Reward pool management, parameter updates, and pause switches guarded by `AccessControl` / `Ownable2Step`.
5. **No Private Key Exposure**: Zero private keys in client code or frontend environment variables.
6. **Input Validation**: All forms and API endpoints validated with strict Zod schemas before processing.

---

## 8. Testing Strategy

1. **Smart Contracts (Foundry)**:
   - Positive flow: standard payment with instant cashback.
   - Negative flow: paying expired invoice, replay attack with duplicate payment ID, insufficient allowance, insufficient balance, reentrancy attempt.
   - Edge cases: minimum bill amount, maximum cashback cap ceiling, campaign budget exhaustion.
2. **Frontend & TypeScript**:
   - Static type checking with `tsc --noEmit`.
   - Next.js production build (`npm run build`).
   - Unit tests for formatting utilities and Zod schema validations.

---

## 9. Phased Execution Roadmap

| Phase | Description | Deliverables |
|---|---|---|
| **Phase 1** | Project Foundation & Tooling Setup | Next.js App, TypeScript, Tailwind CSS, config, folders, contracts skeleton, `.env.example`, build check |
| **Phase 2** | Arc Testnet & Wallet Connection | Wagmi + Viem Arc configuration, RainbowKit/custom wallet modal, network guard, dynamic balance hook |
| **Phase 3** | Smart Contracts & Foundry Tests | `DineBackPayment.sol`, `RewardPool.sol`, unit & integration tests, gas optimization |
| **Phase 4** | Contract Deployment to Arc Testnet | Deployment script `Deploy.s.sol`, contract verification on Arcscan, testnet addresses configured |
| **Phase 5** | Restaurant & Payment Request System | Data repositories, Firestore integration, invoice creation API & state manager |
| **Phase 6** | QR Payment Flow | Dynamic QR code generation, mobile camera QR reader, invoice resolution page |
| **Phase 7** | Real USDC Payment Flow | Allowance check, ERC20 approval modal, atomic contract bill settlement, receipt validation |
| **Phase 8** | Cashback & Reward System | Real-time cashback calculation, instant reward distribution, celebration animations |
| **Phase 9** | Customer Dashboard | Customer spending stats, cashback earned, reward badges, past payment history |
| **Phase 10** | Merchant Dashboard | Real-time POS cashier view, bill generator, campaign manager, revenue analytics |
| **Phase 11** | Firebase Indexing & Tx Verification | On-chain event listener, Firestore synchronization, anti-tamper verification |
| **Phase 12** | Security Review & Edge Cases | Security audit report `docs/security-review.md`, edge case hardening |
| **Phase 13** | UI/UX Polish & Responsive Testing | Mobile-first payment polish, desktop merchant refinement, high-contrast states |
| **Phase 14** | Complete Hackathon Demo & Docs | `README.md`, `docs/demo-script.md`, clean end-to-end verified demo flow |
| **Phase 15** | Optional Advanced Features | Loyalty milestones, referral links, merchant campaign AI assistant |

---
*Created as part of Phase 1 of the DineBack project.*
