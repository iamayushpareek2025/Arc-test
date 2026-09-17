import { parseEventLogs } from "viem";
import { arcPublicClient } from "./client";
import { DINEBACK_PAYMENT_ADDRESS, dineBackPaymentAbi } from "./contracts";
import { ARC_TESTNET_CHAIN_ID } from "./chain";
import { idToBytes32, parseUSDC, formatUSDC } from "./utils";
import { PaymentRequest } from "@/types/payment";

export interface VerifiedPaymentData {
  isValid: boolean;
  error?: string;
  txHash?: `0x${string}`;
  blockNumber?: number;
  payer?: `0x${string}`;
  restaurant?: `0x${string}`;
  amount?: number;
  cashbackAmount?: number;
  campaignId?: `0x${string}`;
  chainId?: number;
  contractAddress?: `0x${string}`;
  confirmedAt?: number;
}

/**
 * Authoritatively verifies a payment transaction on Arc Testnet.
 * Validates receipt status, contract address, PaymentCompleted event, payment ID, amount, and recipient.
 */
export async function verifyPaymentOnChain(
  txHash: `0x${string}`,
  paymentRequest: PaymentRequest
): Promise<VerifiedPaymentData> {
  try {
    if (!txHash || !txHash.startsWith("0x") || txHash.length !== 66) {
      return { isValid: false, error: `Invalid transaction hash format: "${txHash}".` };
    }

    // 1. Fetch transaction receipt from Arc Testnet RPC
    const receipt = await arcPublicClient.getTransactionReceipt({ hash: txHash });
    if (!receipt) {
      return { isValid: false, error: `Transaction ${txHash} not found on Arc Testnet.` };
    }

    // 2. Verify status
    if (receipt.status !== "success") {
      return { isValid: false, error: `Transaction ${txHash} reverted on-chain.` };
    }

    // 3. Verify target contract address
    if (
      !receipt.to ||
      receipt.to.toLowerCase() !== DINEBACK_PAYMENT_ADDRESS.toLowerCase()
    ) {
      return {
        isValid: false,
        error: `Transaction target "${receipt.to}" does not match DineBackPayment contract "${DINEBACK_PAYMENT_ADDRESS}".`,
      };
    }

    // 4. Parse PaymentCompleted event logs
    const events = parseEventLogs({
      abi: dineBackPaymentAbi,
      logs: receipt.logs,
      eventName: "PaymentCompleted",
    });

    if (!events || events.length === 0) {
      return {
        isValid: false,
        error: "No PaymentCompleted event emitted by DineBackPayment contract in this transaction.",
      };
    }

    const event = events[0];
    const { paymentId, customer, restaurant, amount, cashback, campaignId } = event.args;

    // 5. Match Payment ID (bytes32)
    const expectedPaymentIdBytes = idToBytes32(paymentRequest.id);
    if (paymentId.toLowerCase() !== expectedPaymentIdBytes.toLowerCase()) {
      return {
        isValid: false,
        error: `Event paymentId "${paymentId}" does not match expected invoice "${paymentRequest.id}" (${expectedPaymentIdBytes}).`,
      };
    }

    // 6. Match Restaurant Wallet
    if (restaurant.toLowerCase() !== paymentRequest.restaurantWallet.toLowerCase()) {
      return {
        isValid: false,
        error: `Event restaurant "${restaurant}" does not match invoice recipient "${paymentRequest.restaurantWallet}".`,
      };
    }

    // 7. Match Bill Amount (Integer base units)
    const expectedAmountBaseUnits = parseUSDC(paymentRequest.billAmount);
    if (amount !== expectedAmountBaseUnits) {
      return {
        isValid: false,
        error: `Event amount ${amount} does not match expected bill amount ${expectedAmountBaseUnits} base units.`,
      };
    }

    // 8. Match Campaign ID if configured
    if (paymentRequest.campaignId) {
      const expectedCampaignBytes = idToBytes32(paymentRequest.campaignId);
      if (campaignId.toLowerCase() !== expectedCampaignBytes.toLowerCase()) {
        console.warn(
          `Campaign mismatch: event=${campaignId}, expected=${expectedCampaignBytes}`
        );
      }
    }

    return {
      isValid: true,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      payer: customer as `0x${string}`,
      restaurant: restaurant as `0x${string}`,
      amount: paymentRequest.billAmount,
      cashbackAmount: parseFloat(formatUSDC(cashback)),
      campaignId: campaignId as `0x${string}`,
      chainId: ARC_TESTNET_CHAIN_ID,
      contractAddress: DINEBACK_PAYMENT_ADDRESS,
      confirmedAt: Date.now(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Blockchain verification failed";
    console.error("verifyPaymentOnChain error:", err);
    return { isValid: false, error: message };
  }
}
