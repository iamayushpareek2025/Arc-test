"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePaymentRequest } from "@/hooks/usePaymentRequest";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ARC_TESTNET_EXPLORER } from "@/lib/arc/chain";
import {
  CheckCircle2,
  ExternalLink,
  Store,
  Sparkles,
  ShieldCheck,
  Receipt,
  QrCode,
  ArrowRight,
  Clock,
  Coins,
} from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";

export default function PaymentSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paymentId = typeof params?.paymentId === "string" ? params.paymentId : "";
  const queryTx = searchParams?.get("tx");

  const { paymentRequest, isLoading } = usePaymentRequest(paymentId, false);

  React.useEffect(() => {
    // Trigger celebratory confetti on success mount
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#059669", "#6ee7b7"],
      });
    } catch {
      // Confetti fallback
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900/60 p-8 text-center animate-pulse rounded-3xl">
          <Receipt className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading settlement receipt...</p>
        </Card>
      </div>
    );
  }

  const txHash = queryTx || paymentRequest?.txHash;
  const explorerUrl = txHash ? `${ARC_TESTNET_EXPLORER}/tx/${txHash}` : null;

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Main Success Card */}
        <Card className="border-emerald-500/30 bg-slate-900/95 shadow-2xl backdrop-blur-md overflow-hidden rounded-3xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900/90 to-slate-900/95 p-6 text-center border-b border-slate-800/80 space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">
              Payment Confirmed!
            </h1>
            <p className="text-xs text-slate-400">
              Settled atomically on Arc Testnet
            </p>

            <div className="pt-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {paymentRequest?.billAmount?.toFixed(2) || "0.00"}{" "}
                <span className="text-lg font-bold text-emerald-400">USDC</span>
              </span>
            </div>
          </div>

          <CardContent className="p-6 space-y-4 text-xs">
            {/* Cashback Reward Highlight */}
            {paymentRequest && paymentRequest.cashbackBps > 0 && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Cashback Reward:
                  </span>
                  <span className="text-sm font-black text-emerald-300">
                    +{paymentRequest.expectedCashback.toFixed(2)} USDC
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {paymentRequest.campaignTitle
                    ? `${paymentRequest.campaignTitle} (${(paymentRequest.cashbackBps / 100).toFixed(1)}% instant cashback)`
                    : `Loyalty reward credited directly from RewardPool.`}
                </p>
              </div>
            )}

            {/* Receipt Line Items */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2.5">
              <div className="flex justify-between py-0.5 text-slate-300">
                <span className="text-slate-400">Restaurant</span>
                <span className="font-semibold text-white flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  {paymentRequest?.restaurantName || "Arc Restaurant"}
                </span>
              </div>

              <div className="flex justify-between py-0.5 text-slate-300">
                <span className="text-slate-400">Invoice Reference</span>
                <span className="font-mono text-slate-200">
                  {paymentRequest?.invoiceId || paymentId}
                </span>
              </div>

              {paymentRequest?.payerAddress && (
                <div className="flex justify-between py-0.5 text-slate-300">
                  <span className="text-slate-400">Payer Address</span>
                  <span className="font-mono text-[11px] text-slate-200">
                    {paymentRequest.payerAddress.slice(0, 6)}...{paymentRequest.payerAddress.slice(-4)}
                  </span>
                </div>
              )}

              {paymentRequest?.blockNumber && (
                <div className="flex justify-between py-0.5 text-slate-300">
                  <span className="text-slate-400">Block Number</span>
                  <span className="font-mono text-slate-200">
                    #{paymentRequest.blockNumber}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-0.5 text-slate-300 border-t border-slate-800/60 pt-2">
                <span className="text-slate-400">Settlement Network</span>
                <span className="text-emerald-400 font-semibold">Arc Testnet (5042002)</span>
              </div>
            </div>

            {/* Transaction Link */}
            {explorerUrl && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    On-Chain Transaction
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400 truncate block">
                    {txHash?.slice(0, 10)}...{txHash?.slice(-8)}
                  </span>
                </div>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 shrink-0"
                >
                  <span>View on Arcscan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-2.5">
            <Link href="/scan" className="w-full">
              <Button size="lg" className="w-full font-bold gap-2">
                <QrCode className="w-4 h-4" />
                Scan Another Bill
              </Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">
                Home
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Security & Immutability Badge */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cryptographically confirmed on Arc blockchain</span>
        </div>
      </div>
    </div>
  );
}
