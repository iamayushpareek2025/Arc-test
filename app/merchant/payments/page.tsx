"use client";

import * as React from "react";
import { PaymentRequest } from "@/types/payment";
import { RestaurantRepository } from "@/lib/firebase/repositories/restaurants";
import { PaymentRequestRepository } from "@/lib/firebase/repositories/paymentRequests";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusMeta } from "@/lib/payments/statusLifecycle";
import { DynamicPaymentQR } from "@/components/qr/DynamicPaymentQR";
import {
  ArrowLeft,
  QrCode,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  X,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";

export default function MerchantPaymentsPage() {
  const [requests, setRequests] = React.useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = React.useState<PaymentRequest | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<string>("ALL");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const loadRequests = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const restaurants = await RestaurantRepository.listActive();
      if (restaurants.length > 0) {
        const list = await PaymentRequestRepository.listByRestaurant(restaurants[0].id, 50);
        setRequests(list);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleCancel = async (id: string) => {
    try {
      await PaymentRequestRepository.cancel(id);
      await loadRequests();
      if (selectedRequest && selectedRequest.id === id) {
        const updated = await PaymentRequestRepository.getById(id);
        setSelectedRequest(updated);
      }
    } catch (err) {
      console.error("Failed to cancel invoice:", err);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === "ALL" || r.status === filterStatus;
    const matchesSearch =
      r.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.tableNumber && r.tableNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#090b0e] py-8 sm:py-12 px-4 sm:px-6 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <Link href="/merchant">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-400 hover:text-white">
                <ArrowLeft className="w-3.5 h-3.5" />
                Merchant Dashboard
              </Button>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-white">
              Invoices & Payment Requests Ledger
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/merchant/qr">
              <Button size="sm" className="gap-1.5 text-xs font-bold shadow-emerald-500/10">
                <PlusCircle className="w-3.5 h-3.5" />
                New Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, table..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="CREATED">Created (Ready)</option>
              <option value="PENDING">Pending Payment</option>
              <option value="PAID">Paid / Settled</option>
              <option value="COMPLETED">Completed</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadRequests}
              className="h-9 px-3 text-xs"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Invoices Table */}
        <Card className="border-slate-800 bg-slate-900/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Request ID</th>
                  <th className="px-5 py-3.5 font-semibold">Order / Invoice</th>
                  <th className="px-5 py-3.5 font-semibold">Table</th>
                  <th className="px-5 py-3.5 font-semibold">Bill Amount</th>
                  <th className="px-5 py-3.5 font-semibold">Cashback</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Expires</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                      No invoices match your current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const statusMeta = getStatusMeta(req.status);
                    return (
                      <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                          {req.id}
                        </td>
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
                          {req.cashbackBps > 0 ? `+${req.expectedCashback.toFixed(2)} USDC (${(req.cashbackBps / 100).toFixed(1)}%)` : "0%"}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusMeta.badgeVariant} className="text-[10px]">
                            {statusMeta.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">
                          {new Date(req.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedRequest(req)}
                              className="h-7 px-2.5 text-[11px]"
                            >
                              <QrCode className="w-3 h-3 mr-1 text-emerald-400" />
                              QR
                            </Button>

                            <Link href={`/pay/${req.id}`} target="_blank">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-slate-400 hover:text-white"
                              >
                                Pay Link <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>

                            {(req.status === "CREATED" || req.status === "PENDING") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(req.id)}
                                className="h-7 px-2 text-[11px] text-red-400 hover:bg-red-500/10"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* QR Modal when QR button is clicked */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setSelectedRequest(null)}
                className="absolute -top-10 right-0 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <DynamicPaymentQR
                paymentRequest={selectedRequest}
                onCancel={handleCancel}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
