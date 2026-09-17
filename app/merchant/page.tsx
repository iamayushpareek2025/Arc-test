"use client";

import * as React from "react";
import { Restaurant } from "@/types/restaurant";
import { PaymentRequest } from "@/types/payment";
import { RestaurantRepository } from "@/lib/firebase/repositories/restaurants";
import { PaymentRequestRepository } from "@/lib/firebase/repositories/paymentRequests";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusMeta } from "@/lib/payments/statusLifecycle";
import {
  Store,
  QrCode,
  DollarSign,
  TrendingUp,
  Coins,
  History,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function MerchantDashboardPage() {
  const [restaurant, setRestaurant] = React.useState<Restaurant | null>(null);
  const [recentRequests, setRecentRequests] = React.useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const restaurants = await RestaurantRepository.listActive();
        if (restaurants.length > 0) {
          const current = restaurants[0];
          setRestaurant(current);
          const requests = await PaymentRequestRepository.listByRestaurant(current.id, 10);
          setRecentRequests(requests);
        }
      } catch (err) {
        console.error("Failed to load merchant data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#090b0e] py-8 sm:py-12 px-4 sm:px-6 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="success" className="text-[11px] gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Merchant
              </Badge>
              <span className="text-xs text-slate-400">• Arc Testnet</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              {restaurant ? restaurant.name : "Merchant Terminal"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {restaurant ? `${restaurant.cuisine} • ${restaurant.address}, ${restaurant.city}` : "Loading POS..."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/merchant/qr">
              <Button size="lg" className="gap-2 shadow-emerald-500/20 font-bold">
                <QrCode className="w-5 h-5" />
                Open POS Cashier & QR
              </Button>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Settlement Revenue
                </CardDescription>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-white mt-1">
                {restaurant ? `${restaurant.totalRevenue.toFixed(2)} USDC` : "0.00 USDC"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-emerald-400/90 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5" /> Instant settlement on Arc
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Cashback Distributed
                </CardDescription>
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-white mt-1">
                {restaurant ? `${restaurant.cashbackDistributed.toFixed(2)} USDC` : "0.00 USDC"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">
                Funded via on-chain RewardPool
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Bills Settled
                </CardDescription>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-white mt-1">
                {restaurant ? restaurant.totalPaymentsCount : 0} Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">
                100% verified on Arc Testnet
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payment Requests / Active Invoices */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Recent Payment Requests
            </h2>
            <Link href="/merchant/payments">
              <span className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium">
                View All Invoices
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>

          <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Order / Invoice ID</th>
                    <th className="px-5 py-3.5 font-semibold">Table</th>
                    <th className="px-5 py-3.5 font-semibold">Bill Amount</th>
                    <th className="px-5 py-3.5 font-semibold">Cashback Rate</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Created</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                        No payment requests created yet. Click &quot;Open POS Cashier &amp; QR&quot; above to issue your first invoice!
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((req) => {
                      const statusMeta = getStatusMeta(req.status);
                      return (
                        <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-medium text-white">
                            {req.invoiceId}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">
                            {req.tableNumber || "—"}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-white">
                            {req.billAmount.toFixed(2)} USDC
                          </td>
                          <td className="px-5 py-3.5 text-emerald-400 font-medium">
                            {req.cashbackBps > 0 ? `${(req.cashbackBps / 100).toFixed(1)}% (+${req.expectedCashback.toFixed(2)} USDC)` : "0%"}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={statusMeta.badgeVariant} className="text-[10px]">
                              {statusMeta.label}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link href={`/pay/${req.id}`} target="_blank">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300">
                                View <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
