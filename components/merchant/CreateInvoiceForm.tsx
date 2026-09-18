"use client";

import * as React from "react";
import { Restaurant } from "@/types/restaurant";
import { CashbackCampaign } from "@/types/campaign";
import { PaymentRequest } from "@/types/payment";
import { RestaurantRepository } from "@/lib/firebase/repositories/restaurants";
import { CampaignRepository } from "@/lib/firebase/repositories/campaigns";
import { PaymentRequestRepository } from "@/lib/firebase/repositories/paymentRequests";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Store,
  Receipt,
  Sparkles,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface CreateInvoiceFormProps {
  onCreated: (request: PaymentRequest) => void;
}

export function CreateInvoiceForm({ onCreated }: CreateInvoiceFormProps) {
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = React.useState<string>("");
  const [campaigns, setCampaigns] = React.useState<CashbackCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>("");

  const [invoiceId, setInvoiceId] = React.useState<string>(`INV-${Date.now().toString().slice(-6)}`);
  const [tableNumber, setTableNumber] = React.useState<string>("Table 1");
  const [billAmount, setBillAmount] = React.useState<string>("45.00");
  const [durationMinutes, setDurationMinutes] = React.useState<number>(15);
  const [notes, setNotes] = React.useState<string>("");

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load active restaurants
  React.useEffect(() => {
    async function loadRestaurants() {
      const list = await RestaurantRepository.listActive();
      setRestaurants(list);
      if (list.length > 0) {
        setSelectedRestaurantId(list[0].id);
      }
    }
    loadRestaurants();
  }, []);

  // Load campaigns when restaurant changes
  React.useEffect(() => {
    async function loadCampaigns() {
      if (!selectedRestaurantId) return;
      const list = await CampaignRepository.listActiveByRestaurant(selectedRestaurantId);
      setCampaigns(list);
      if (list.length > 0) {
        setSelectedCampaignId(list[0].id);
      } else {
        setSelectedCampaignId("");
      }
    }
    loadCampaigns();
  }, [selectedRestaurantId]);

  const numAmount = parseFloat(billAmount) || 0;
  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Live Cashback preview calculation
  let expectedCashback = 0;
  if (selectedCampaign && numAmount >= selectedCampaign.minSpend) {
    const raw = (numAmount * selectedCampaign.cashbackBps) / 10000;
    expectedCashback = selectedCampaign.maxCashback > 0 ? Math.min(raw, selectedCampaign.maxCashback) : raw;
  }

  const handleGenerateInvoiceId = () => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setInvoiceId(`INV-${randomSuffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (numAmount <= 0) {
        throw new Error("Bill amount must be greater than 0.");
      }

      const created = await PaymentRequestRepository.create({
        restaurantId: selectedRestaurantId,
        invoiceId,
        tableNumber,
        billAmount: numAmount,
        campaignId: selectedCampaignId || undefined,
        notes: notes || undefined,
        durationMinutes,
      });

      onCreated(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create payment request.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md text-slate-100">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Generate Payment Request</CardTitle>
            <CardDescription>
              Create customer bill with programmable on-chain USDC cashback
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Restaurant Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Restaurant Location
            </label>
            <div className="relative">
              <select
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.city} ({r.cuisine})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice ID and Table Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Order / Invoice ID
                </label>
                <button
                  type="button"
                  onClick={handleGenerateInvoiceId}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Auto
                </button>
              </div>
              <input
                type="text"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="e.g. INV-2026-089"
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Table / Section (Optional)
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. Table 4 / Bar"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Bill Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Bill Amount (USDC)
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-4 pr-28 py-3 text-lg font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="absolute right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 pointer-events-none">
                <span>USDC</span>
                <span className="text-[10px] text-emerald-500 font-semibold">(Arc)</span>
              </div>
            </div>
          </div>

          {/* Cashback Campaign Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Cashback Reward Program
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">No Promotional Cashback (0%)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({(c.cashbackBps / 100).toFixed(1)}% Cashback)
                </option>
              ))}
            </select>
          </div>

          {/* Cashback Preview Box */}
          {selectedCampaign && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  Cashback Rate:
                </span>
                <span>{(selectedCampaign.cashbackBps / 100).toFixed(1)}% on Arc</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 pt-1">
                <span>Customer Reward Estimate:</span>
                <span className="text-emerald-300 font-bold text-sm">
                  +{expectedCashback.toFixed(2)} USDC
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Min spend: {selectedCampaign.minSpend.toFixed(2)} USDC • Max reward cap: {selectedCampaign.maxCashback.toFixed(2)} USDC
              </p>
            </div>
          )}

          {/* Expiry / Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Validity Window
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes (Standard)</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Server / POS Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional internal note"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-4 text-base font-bold shadow-lg shadow-emerald-500/20"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating Invoice...
              </>
            ) : (
              <>
                Generate QR & Payment Link
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
