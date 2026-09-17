# DineBack — Phase 7: Real Blockchain Payment Execution on Arc Testnet

## 1. Overview & Architecture
Phase 7 implements real, cryptographically verifiable on-chain USDC payments on **Arc Testnet** using the deployed `DineBackPayment` contract.

```
+-----------------------------------------------------------------------------------------------+
|                                    Customer Wallet Flow                                       |
+-----------------------------------------------------------------------------------------------+
| 1. Connect Wallet -> Enforce Arc Testnet (Chain ID 5042002)                                   |
| 2. Query Arc USDC Balance & Allowance (`DineBackPayment` spender)                             |
| 3. If allowance < amount: Step 1 -> `ERC20.approve(DineBackPayment, amount)`                  |
| 4. Step 2 -> `DineBackPayment.payBill(paymentId, restaurant, amount, campaignId, deadline)`   |
| 5. Wait for on-chain block confirmation & receipt on Arc Testnet                              |
+-----------------------------------------------+-----------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                            Authoritative Server Verification                                  |
|                              POST /api/payments/verify                                        |
+-----------------------------------------------------------------------------------------------+
| 1. Queries Arc Testnet RPC directly via Viem (`getTransactionReceipt`)                        |
| 2. Validates receipt status == "success" and target == `DineBackPayment`                      |
| 3. Parses `PaymentCompleted` event logs                                                       |
| 4. Matches on-chain `paymentId`, `amount`, `restaurant`, and `customer` against Firestore      |
| 5. Replay Protection: Rejects duplicate/replayed txHashes and expired invoices                |
| 6. Updates Firestore status: `PAID` + writes immutable `PaymentReceipt` ledger entry          |
+-----------------------------------------------+-----------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                Real-Time Status Propagation                                   |
+-----------------------------------------------------------------------------------------------+
| - Customer redirects to `/success/[paymentId]` (Confetti + Arcscan Tx Link)                   |
| - Merchant POS (`/merchant/qr`) updates automatically to `PAID` via Firestore onSnapshot      |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Smart Contract Interface & ABI Specifications

### Deployed Contract Details on Arc Testnet
- **Network:** Arc Testnet
- **Chain ID:** `5042002`
- **RPC:** `https://rpc.testnet.arc.io`
- **Explorer:** `https://testnet.arcscan.app`
- **DineBackPayment Contract:** `0x6782c556a702c061dd6fd5322c578a45f6dbd2fb`
- **RewardPool Contract:** `0xc174dd1e7c9c348d8ae822b86f28da0bf2f0f25f`
- **Arc USDC Contract:** `0x3600000000000000000000000000000000000000` (6 decimals)

### Exact Contract Functions (`DineBackPayment.sol`)

#### 1. `payBill`
```solidity
function payBill(
    bytes32 paymentId,
    address restaurant,
    uint256 amount,
    bytes32 campaignId,
    uint256 deadline
) external returns (uint256 cashbackAmount)
```
- **`paymentId` (`bytes32`):** Deterministic keccak256 hash of the unique invoice string (e.g. `keccak256("db_8f72a1b2c3d4")`).
- **`restaurant` (`address`):** Wallet address of the restaurant receiving the funds.
- **`amount` (`uint256`):** Bill payment amount in integer token base units (e.g. 50.00 USDC = `50_000_000` base units).
- **`campaignId` (`bytes32`):** Deterministic keccak256 hash of active cashback campaign or `bytes32(0)` if none.
- **`deadline` (`uint256`):** Unix timestamp in seconds after which the transaction reverts (`block.timestamp > deadline`).
- **`returns (uint256 cashbackAmount)`:** On-chain cashback disbursed or credited.

#### 2. `PaymentCompleted` Event
```solidity
event PaymentCompleted(
    bytes32 indexed paymentId,
    address indexed customer,
    address indexed restaurant,
    uint256 amount,
    uint256 cashback,
    bytes32 campaignId
);
```

---

## 3. Token Precision & BigInt Arithmetic

Arc native gas & token settlement operates with **6 decimals**.
- `1.00 USDC` = `1,000,000` integer units
- Conversion functions in [`lib/arc/utils.ts`](file:///c:/Users/stara/Downloads/ARC%20HACKATHON/lib/arc/utils.ts):
  - `parseUSDC(amount: number | string): bigint`
  - `formatUSDC(rawUnits: bigint | string | number): string`
  - `idToBytes32(id?: string): '0x${string}'`

Floating-point numbers are strictly forbidden in blockchain parameters.

---

## 4. Security & Replay Prevention Model

1. **On-Chain Replay Defense:** `DineBackPayment.sol` enforces `if (isPaymentPaid[paymentId]) revert PaymentAlreadyPaid(paymentId);` and records `isPaymentPaid[paymentId] = true`.
2. **Server-Side Verification Gate:** The frontend cannot write `status = "PAID"` directly. All status transitions to `PAID` must pass `/api/payments/verify` which queries the Arc Testnet RPC and verifies `PaymentCompleted` event logs.
3. **Idempotent Settlement:** Subsequent calls to `/api/payments/verify` for an already settled invoice with the same `txHash` return success idempotently without duplicate records.
4. **Expired/Cancelled Guard:** Expired or cancelled invoices are strictly blocked from settlement.

---

## 5. What is Intentionally Deferred to Phase 8
- Claiming accrued cashback rewards from the RewardPool.
- Merchant campaign reward pool top-ups and analytics dashboards.
