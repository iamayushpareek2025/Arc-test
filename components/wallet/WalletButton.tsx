"use client";

import * as React from "react";
import { useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER } from "@/lib/arc/chain";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { formatAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConnectWalletModal } from "./ConnectWalletModal";
import {
  Wallet,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  AlertTriangle,
  Check,
  Coins,
} from "lucide-react";

export function WalletButton() {
  const [mounted, setMounted] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { formatted: usdcBalance, isLoading: isLoadingBalance } = useUSDCBalance();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <Button variant="secondary" size="sm" className="opacity-70 cursor-wait">
        <Wallet className="w-4 h-4 mr-1.5" />
        Connect Wallet
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <>
        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-2 shadow-emerald-500/10"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </Button>
        <ConnectWalletModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  const isWrongNetwork = chainId !== ARC_TESTNET_CHAIN_ID;

  if (isWrongNetwork) {
    return (
      <Button
        variant="danger"
        size="sm"
        onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
        className="gap-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold"
      >
        <AlertTriangle className="w-4 h-4 text-slate-950" />
        Switch to Arc Testnet
      </Button>
    );
  }

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-sm backdrop-blur-sm">
        {/* USDC Balance Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-200">
          <Coins className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isLoadingBalance ? "..." : `${usdcBalance} USDC`}</span>
        </div>

        {/* Address Pill & Toggle */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 rounded-lg bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700/80 hover:text-white transition-colors"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span>{formatAddress(address, 4)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 text-xs text-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-slate-800/80">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Arc Testnet
            </p>
            <p className="font-mono text-xs text-slate-200 truncate mt-0.5">
              {address}
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              onClick={handleCopy}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied Address!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Address</span>
                </>
              )}
            </button>

            <a
              href={`${ARC_TESTNET_EXPLORER}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>View on Arcscan</span>
            </a>
          </div>

          <div className="pt-1 border-t border-slate-800/80">
            <button
              onClick={() => {
                disconnect();
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
