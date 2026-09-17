# DineBack — Programmable Restaurant Loyalty & USDC Payments on Arc

DineBack turns restaurant payments into programmable customer acquisition and loyalty events on **Arc**. Customers pay their bill in USDC via dynamic QR codes and receive instant, on-chain cashback and loyalty rewards.

---

## 🚀 Live Arc Testnet Deployment

| Contract | Address | Explorer |
|---|---|---|
| **DineBackPayment** | [`0x6782c556a702c061dd6fd5322c578a45f6dbd2fb`](https://testnet.arcscan.app/address/0x6782c556a702c061dd6fd5322c578a45f6dbd2fb) | [View on Arcscan](https://testnet.arcscan.app/address/0x6782c556a702c061dd6fd5322c578a45f6dbd2fb) |
| **RewardPool** | [`0xc174dd1e7c9c348d8ae822b86f28da0bf2f0f25f`](https://testnet.arcscan.app/address/0xc174dd1e7c9c348d8ae822b86f28da0bf2f0f25f) | [View on Arcscan](https://testnet.arcscan.app/address/0xc174dd1e7c9c348d8ae822b86f28da0bf2f0f25f) |
| **Native / USDC Token** | [`0x3600000000000000000000000000000000000000`](https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000) | [View on Arcscan](https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000) |

- **Network:** Arc Testnet
- **Chain ID:** `5042002`
- **RPC URL:** `https://rpc.testnet.arc.io`
- **Native Gas / Settlement Currency:** USDC (6 decimals)

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Web3 Layer:** Wagmi v2, Viem
- **Smart Contracts:** Solidity 0.8.24, OpenZeppelin v5 (Ownable2Step, ReentrancyGuard, SafeERC20)
- **Database / Indexing:** Firebase Firestore
- **QR Engine:** `qrcode.react` / `html5-qrcode`

---

## 📦 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run smart contract compilation & test verification
npm run contracts:compile
npm run contracts:test

# 3. Verify deployed contract on Arc Testnet
npm run contracts:verify

# 4. Run test suites (Phase 5 & 6)
npm run test:phase5
npm run test:phase6

# 5. Start Next.js development server
npm run dev
```

### Key Routes
- `/scan`: Mobile-first camera QR scanner with manual code fallback and security sanitization.
- `/pay/[paymentId]`: Customer bill review, Arc Testnet wallet connection, balance check, and real-time status listener.
- `/merchant/qr`: Live cashier POS QR generator and real-time invoice status tracker.
- `/merchant/payments`: Merchant payments and settlements ledger.

Open [http://localhost:3000](http://localhost:3000) with your browser to explore DineBack.
