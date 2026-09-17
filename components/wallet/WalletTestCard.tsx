"use client";

import * as React from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ARC_TESTNET_CHAIN_ID, ARC_USDC_ADDRESS, ARC_TESTNET_EXPLORER } from "@/lib/arc/chain";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectWalletModal } from "./ConnectWalletModal";
import {
  Wallet,
  Coins,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
} from "lucide-react";

export function WalletTestCard() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const {
    formatted: usdcBalance,
    decimals,
    symbol,
    rawBalance,
    isLoading: isLoadingBalance,
    isError,
    refetch,
    isCorrectNetwork,
  } = useUSDCBalance();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="w-full max-w-2xl border-slate-800 bg-slate-900/60 animate-pulse p-6">
        <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
        <div className="h-20 bg-slate-800/50 rounded-xl" />
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-2xl border-emerald-500/20 bg-slate-900/90 shadow-2xl backdrop-blur-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Arc Testnet Wallet Verification</CardTitle>
                <CardDescription>
                  Live interaction with Arc Testnet (Chain ID 5042002)
                </CardDescription>
              </div>
            </div>

            {isConnected ? (
              isCorrectNetwork ? (
                <Badge variant="success" className="gap-1.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Arc Testnet Connected
                </Badge>
              ) : (
                <Badge variant="danger" className="gap-1.5 py-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Wrong Network ({chainId})
                </Badge>
              )
            ) : (
              <Badge variant="secondary">Wallet Disconnected</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
              <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-200">
                Connect your Web3 wallet to test Arc
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Connect MetaMask, Rabby, or any browser wallet to verify Arc Testnet connectivity and read your real USDC balance.
              </p>
              <div className="mt-4">
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </Button>
              </div>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Wrong Network</h4>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Your wallet is connected to Chain ID {chainId}. DineBack requires Arc Testnet (Chain ID 5042002).
                  </p>
                </div>
              </div>
              <Button
                onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
                disabled={isSwitching}
                size="sm"
                className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold"
              >
                {isSwitching ? "Switching Network..." : "Switch to Arc Testnet"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Account details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Connected Account
                  </span>
                  <p className="font-mono text-xs text-slate-200 truncate mt-1">
                    {address}
                  </p>
                  <a
                    href={`${ARC_TESTNET_EXPLORER}/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline mt-2"
                  >
                    View on Arcscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      USDC Balance
                    </span>
                    <button
                      onClick={() => refetch()}
                      className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                      title="Refresh Balance"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalance ? "animate-spin text-emerald-400" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-white tracking-tight">
                      {isLoadingBalance ? "..." : usdcBalance}
                    </span>
                    <span className="text-sm font-semibold text-emerald-400">
                      {symbol}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Decimals: {decimals} • Raw: {rawBalance.toString()}
                  </p>
                </div>
              </div>

              {/* Verified Token Contract Box */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Arc USDC Token:</span>
                  <code className="font-mono text-slate-300 text-[11px]">
                    {ARC_USDC_ADDRESS}
                  </code>
                </div>
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-medium text-xs shrink-0"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Get Testnet USDC (Circle Faucet)
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
