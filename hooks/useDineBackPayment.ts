"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "@/lib/arc/wagmi";
import { ARC_USDC_ADDRESS, ARC_TESTNET_CHAIN_ID } from "@/lib/arc/chain";
import { DINEBACK_PAYMENT_ADDRESS, dineBackPaymentAbi } from "@/lib/arc/contracts";
import { erc20Abi } from "@/lib/arc/abi/erc20";
import { idToBytes32, parseUSDC } from "@/lib/arc/utils";
import { PaymentRequest } from "@/types/payment";

export type PaymentExecutionStep =
  | "IDLE"
  | "SWITCHING_NETWORK"
  | "CHECKING_ALLOWANCE"
  | "NEEDS_APPROVAL"
  | "APPROVING"
  | "APPROVAL_CONFIRMING"
  | "APPROVED"
  | "PAYING"
  | "PAYMENT_CONFIRMING"
  | "VERIFYING_SERVER"
  | "SUCCESS"
  | "ERROR";

export interface UseDineBackPaymentResult {
  step: PaymentExecutionStep;
  needsApproval: boolean;
  allowance: bigint;
  requiredAmount: bigint;
  isApproving: boolean;
  isPaying: boolean;
  isCorrectNetwork: boolean;
  txHash: `0x${string}` | null;
  approvalTxHash: `0x${string}` | null;
  error: string | null;
  ensureArcNetwork: () => Promise<boolean>;
  approveUSDC: () => Promise<void>;
  payBill: () => Promise<void>;
  resetError: () => void;
}

export function useDineBackPayment(
  paymentRequest: PaymentRequest | null
): UseDineBackPaymentResult {
  const router = useRouter();
  const { address, isConnected, chainId: walletChainId, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const activeChainId = walletChainId ?? chain?.id;
  const isCorrectNetwork = activeChainId === ARC_TESTNET_CHAIN_ID;

  const [step, setStep] = React.useState<PaymentExecutionStep>("IDLE");
  const [error, setError] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<`0x${string}` | null>(null);
  const [approvalTxHash, setApprovalTxHash] = React.useState<`0x${string}` | null>(null);

  const { writeContractAsync } = useWriteContract();

  const requiredAmount = React.useMemo(() => {
    if (!paymentRequest) return BigInt(0);
    return parseUSDC(paymentRequest.billAmount);
  }, [paymentRequest]);

  // Query active allowance for DineBackPayment contract on Arc Testnet
  const {
    data: allowanceData,
    refetch: refetchAllowance,
  } = useReadContract({
    address: ARC_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && DINEBACK_PAYMENT_ADDRESS ? [address, DINEBACK_PAYMENT_ADDRESS] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: {
      enabled: Boolean(address && isConnected && isCorrectNetwork),
    },
  });

  const allowance = typeof allowanceData === "bigint" ? allowanceData : BigInt(0);
  const needsApproval = allowance < requiredAmount;

  // Helper to ensure wallet is on Arc Testnet before submitting any transaction
  const ensureArcNetwork = async (): Promise<boolean> => {
    if (activeChainId === ARC_TESTNET_CHAIN_ID) {
      return true;
    }
    try {
      setStep("SWITCHING_NETWORK");
      setError(null);
      await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Please switch to Arc Testnet in your wallet.";
      setError(
        msg.includes("User rejected")
          ? "Network switch request was rejected in your wallet."
          : "Please switch to Arc Testnet (Chain ID 5042002) in your wallet to proceed."
      );
      setStep("ERROR");
      return false;
    }
  };

  // Step 1: Approve USDC Allowance
  const approveUSDC = async () => {
    if (!address || !isConnected || !paymentRequest) {
      setError("Please connect your wallet first.");
      return;
    }

    const networkOk = await ensureArcNetwork();
    if (!networkOk) return;

    try {
      setError(null);
      setStep("APPROVING");

      const hash = await writeContractAsync({
        address: ARC_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [DINEBACK_PAYMENT_ADDRESS, requiredAmount],
        chainId: ARC_TESTNET_CHAIN_ID,
      });

      setApprovalTxHash(hash);
      setStep("APPROVAL_CONFIRMING");

      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: ARC_TESTNET_CHAIN_ID,
      });

      if (receipt.status !== "success") {
        throw new Error("USDC approval transaction reverted on Arc Testnet.");
      }

      await refetchAllowance();
      setStep("APPROVED");
    } catch (err: unknown) {
      console.error("USDC approval failed:", err);
      const msg =
        err instanceof Error ? err.message : "USDC approval failed or was rejected.";
      if (msg.includes("User rejected")) {
        setError("Approval was cancelled in your wallet.");
      } else if (msg.includes("does not match the target chain")) {
        setError("Please switch your wallet to Arc Testnet (Chain ID 5042002) and try again.");
      } else {
        setError(msg);
      }
      setStep("NEEDS_APPROVAL");
    }
  };

  // Step 2: Execute DineBack Payment
  const payBill = async () => {
    if (!address || !isConnected || !paymentRequest) {
      setError("Please connect your wallet first.");
      return;
    }

    const networkOk = await ensureArcNetwork();
    if (!networkOk) return;

    if (needsApproval) {
      setError("Please approve USDC spending before executing payment.");
      setStep("NEEDS_APPROVAL");
      return;
    }

    try {
      setError(null);
      setStep("PAYING");

      const paymentIdBytes = idToBytes32(paymentRequest.id);
      const campaignIdBytes = idToBytes32(paymentRequest.campaignId);
      const deadlineSec = BigInt(Math.floor(paymentRequest.expiresAt / 1000));

      const hash = await writeContractAsync({
        address: DINEBACK_PAYMENT_ADDRESS,
        abi: dineBackPaymentAbi,
        functionName: "payBill",
        args: [
          paymentIdBytes,
          paymentRequest.restaurantWallet,
          requiredAmount,
          campaignIdBytes,
          deadlineSec,
        ],
        chainId: ARC_TESTNET_CHAIN_ID,
      });

      setTxHash(hash);
      setStep("PAYMENT_CONFIRMING");

      // Wait for on-chain receipt on Arc Testnet
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: ARC_TESTNET_CHAIN_ID,
      });

      if (receipt.status !== "success") {
        throw new Error("Payment transaction reverted on Arc Testnet.");
      }

      // Step 3: Trigger authoritative server verification
      setStep("VERIFYING_SERVER");
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paymentRequest.id,
          txHash: hash,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Server payment verification failed.");
      }

      setStep("SUCCESS");
      // Navigate to success receipt screen
      router.push(`/success/${paymentRequest.id}?tx=${hash}`);
    } catch (err: unknown) {
      console.error("Payment execution failed:", err);
      const msg =
        err instanceof Error ? err.message : "Payment execution failed or was rejected.";
      if (msg.includes("User rejected")) {
        setError("Transaction was cancelled in your wallet.");
      } else if (msg.includes("does not match the target chain")) {
        setError("Please switch your wallet to Arc Testnet (Chain ID 5042002) and try again.");
      } else if (msg.includes("PaymentAlreadyPaid")) {
        setError("This invoice has already been settled on-chain.");
      } else if (msg.includes("PaymentExpired")) {
        setError("This invoice has expired on-chain.");
      } else {
        setError(msg);
      }
      setStep("ERROR");
    }
  };

  return {
    step,
    needsApproval,
    allowance,
    requiredAmount,
    isApproving: step === "APPROVING" || step === "APPROVAL_CONFIRMING",
    isPaying: step === "PAYING" || step === "PAYMENT_CONFIRMING" || step === "VERIFYING_SERVER",
    isCorrectNetwork,
    txHash,
    approvalTxHash,
    error,
    ensureArcNetwork,
    approveUSDC,
    payBill,
    resetError: () => setError(null),
  };
}
