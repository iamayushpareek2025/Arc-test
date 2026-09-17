import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { WalletButton } from "@/components/wallet/WalletButton";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DineBack | Programmable Restaurant Loyalty & USDC Payments on Arc",
  description:
    "Pay restaurant bills in USDC with instant, verifiable on-chain cashback on Arc Network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090b0e] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#090b0e]/80 backdrop-blur-md">
              <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                <Link href="/" className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-black text-slate-950 shadow-md shadow-emerald-500/20">
                    D
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                      DineBack
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                        ARC TESTNET
                      </span>
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-3 sm:gap-6">
                  <nav className="hidden sm:flex items-center gap-5 text-sm font-medium text-slate-400">
                    <Link
                      href="/scan"
                      className="hover:text-white transition-colors"
                    >
                      Pay Bill
                    </Link>
                    <Link
                      href="/rewards"
                      className="hover:text-white transition-colors"
                    >
                      Rewards
                    </Link>
                    <Link
                      href="/merchant"
                      className="hover:text-white transition-colors"
                    >
                      Merchant
                    </Link>
                  </nav>

                  <WalletButton />
                </div>
              </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t border-slate-800/60 bg-[#06080a] py-8 text-xs text-slate-500">
              <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
                <p>© 2026 DineBack. Built on Arc Testnet (Chain ID 5042002).</p>
                <div className="flex items-center gap-4">
                  <a
                    href="https://testnet.arcscan.app"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-300 underline underline-offset-4"
                  >
                    Arcscan Explorer
                  </a>
                  <span>•</span>
                  <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-300 underline underline-offset-4"
                  >
                    Circle Faucet
                  </a>
                  <span>•</span>
                  <span className="text-slate-400">USDC Settlement (6 Decimals)</span>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
