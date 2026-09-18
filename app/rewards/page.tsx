"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { ARC_TESTNET_CHAIN_ID } from "@/lib/arc/chain";
import { CampaignRepository } from "@/lib/firebase/repositories/campaigns";
import { CashbackCampaign } from "@/types/campaign";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/wallet/WalletButton";
import {
  Sparkles,
  Coins,
  Store,
  ArrowRight,
  Gift,
  ShieldCheck,
  TrendingUp,
  Percent,
} from "lucide-react";
import Link from "next/link";

export default function RewardsPage() {
  const { isConnected, chainId } = useAccount();
  const { formatted: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance();
  const isArc = isConnected && chainId === ARC_TESTNET_CHAIN_ID;

  const [campaigns, setCampaigns] = React.useState<CashbackCampaign[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    async function loadCampaigns() {
      try {
        const list = await CampaignRepository.listAllActive();
        if (isMounted) {
          setCampaigns(list);
        }
      } catch (err) {
        console.warn("Failed to load campaigns:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadCampaigns();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-[85vh] py-8 sm:py-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <Badge variant="success" className="py-1 px-3 text-xs gap-1.5 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Arc Programmable Loyalty
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Earn Instant <span className="text-emerald-400">USDC Cashback</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          Every time you pay a DineBack restaurant bill with USDC on Arc Testnet, promotional cashback is disbursed atomically to your wallet.
        </p>
      </div>

      {/* Wallet Rewards Summary Card */}
      <Card className="border-slate-800 bg-gradient-to-br from-slate-900/95 to-slate-950 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Connected Wallet Balance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {isConnected ? (isLoadingBalance ? "..." : usdcBalance) : "0.00"}
              </span>
              <span className="text-sm font-bold text-emerald-400">USDC (Arc)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isConnected
                ? isArc
                  ? "Connected to Arc Testnet (Chain ID 5042002)"
                  : "Please switch to Arc Testnet"
                : "Connect your wallet to track rewards"}
            </p>
          </div>

          <div className="space-y-1 md:border-l md:border-slate-800 md:pl-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Settlement Speed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">~1 Sec</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Instant atomicity via RewardPool smart contract
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 justify-center md:items-end">
            {!isConnected ? (
              <WalletButton />
            ) : (
              <Link href="/scan" className="w-full sm:w-auto md:w-full">
                <Button className="w-full font-bold gap-2 shadow-lg shadow-emerald-500/20 py-3 rounded-2xl text-xs">
                  <Coins className="w-4 h-4" />
                  Scan Bill to Earn
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Active Cashback Campaigns */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Active Restaurant Campaigns</h2>
          </div>
          <span className="text-xs text-slate-400">
            {campaigns.length} Participating {campaigns.length === 1 ? "Program" : "Programs"}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="border-slate-800 bg-slate-900/60 p-6 rounded-3xl animate-pulse">
                <div className="h-5 bg-slate-800 rounded w-1/2 mb-3" />
                <div className="h-4 bg-slate-800 rounded w-3/4" />
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border-dashed border-slate-800 bg-slate-950/40 p-8 text-center rounded-3xl">
            <p className="text-xs text-slate-400">No active campaigns configured right now.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((camp) => (
              <Card
                key={camp.id}
                className="border-slate-800 bg-slate-900/80 hover:border-emerald-500/40 transition-all rounded-3xl overflow-hidden shadow-lg backdrop-blur-sm group"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs text-slate-400 font-semibold">
                          Partner Restaurant
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {camp.title}
                      </h3>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-sm flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      {(camp.cashbackBps / 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Minimum Order:</span>
                      <span className="font-semibold text-white">{camp.minSpend.toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Maximum Reward Cap:</span>
                      <span className="font-semibold text-emerald-400">
                        {camp.maxCashback.toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Reward Pool Status:</span>
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Funded & Active
                      </span>
                    </div>
                  </div>

                  <Link href="/scan" className="block pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-semibold gap-1.5 border-slate-700 hover:bg-slate-800 rounded-xl"
                    >
                      Scan QR at this restaurant
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* How it works banner */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">How On-Chain Cashback Works</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="space-y-1 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60">
            <span className="font-bold text-white block">1. Scan Bill</span>
            <p>Scan the merchant invoice QR using your phone camera or MetaMask.</p>
          </div>
          <div className="space-y-1 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60">
            <span className="font-bold text-white block">2. Pay in USDC</span>
            <p>Approve and settle the exact bill on Arc Testnet with 6 decimals precision.</p>
          </div>
          <div className="space-y-1 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60">
            <span className="font-bold text-white block">3. Instant Reward</span>
            <p>The DineBack contract automatically sends cashback directly to your wallet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
