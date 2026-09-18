"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { parseAndValidatePaymentInput } from "@/lib/validation/qr";
import { decodeQRFromFile } from "@/lib/qr/decoder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Keyboard,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  QrCode,
  Image as ImageIcon,
  Smartphone,
  Receipt,
  Sparkles,
  Zap,
} from "lucide-react";

interface RecentInvoice {
  id: string;
  invoiceId: string;
  restaurantName: string;
  billAmount: number;
  expectedCashback: number;
  status: string;
}

export function QRScanner() {
  const router = useRouter();

  const [mode, setMode] = React.useState<"photo" | "camera" | "manual">("photo");
  const [manualCode, setManualCode] = React.useState<string>("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isNavigating, setIsNavigating] = React.useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = React.useState<boolean>(false);
  const [recentInvoices, setRecentInvoices] = React.useState<RecentInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = React.useState<boolean>(false);

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);
  const elementId = "dineback-qr-reader";

  // Fetch recent active invoices for 1-tap mobile demo testing
  React.useEffect(() => {
    async function loadInvoices() {
      setIsLoadingInvoices(true);
      try {
        const res = await fetch("/api/invoices");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.invoices)) {
            setRecentInvoices(data.invoices.slice(0, 3));
          }
        }
      } catch {
        // Ignore background fetch error
      } finally {
        setIsLoadingInvoices(false);
      }
    }
    loadInvoices();
  }, []);

  const handleScanSuccess = React.useCallback(
    async (decodedText: string) => {
      const result = parseAndValidatePaymentInput(decodedText);
      if (result.isValid && result.paymentId) {
        setIsNavigating(true);
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
          } catch {
            // Ignore stop errors
          }
        }
        router.push(`/pay/${result.paymentId}`);
      } else {
        setValidationError(result.error || "Scanned QR code is not a valid DineBack invoice link.");
      }
    },
    [router]
  );

  // Initialize Live Camera Scanner (Only when selected and on secure context)
  React.useEffect(() => {
    let isMounted = true;

    if (mode === "camera" && !isNavigating) {
      setValidationError(null);

      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      html5QrCode
        .start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isMounted) handleScanSuccess(decodedText);
          },
          () => {}
        )
        .catch(() => {
          Html5Qrcode.getCameras()
            .then((cameras) => {
              if (cameras && cameras.length > 0 && isMounted) {
                const backCamera =
                  cameras.find((c) => c.label.toLowerCase().includes("back")) ||
                  cameras[cameras.length - 1];
                return html5QrCode.start(
                  backCamera.id,
                  config,
                  (decodedText) => {
                    if (isMounted) handleScanSuccess(decodedText);
                  },
                  () => {}
                );
              }
              throw new Error("No cameras detected");
            })
            .catch((err) => {
              console.warn("Camera stream unavailable:", err);
              if (isMounted) {
                setValidationError(
                  "Live video stream unavailable on unencrypted IP. Use 'Snap / Photo' or select an active invoice below."
                );
                setMode("photo");
              }
            });
        });

      return () => {
        isMounted = false;
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              scannerRef.current.stop().catch(() => {});
            }
          } catch {
            // Ignore
          }
        }
      };
    }
  }, [mode, isNavigating, handleScanSuccess]);

  // Photo / File Scan using multi-scale jsQR & canvas
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setIsProcessingFile(true);

    try {
      // 1. Try pure multi-scale canvas decode
      const decodedText = await decodeQRFromFile(file);
      if (decodedText) {
        handleScanSuccess(decodedText);
        return;
      }

      // 2. Fallback to html5-qrcode file scan
      const html5QrCode = new Html5Qrcode("dineback-qr-fallback-box");
      const fallbackText = await html5QrCode.scanFile(file, false);
      html5QrCode.clear();

      if (fallbackText) {
        handleScanSuccess(fallbackText);
        return;
      }

      throw new Error("QR code not detected in image.");
    } catch (err) {
      console.warn("QR file scan error:", err);
      setValidationError(
        "Could not detect a clear QR code. Please make sure the QR is centered and well-lit, or select the invoice below."
      );
    } finally {
      setIsProcessingFile(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const result = parseAndValidatePaymentInput(manualCode);
    if (result.isValid && result.paymentId) {
      setIsNavigating(true);
      router.push(`/pay/${result.paymentId}`);
    } else {
      setValidationError(
        result.error || "Please enter a valid invoice ID (e.g. db_8f72k9a1b2c3) or payment link."
      );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Hidden container for fallback scanner */}
      <div id="dineback-qr-fallback-box" style={{ width: 1, height: 1, overflow: "hidden", opacity: 0 }} />

      {/* Mode Selector Tabs */}
      <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            mode === "photo"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Snap / Photo
        </button>
        <button
          type="button"
          onClick={() => setMode("camera")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            mode === "camera"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Live Stream
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
            mode === "manual"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          Enter Code
        </button>
      </div>

      {/* Validation / Scan Errors */}
      {validationError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Scan Notice</p>
            <p className="text-red-200/80 text-[11px] mt-0.5">{validationError}</p>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-red-400 hover:text-red-200 text-xs underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading Transition Indicator */}
      {isNavigating && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Valid invoice detected. Opening bill checkout...</span>
        </div>
      )}

      {/* Mode 1: Snap / Photo Upload Mode */}
      {mode === "photo" && !isNavigating && (
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl rounded-3xl backdrop-blur-md">
          <CardContent className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Scan Restaurant QR Code
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Take a photo of the bill QR code or pick an existing image from your gallery.
              </p>
            </div>

            {/* Hidden Inputs */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="space-y-2.5 pt-2">
              <Button
                type="button"
                disabled={isProcessingFile}
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-4 font-bold gap-2 text-sm shadow-lg shadow-emerald-500/20 rounded-2xl"
              >
                {isProcessingFile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Decoding QR Code...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Take Photo of QR Code
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isProcessingFile}
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-3.5 text-xs font-semibold gap-2 border-slate-700 hover:bg-slate-800 rounded-2xl"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                Upload Photo from Gallery
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode 2: Live Camera Stream */}
      {mode === "camera" && !isNavigating && (
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden rounded-3xl">
          <div className="p-4 text-center border-b border-slate-800/80">
            <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Live Camera Stream
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Point your camera directly at the QR code
            </p>
          </div>

          <div className="relative bg-black flex items-center justify-center min-h-[260px]">
            <div id={elementId} className="w-full overflow-hidden" />
          </div>

          <div className="p-3 bg-slate-950/80 text-center text-[11px] text-slate-500 border-t border-slate-800/60">
            Requires HTTPS or localhost • Powered by Arc Testnet
          </div>
        </Card>
      )}

      {/* Mode 3: Manual Input Mode */}
      {mode === "manual" && (
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl rounded-3xl">
          <CardContent className="p-6">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Invoice Code or Link
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. db_8f72k9a1b2c3 or paste URL"
                  required
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3.5 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Accepted Formats:</span>
                <p>• Invoice ID: <code className="text-emerald-400 font-mono">db_8f72k9a1b2c3</code></p>
                <p>• Direct URL: <code className="text-emerald-400 font-mono">/pay/db_8f72k9a1b2c3</code></p>
              </div>

              <Button
                type="submit"
                disabled={isNavigating || !manualCode.trim()}
                className="w-full py-3.5 font-bold gap-2 shadow-lg shadow-emerald-500/20 rounded-2xl"
              >
                {isNavigating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Opening Bill...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Native Mobile Scanning Tip */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-emerald-300">
            Native Phone Camera Tip
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            You can also open your phone’s regular <strong className="text-slate-200">Camera App</strong> or <strong className="text-slate-200">MetaMask In-App Browser</strong> and point it at the restaurant screen QR to jump straight to checkout!
          </p>
        </div>
      </div>

      {/* Quick 1-Tap Active Invoices for testing */}
      {recentInvoices.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              Active Bills on POS
            </span>
            <span className="text-[10px] text-slate-500">1-Tap Quick Pay</span>
          </div>

          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => {
                  setIsNavigating(true);
                  router.push(`/pay/${inv.id}`);
                }}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-emerald-500/40 transition-all flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      {inv.invoiceId} • {inv.restaurantName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Bill: <strong className="text-slate-200">{inv.billAmount.toFixed(2)} USDC</strong>
                    {inv.expectedCashback > 0 && (
                      <span className="text-emerald-400 ml-1.5 font-semibold">
                        (+{inv.expectedCashback.toFixed(2)} Cashback)
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
