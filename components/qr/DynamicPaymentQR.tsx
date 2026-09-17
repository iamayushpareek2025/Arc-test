"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { PaymentRequest } from "@/types/payment";
import { getStatusMeta } from "@/lib/payments/statusLifecycle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  ExternalLink,
  Clock,
  Coins,
  Store,
  QrCode as QrIcon,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface DynamicPaymentQRProps {
  paymentRequest: PaymentRequest;
  onCancel?: (id: string) => void;
  showDetails?: boolean;
}

export function DynamicPaymentQR({
  paymentRequest,
  onCancel,
  showDetails = true,
}: DynamicPaymentQRProps) {
  const [copied, setCopied] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<string>("");

  const statusMeta = getStatusMeta(paymentRequest.status);

  // Live countdown timer
  React.useEffect(() => {
    function updateCountdown() {
      const remainingMs = paymentRequest.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [paymentRequest.expiresAt]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(paymentRequest.paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md max-w-md w-full mx-auto text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white truncate max-w-[200px]">
            {paymentRequest.restaurantName}
          </span>
        </div>
        <Badge variant={statusMeta.badgeVariant} className="text-[11px] py-0.5">
          {statusMeta.label}
        </Badge>
      </div>

      {/* QR Box */}
      <div className="relative p-4 rounded-2xl bg-white shadow-lg my-2 flex items-center justify-center">
        <QRCodeSVG
          value={paymentRequest.paymentUrl}
          size={210}
          level="H"
          includeMargin={false}
        />

        {paymentRequest.status === "CANCELLED" && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-4 text-center">
            <XCircle className="w-10 h-10 text-slate-400 mb-1" />
            <span className="text-sm font-bold text-slate-200">Invoice Cancelled</span>
          </div>
        )}

        {timeLeft === "Expired" && paymentRequest.status !== "CANCELLED" && (
          <div className="absolute inset-0 bg-red-950/85 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-4 text-center">
            <Clock className="w-10 h-10 text-red-400 mb-1" />
            <span className="text-sm font-bold text-red-200">Invoice Expired</span>
          </div>
        )}
      </div>

      {/* Bill & Reward Summary */}
      <div className="w-full mt-4 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Total Amount:</span>
          <span className="text-lg font-bold text-white">
            {paymentRequest.billAmount.toFixed(2)} USDC
          </span>
        </div>

        {paymentRequest.cashbackBps > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <Coins className="w-3.5 h-3.5" />
              Cashback ({(paymentRequest.cashbackBps / 100).toFixed(1)}%):
            </span>
            <span className="text-emerald-300 font-bold">
              +{paymentRequest.expectedCashback.toFixed(2)} USDC
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
          <span>Order: {paymentRequest.invoiceId}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Expires in: <strong className="text-slate-200">{timeLeft}</strong>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 w-full mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyUrl}
          className="flex-1 gap-1.5 text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied Link</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Payment URL</span>
            </>
          )}
        </Button>

        <Link href={`/pay/${paymentRequest.id}`} target="_blank" className="flex-1">
          <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Bill</span>
          </Button>
        </Link>
      </div>

      {onCancel && (paymentRequest.status === "CREATED" || paymentRequest.status === "PENDING") && (
        <button
          onClick={() => onCancel(paymentRequest.id)}
          className="text-[11px] text-red-400/80 hover:text-red-300 hover:underline mt-3 transition-colors"
        >
          Cancel this unpaid request
        </button>
      )}
    </div>
  );
}
