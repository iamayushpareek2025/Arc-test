"use client";

import * as React from "react";
import { PaymentRequest } from "@/types/payment";
import { CreateInvoiceForm } from "@/components/merchant/CreateInvoiceForm";
import { DynamicPaymentQR } from "@/components/qr/DynamicPaymentQR";
import { PaymentRequestRepository } from "@/lib/firebase/repositories/paymentRequests";
import { usePaymentRequest } from "@/hooks/usePaymentRequest";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, QrCode, ArrowLeft, History, Radio } from "lucide-react";
import Link from "next/link";

function LiveMerchantQRView({
  initialRequest,
  onReset,
}: {
  initialRequest: PaymentRequest;
  onReset: () => void;
}) {
  const { paymentRequest, isLiveFirestore } = usePaymentRequest(initialRequest.id, false);
  const current = paymentRequest || initialRequest;

  const handleCancel = async (id: string) => {
    try {
      await PaymentRequestRepository.cancel(id);
    } catch (err) {
      console.error("Failed to cancel invoice:", err);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Live POS Bill QR
          </span>
          {isLiveFirestore ? (
            <Badge variant="success" className="text-[10px] py-0 px-1.5 gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
              Live Firestore
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-400 border-slate-700">
              Dev Sync
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1" />
          New Invoice
        </Button>
      </div>

      <DynamicPaymentQR
        paymentRequest={current}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default function MerchantQRPage() {
  const [activeRequest, setActiveRequest] = React.useState<PaymentRequest | null>(null);

  return (
    <div className="min-h-screen bg-[#090b0e] py-8 sm:py-12 px-4 sm:px-6">
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
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              POS Bill & QR Generator
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/merchant/payments">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Payments Ledger
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content: Split POS Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Invoice Form */}
          <div className="lg:col-span-6 flex justify-center">
            <CreateInvoiceForm
              onCreated={(req) => {
                setActiveRequest(req);
              }}
            />
          </div>

          {/* Right: Live Dynamic QR Display */}
          <div className="lg:col-span-6 flex flex-col items-center">
            {activeRequest ? (
              <LiveMerchantQRView
                initialRequest={activeRequest}
                onReset={() => setActiveRequest(null)}
              />
            ) : (
              <Card className="w-full max-w-md border-dashed border-slate-800 bg-slate-950/40 p-10 text-center text-slate-500 rounded-3xl flex flex-col items-center justify-center min-h-[380px]">
                <QrCode className="w-16 h-16 text-slate-700 mb-4 stroke-1" />
                <h4 className="text-base font-semibold text-slate-300">
                  Ready to Generate Bill QR
                </h4>
                <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  Fill out the order amount and select a cashback campaign on the left to generate an instant, dynamic payment QR for your customer.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
