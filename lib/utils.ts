import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address?: string | null, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatCurrency(amount: number, currency = "USDC"): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`;
}

export function calculateCashback(amount: number, bps: number, maxCashback?: number): number {
  const rawCashback = (amount * bps) / 10000;
  if (maxCashback && maxCashback > 0) {
    return Math.min(rawCashback, maxCashback);
  }
  return rawCashback;
}
