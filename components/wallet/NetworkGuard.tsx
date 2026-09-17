"use client";

import * as React from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ARC_TESTNET_CHAIN_ID } from "@/lib/arc/chain";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface NetworkGuardProps {
  children?: React.ReactNode;
}

export function NetworkGuard({ children }: NetworkGuardProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== ARC_TESTNET_CHAIN_ID;

  if (isWrongNetwork) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Wrong Network Detected</p>
              <p className="text-xs text-amber-200/80">
                You are connected to Chain ID {chainId}. Please switch to Arc Testnet (5042002).
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
            disabled={isPending}
            className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Switching...
              </>
            ) : (
              "Switch to Arc Testnet"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
