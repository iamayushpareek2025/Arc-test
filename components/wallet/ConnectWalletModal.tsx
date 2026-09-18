"use client";

import * as React from "react";
import { useConnect } from "wagmi";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_RPC, ARC_TESTNET_EXPLORER } from "@/lib/arc/chain";
import { Button } from "@/components/ui/button";
import {
  X,
  Wallet,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Smartphone,
  Plus,
  RefreshCw,
} from "lucide-react";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connectors, connect, isPending, error } = useConnect();
  const [hasInjected, setHasInjected] = React.useState<boolean>(false);
  const [addChainSuccess, setAddChainSuccess] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHasInjected(Boolean((window as any).ethereum));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Add Arc Testnet to MetaMask/Wallet directly via RPC
  const handleAddArcNetwork = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : null;
    if (!ethereum) {
      alert("No Web3 wallet extension found. Please install MetaMask or open in MetaMask Mobile app.");
      return;
    }

    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
            chainName: "Arc Testnet",
            nativeCurrency: {
              name: "USDC",
              symbol: "USDC",
              decimals: 6,
            },
            rpcUrls: [ARC_TESTNET_RPC],
            blockExplorerUrls: [ARC_TESTNET_EXPLORER],
          },
        ],
      });
      setAddChainSuccess(true);
      setTimeout(() => setAddChainSuccess(false), 3000);
    } catch (err) {
      console.warn("Failed to add Arc network:", err);
    }
  };

  const getMobileMetaMaskUrl = () => {
    if (typeof window === "undefined") return "#";
    const currentUrl = window.location.href.replace(/^https?:\/\//, "");
    return `https://metamask.app.link/dapp/${currentUrl}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-7 shadow-2xl text-slate-100 backdrop-blur-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Connect Web3 Wallet</h3>
            <p className="text-xs text-slate-400">Settle USDC payments on Arc Testnet</p>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold">Connection Notice</p>
              <p className="text-red-200/80 text-[11px] mt-0.5">{error.message}</p>
            </div>
          </div>
        )}

        {/* Available Wallet Connectors */}
        <div className="space-y-2.5">
          {connectors.length > 0 ? (
            connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect(
                    { connector },
                    {
                      onSuccess: () => onClose(),
                    }
                  );
                }}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3.5 text-sm font-bold text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white transition-all duration-150 active:scale-[0.99] disabled:opacity-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block">{connector.name === "Injected" ? "Browser Wallet / MetaMask" : connector.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {hasInjected ? "Detected & Ready" : "Click to connect"}
                    </span>
                  </div>
                </div>
                {isPending ? (
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                )}
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center space-y-3">
              <p className="text-xs text-slate-400">No Web3 wallet extension detected in this browser.</p>
              <a
                href="https://metamask.io/download"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline"
              >
                Install MetaMask Extension
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Mobile Deep Link Option */}
          <a
            href={getMobileMetaMaskUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Open in MetaMask Mobile App</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>

        {/* 1-Click Add Arc Testnet to Wallet */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arc Testnet Network</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 font-semibold">Chain 5042002</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddArcNetwork}
            className="w-full text-xs font-semibold gap-1.5 border-slate-700 hover:bg-slate-800 rounded-xl"
          >
            {addChainSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Arc Testnet Added!</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Arc Testnet to MetaMask</span>
              </>
            )}
          </Button>

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            Gas and payments on Arc are settled natively in USDC (6 decimals).
          </p>
        </div>
      </div>
    </div>
  );
}

