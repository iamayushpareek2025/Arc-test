# DineBack Smart Contracts

Production-grade smart contracts for restaurant payments and programmable cashback on **Arc Testnet**.

## Overview

- **`DineBackPayment.sol`**: The core settlement contract that processes USDC bill payments, verifies deadlines and replay prevention, executes merchant transfers, and coordinates with `RewardPool` for atomic cashback.
- **`RewardPool.sol`**: The campaign vault that locks merchant/sponsor cashback budgets, calculates basis-point rewards, enforces maximum cashback caps and minimum bill requirements, and disburses USDC rewards atomically.

---

## Contract Architecture & Safety Measures

### 1. Payment Settlement (`DineBackPayment.sol`)
- **Unique Payment ID (`bytes32 paymentId`)**: Ensures each invoice can only ever be paid once. Replay attempts revert with custom error `PaymentAlreadyPaid`.
- **Deadline Verification (`block.timestamp <= deadline`)**: Invoices past their expiration timestamp revert immediately with `PaymentExpired`.
- **Atomic Execution**: Customer transfers bill amount to the restaurant while cashback is evaluated and distributed in the same transaction.
- **Reentrancy Protection**: Protected by OpenZeppelin's `ReentrancyGuard`.
- **Safe Token Transfers**: Protected by OpenZeppelin's `SafeERC20`.

### 2. Cashback & Loyalty (`RewardPool.sol`)
- **Basis Points Arithmetic**:
  $$\text{Cashback} = \min\left(\frac{\text{BillAmount} \times \text{cashbackBps}}{10000}, \text{maxCashback}\right)$$
- **Guarded Caller**: Only the authorized `paymentContract` can execute `distributeCashback`.
- **Budget Tracking**: Strictly tracks remaining campaign budget and cannot overspend.

---

## Directory Structure

```text
contracts/
├── src/
│   ├── DineBackPayment.sol       # Primary settlement contract
│   ├── RewardPool.sol            # Cashback & campaign vault contract
│   └── interfaces/
│       ├── IDineBackPayment.sol
│       └── IRewardPool.sol
├── test/
│   ├── DineBackPayment.t.sol     # Foundry unit & integration tests
│   ├── RewardPool.t.sol
│   └── mocks/
│       └── MockUSDC.sol          # 6-decimal Mock USDC token
├── script/
│   └── Deploy.s.sol              # Foundry Arc testnet deployment script
└── foundry.toml
```

---

## Compilation & Testing

```bash
# Compile contracts with Solc 0.8.24 and export ABIs
npx tsx scripts/compile-and-test.ts

# If Foundry is installed:
forge build
forge test -vvv
```
