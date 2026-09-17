import * as React from "react";
import { QRScanner } from "@/components/qr/QRScanner";
import { ShieldCheck, Sparkles, QrCode, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Scan & Pay Bill | DineBack",
  description: "Scan your restaurant bill QR code to pay in USDC and earn instant cashback on Arc Testnet.",
};

export default function ScanPage() {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 sm:py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-slate-400 hover:text-white -ml-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          </Link>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Instant Cashback</span>
          </div>
        </div>

        {/* Informational Hero */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <QrCode className="w-6 h-6 text-emerald-400" />
            Scan Bill to Pay
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Position the restaurant QR code inside the frame. We request camera access exclusively to detect your bill invoice securely.
          </p>
        </div>

        {/* QR Scanner & Fallback Component */}
        <QRScanner />

        {/* Security / Arc Verification Notice */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographically Verified Invoices</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
            DineBack validates invoice signatures and IDs directly on Arc Testnet. External links and untrusted domains are automatically blocked.
          </p>
        </div>
      </div>
    </div>
  );
}
