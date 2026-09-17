# DineBack — Phase 6: QR Payment Flow & Real-Time Sync Architecture

## 1. Overview & Objective
Phase 6 establishes the complete mobile-first QR scan-to-invoice pipeline and real-time state synchronization between the Merchant POS terminal and the Customer's wallet interface.

```
+---------------------+                      +------------------------+
|  Merchant POS / QR  |                      |  Customer Mobile App   |
|  (/merchant/qr)     |                      |  (/scan -> /pay/[id])  |
+----------+----------+                      +-----------+------------+
           |                                             |
           | 1. Generates Bill (Status: CREATED)         | 2. Scans QR / Enters Code
           |    Displays QRCodeSVG(paymentUrl)           |    Validates ID (/^db_[a-f0-9]{12}$/)
           v                                             v
+---------------------------------------------------------------------+
|                      Firestore Data Layer                           |
|       Collection: `paymentRequests/{paymentRequestId}`             |
|                                                                     |
|  - Real-time onSnapshot() listener on Merchant POS Terminal         |
|  - Real-time onSnapshot() listener on Customer Payment Screen       |
+---------------------------------------------------------------------+
           |                                             |
           | 3. Automatically transitions to PENDING     | 4. Displays Invoice Details
           |    when customer opens invoice page         |    Checks Arc USDC balance
           v                                             v
+---------------------+                      +------------------------+
| POS Terminal updates|                      |  "Ready for Payment"   |
| "Customer is paying"|                      |  Wallet connected      |
+---------------------+                      +------------------------+
```

---

## 2. QR Code Security & Validation Specifications

### A. Payload Format
The QR payload strictly contains the public HTTPS payment URL:
`https://dineback.app/pay/db_8f72k9a1b2c3` or relative path `/pay/db_8f72k9a1b2c3`.

### B. Input Parsing & Validation Rules (`lib/validation/qr.ts`)
1. **Raw ID Detection:** If user pastes `db_8f72k9a1b2c3`, validate against `^db_[a-f0-9]{12}$`.
2. **Relative Path Detection:** If `/pay/db_8f72k9a1b2c3`, parse and extract ID.
3. **Full URL Detection:** If `https://<domain>/pay/db_8f72k9a1b2c3`, verify path structure `/pay/<id>` and extract ID.
4. **Security Rejections:**
   - Reject `javascript:...`, `data:...`, `blob:...` URIs.
   - Reject unknown paths or malformed non-hex IDs.
   - Reject empty or whitespace-only inputs.

---

## 3. Real-Time Status Synchronization Architecture

### Firestore `onSnapshot` Stream (`hooks/usePaymentRequest.ts`)
- **When Firebase is Configured:**
  Attaches an active Firestore snapshot listener to `paymentRequests/{id}`.
  When customer opens the URL, status changes from `CREATED` to `PENDING`. Both Merchant POS and Customer Screen update instantaneously without polling.
- **When in Development Fallback Mode:**
  Utilizes the resilient in-memory store with periodic synchronization, while displaying a data-source badge for transparency.

---

## 4. Wallet & Token Pre-Flight Checks (Arc Testnet)

Before reaching the smart contract execution step (Phase 7):
1. **Network Guard:** Enforces Chain ID `5042002` (Arc Testnet). Shows one-click switch action if on wrong chain.
2. **Balance Verification:** Queries Arc USDC token balance from contract `0x3600000000000000000000000000000000000000`.
3. **Solvency Check:** Compares `userBalance >= billAmount`. If insufficient, provides direct Circle Faucet guidance.
4. **Expiry Countdown:** Evaluates remaining time against `expiresAt`. Automatically disables payment when expired.

---

## 5. What is Intentionally Deferred to Phase 7
- On-chain ERC20 `approve(DineBackPayment, amount)` transaction.
- On-chain `DineBackPayment.payBill(...)` execution.
- Transaction receipt extraction and blockchain event parsing.
