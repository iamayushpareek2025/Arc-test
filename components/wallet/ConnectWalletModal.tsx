"use client";

import * as React from "react";
import { useConnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { X, Wallet, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connectors, connect, isPending, error } = useConnect();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Connect Wallet</h3>
            <p className="text-xs text-slate-400">Select your Web3 wallet for Arc Testnet</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="font-semibold">Connection Error</p>
              <p className="text-red-200/80">{error.message}</p>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {connectors.map((connector) => (
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
              className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 px-4 py-3.5 text-sm font-semibold text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white transition-all duration-150 active:scale-[0.99] disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/60 text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <span>{connector.name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Arc Testnet (5042002)
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Make sure your wallet is connected to Arc Testnet. Gas and payments are settled in USDC.
          </p>
        </div>
      </div>
    </div>
  );
}
