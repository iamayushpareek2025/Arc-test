import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletTestCard } from "@/components/wallet/WalletTestCard";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Store,
  Coins,
  QrCode,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center pb-16">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden py-14 sm:py-20 border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <Badge variant="success" className="mb-4 py-1 px-3 text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Arc Testnet
            (Chain ID 5042002)
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl max-w-3xl mx-auto leading-tight">
            Programmable Restaurant Loyalty &{" "}
            <span className="text-emerald-400">USDC Cashback</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            DineBack turns every restaurant bill into an instant, on-chain customer
            loyalty event. Pay seamlessly with USDC, receive guaranteed on-chain
            cashback, and track rewards in real time.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/merchant/qr">
              <Button size="lg" className="gap-2">
                <Store className="w-5 h-5" />
                Merchant POS & QR
              </Button>
            </Link>
            <Link href="/scan">
              <Button variant="secondary" size="lg" className="gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                Customer Pay Flow
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Phase 2 Live Wallet Verification Card */}
      <section className="w-full max-w-6xl px-4 -mt-8 z-10 flex justify-center sm:px-6">
        <WalletTestCard />
      </section>

      {/* Feature Grid */}
      <section className="w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Fintech Simplicity with Arc Blockchain Settlement
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Real payments, verifiable smart contracts, zero fake crypto fluff.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card className="hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg">Instant Settlement</CardTitle>
              <CardDescription>
                Direct peer-to-peer USDC payments from customer wallet to
                restaurant with zero intermediary delays.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 mb-2 border border-teal-500/20">
                <Coins className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg">Smart Cashback</CardTitle>
              <CardDescription>
                Programmable basis-point cashback disbursed atomically from the
                restaurant reward pool upon verified settlement.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-slate-700 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-2 border border-cyan-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg">Verifiable Security</CardTitle>
              <CardDescription>
                Reentrancy-guarded smart contracts with deadline verification,
                replay protection, and campaign budget caps.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
