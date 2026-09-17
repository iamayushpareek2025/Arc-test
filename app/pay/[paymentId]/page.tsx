"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useAccount, useSwitchChain } from "wagmi";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { usePaymentRequest } from "@/hooks/usePaymentRequest";
import { useDineBackPayment } from "@/hooks/useDineBackPayment";
import { getStatusMeta } from "@/lib/payments/statusLifecycle";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER } from "@/lib/arc/chain";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/wallet/WalletButton";
import {
  Store,
  Coins,
  ShieldCheck,
  Clock,
  Receipt,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Radio,
  Network,
  Wallet,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Check,
} from "lucide-react";
import Link from "next/link";

export default function CustomerPaymentPage() {
  const params = useParams();
  const paymentId = typeof params?.paymentId === "string" ? params.paymentId : "";

  // Real-time Firestore subscription & automatic CREATED -> PENDING transition
  const {
    paymentRequest,
    isLoading: isInvoiceLoading,
    isError,
    error: invoiceError,
    isLiveFirestore,
  } = usePaymentRequest(paymentId, true);

  const [timeLeft, setTimeLeft] = React.useState<string>("");

  // Wallet & Blockchain Hooks
  const { address, isConnected, chainId: walletChainId, chain } = useAccount();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const activeChainId = walletChainId ?? chain?.id;
  const isArcNetwork = isConnected && activeChainId === ARC_TESTNET_CHAIN_ID;
  const { formatted: usdcBalance, displayNumber: usdcNumber, isLoading: isLoadingBalance } = useUSDCBalance();

  // Real DineBack Payment Execution Hook
  const {
    step,
    needsApproval,
    isApproving,
    isPaying,
    txHash,
    approvalTxHash,
    error: paymentError,
    ensureArcNetwork,
    approveUSDC,
    payBill,
    resetError,
  } = useDineBackPayment(paymentRequest);

  // Expiry countdown timer
  React.useEffect(() => {
    if (!paymentRequest) return;

    function updateCountdown() {
      if (!paymentRequest) return;
      const remainingMs = paymentRequest.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [paymentRequest?.expiresAt]);

  if (isInvoiceLoading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900/70 p-8 text-center animate-pulse rounded-3xl">
          <Receipt className="w-12 h-12 text-emerald-500/50 mx-auto mb-3 animate-bounce" />
          <h3 className="text-base font-bold text-white">Loading Invoice</h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Fetching bill details securely from Arc Testnet...
          </p>
        </Card>
      </div>
    );
  }

  if (isError || !paymentRequest) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/30 bg-slate-900/90 p-6 text-center text-slate-100 rounded-3xl shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Invoice Not Found</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {invoiceError || "This invoice link is invalid, expired, or has been removed."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/scan">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Scan Another QR
              </Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                Return Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const isExpired =
    timeLeft === "Expired" ||
    paymentRequest.status === "EXPIRED" ||
    paymentRequest.expiresAt < Date.now();

  const statusMeta = getStatusMeta(
    isExpired &&
      (paymentRequest.status === "CREATED" || paymentRequest.status === "PENDING")
      ? "EXPIRED"
      : paymentRequest.status
  );

  const hasSufficientBalance = isConnected && usdcNumber >= paymentRequest.billAmount;
  const isAlreadyPaid =
    paymentRequest.status === "PAID" ||
    paymentRequest.status === "REWARD_PENDING" ||
    paymentRequest.status === "COMPLETED";

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-6 sm:py-10 px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Top Header & Navigation */}
        <div className="flex items-center justify-between px-1">
          <Link href="/scan">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-slate-400 hover:text-white -ml-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Scan QR
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            {isLiveFirestore ? (
              <Badge variant="success" className="text-[10px] py-0.5 px-2 gap-1 font-semibold">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                Live Firestore
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] py-0.5 px-2 text-slate-400 border-slate-700">
                Dev Sync Mode
              </Badge>
            )}
          </div>
        </div>

        {/* Main Bill Card */}
        <Card className="border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md overflow-hidden rounded-3xl">
          {/* Restaurant Header */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/95 p-6 border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 truncate max-w-[220px]">
                  {paymentRequest.restaurantName}
                </span>
              </div>
              <Badge variant={statusMeta.badgeVariant} className="text-[11px] py-0.5">
                {statusMeta.label}
              </Badge>
            </div>

            {/* Bill Amount Display (Hero fintech styling) */}
            <div className="mt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Total Amount Due
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {paymentRequest.billAmount.toFixed(2)}
                </span>
                <span className="text-lg font-extrabold text-emerald-400">USDC</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Invoice ID: <span className="font-mono text-slate-300 font-semibold">{paymentRequest.invoiceId}</span>
                {paymentRequest.tableNumber && ` • Table ${paymentRequest.tableNumber}`}
              </p>
            </div>

            {/* Expiry Countdown */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700/40">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Invoice Expiry:
              </span>
              <span className={`font-mono font-bold ${isExpired ? "text-red-400" : "text-emerald-400"}`}>
                {timeLeft}
              </span>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            {/* Cashback Reward Highlight */}
            {paymentRequest.cashbackBps > 0 && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Instant On-Chain Cashback:
                  </span>
                  <span className="text-sm font-black text-emerald-300">
                    +{paymentRequest.expectedCashback.toFixed(2)} USDC
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {paymentRequest.campaignTitle
                    ? `${paymentRequest.campaignTitle} (${(paymentRequest.cashbackBps / 100).toFixed(1)}% cashback)`
                    : `Earn ${(paymentRequest.cashbackBps / 100).toFixed(1)}% instant cashback disbursed to your wallet upon settlement.`}
                </p>
              </div>
            )}

            {/* Invoice Breakdown Details */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-0.5 text-slate-300">
                <span className="text-slate-400">Bill Amount</span>
                <span className="font-semibold text-white">{paymentRequest.billAmount.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-300">
                <span className="text-slate-400">Cashback Reward</span>
                <span className="font-semibold text-emerald-400">
                  {paymentRequest.cashbackBps > 0 ? `+${paymentRequest.expectedCashback.toFixed(2)} USDC` : "0.00 USDC"}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-300 border-t border-slate-800/60 pt-2">
                <span className="text-slate-400">Effective Cost</span>
                <span className="font-bold text-white">
                  {(paymentRequest.billAmount - paymentRequest.expectedCashback).toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-slate-300 border-t border-slate-800/60 pt-2">
                <span className="text-slate-400">Settlement Network</span>
                <span className="text-emerald-400 font-medium">Arc Testnet</span>
              </div>
            </div>

            {/* Wallet Connection & Balance Section */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Customer Wallet & Balance
              </span>

              {!isConnected ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-5 text-center space-y-3">
                  <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Connect Wallet to Pay</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Connect your wallet to verify your USDC balance and settle on Arc.
                    </p>
                  </div>
                  <div className="flex justify-center pt-1">
                    <WalletButton />
                  </div>
                </div>
              ) : !isArcNetwork ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3 text-xs">
                  <div className="flex items-start gap-2.5 text-amber-200">
                    <Network className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-300">Wrong Network Connected</p>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">
                        Your wallet is not connected to Arc Testnet (Chain ID 5042002).
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => switchChain?.({ chainId: ARC_TESTNET_CHAIN_ID })}
                    disabled={isSwitchingChain}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  >
                    {isSwitchingChain ? "Switching Network..." : "Switch to Arc Testnet"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Connected Wallet:</span>
                    <span className="font-mono text-slate-300 font-semibold text-[11px]">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Your Arc USDC Balance:</span>
                    <span className="font-bold text-white text-sm">
                      {isLoadingBalance ? "Loading..." : `${usdcBalance} USDC`}
                    </span>
                  </div>

                  {!hasSufficientBalance && !isLoadingBalance && (
                    <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 flex items-start gap-2 text-[11px] text-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Insufficient USDC Balance.</span> You need at least{" "}
                        <strong>{paymentRequest.billAmount.toFixed(2)} USDC</strong> on Arc Testnet.
                        <div className="mt-1">
                          <a
                            href="https://faucet.circle.com"
                            target="_blank"
                            rel="noreferrer"
                            className="underline font-semibold text-red-200 hover:text-white"
                          >
                            Get Testnet USDC from Circle Faucet →
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error Display */}
            {paymentError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Transaction Notice</p>
                  <p className="text-red-200/80 text-[11px] mt-0.5">{paymentError}</p>
                </div>
                <button
                  onClick={resetError}
                  className="text-red-400 hover:text-red-200 text-xs underline font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Live Blockchain Processing Indicator */}
            {(isApproving || isPaying || step === "SWITCHING_NETWORK") && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs space-y-2 text-emerald-300">
                <div className="flex items-center gap-2 font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>
                    {step === "SWITCHING_NETWORK" && "Requesting network switch to Arc Testnet in wallet..."}
                    {step === "APPROVING" && "Confirming approval in wallet..."}
                    {step === "APPROVAL_CONFIRMING" && "Waiting for Arc Testnet approval block..."}
                    {step === "PAYING" && "Confirming payment in wallet..."}
                    {step === "PAYMENT_CONFIRMING" && "Waiting for Arc Testnet payment confirmation..."}
                    {step === "VERIFYING_SERVER" && "Verifying on-chain transaction & event..."}
                  </span>
                </div>

                {txHash && (
                  <div className="text-[11px] flex items-center justify-between pt-1 border-t border-emerald-500/20">
                    <span className="text-emerald-400/80">Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                    <a
                      href={`${ARC_TESTNET_EXPLORER}/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold flex items-center gap-1 hover:text-white"
                    >
                      <span>View on Arcscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {/* Action Footer */}
          <CardFooter className="p-6 pt-0 flex flex-col gap-3">
            {isExpired ? (
              <div className="w-full p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-300">
                  <Clock className="w-4 h-4 text-red-400" />
                  Invoice Has Expired
                </div>
                <p className="text-[11px] text-red-200/80">
                  Please ask the merchant cashier to generate a new payment QR.
                </p>
              </div>
            ) : paymentRequest.status === "CANCELLED" ? (
              <div className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-950 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300">
                  <XCircle className="w-4 h-4 text-slate-400" />
                  Invoice Cancelled
                </div>
                <p className="text-[11px] text-slate-500">
                  This bill was cancelled by the restaurant cashier.
                </p>
              </div>
            ) : isAlreadyPaid ? (
              <div className="w-full space-y-2">
                <div className="w-full p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Invoice Already Settled!
                  </div>
                  <p className="text-[11px] text-emerald-200/80">
                    Thank you! Your payment was verified on Arc Testnet.
                  </p>
                </div>
                <Link href={`/success/${paymentRequest.id}`}>
                  <Button variant="secondary" className="w-full font-bold">
                    View Payment Receipt
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="w-full space-y-2">
                {/* Check Network First */}
                {!isConnected ? (
                  <div className="space-y-2">
                    <p className="text-center text-[11px] text-slate-500 mb-2">
                      Connect your wallet above to settle this bill on Arc
                    </p>
                  </div>
                ) : !isArcNetwork ? (
                  <Button
                    size="lg"
                    onClick={() => switchChain?.({ chainId: ARC_TESTNET_CHAIN_ID })}
                    disabled={isSwitchingChain}
                    className="w-full font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2 py-3.5 text-sm"
                  >
                    <Network className="w-4 h-4" />
                    {isSwitchingChain ? "Switching Network..." : "Switch to Arc Testnet"}
                  </Button>
                ) : needsApproval ? (
                  /* 2-Step Payment Action: Step 1 Approve */
                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300 block mb-0.5">
                        Step 1 of 2: Authorize USDC Spending
                      </span>
                      You are approving DineBack to spend up to{" "}
                      <strong className="text-white">{paymentRequest.billAmount.toFixed(2)} USDC</strong> for this invoice.
                    </div>
                    <Button
                      size="lg"
                      disabled={isApproving || !hasSufficientBalance}
                      onClick={approveUSDC}
                      className="w-full font-bold shadow-lg shadow-emerald-500/20 gap-2 py-3.5 text-sm"
                    >
                      {isApproving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Approving USDC...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Approve {paymentRequest.billAmount.toFixed(2)} USDC
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  /* Step 2: Pay */
                  <Button
                    size="lg"
                    disabled={
                      !hasSufficientBalance ||
                      isPaying ||
                      isApproving
                    }
                    onClick={payBill}
                    className="w-full font-bold shadow-lg shadow-emerald-500/20 gap-2 py-3.5 text-sm"
                  >
                    {isPaying ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Settling on Arc Testnet...
                      </>
                    ) : (
                      <>
                        <Coins className="w-5 h-5" />
                        Pay {paymentRequest.billAmount.toFixed(2)} USDC on Arc
                      </>
                    )}
                  </Button>
                )}

                {isConnected && !isArcNetwork && (
                  <p className="text-center text-[11px] text-amber-400">
                    Switch network to Arc Testnet (Chain ID 5042002) to proceed
                  </p>
                )}
                {isConnected && isArcNetwork && !hasSufficientBalance && (
                  <p className="text-center text-[11px] text-red-400">
                    Insufficient USDC balance to complete this transaction
                  </p>
                )}
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Read-Only Security Guarantee Notice */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified Arc Settlement Token:
          </p>
          <code className="text-[10px] text-slate-400 font-mono">
            {paymentRequest.tokenAddress}
          </code>
        </div>
      </div>
    </div>
  );
}
