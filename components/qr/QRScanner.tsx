"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { parseAndValidatePaymentInput } from "@/lib/validation/qr";
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
  Upload,
  ShieldAlert,
} from "lucide-react";

export function QRScanner() {
  const router = useRouter();

  const [mode, setMode] = React.useState<"camera" | "photo" | "manual">("camera");
  const [manualCode, setManualCode] = React.useState<string>("");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isNavigating, setIsNavigating] = React.useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = React.useState<boolean>(false);

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const elementId = "dineback-qr-reader";

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
        setValidationError(result.error || "Scanned QR code is not a valid DineBack invoice.");
      }
    },
    [router]
  );

  // Initialize Live Camera Scanner
  React.useEffect(() => {
    let isMounted = true;

    if (mode === "camera" && !isNavigating) {
      setCameraError(null);
      setValidationError(null);

      // Check if secure context
      const isSecure =
        typeof window !== "undefined" &&
        (window.isSecureContext ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      if (!isSecure) {
        setCameraError(
          "Live camera stream requires HTTPS when accessing over mobile WiFi. Please use 'Snap / Upload Photo' or 'Enter Code' below."
        );
        setMode("photo");
        return;
      }

      const html5QrCode = new Html5Qrcode(elementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Try environment facing camera first
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
          // Fallback to any available camera ID
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
              console.warn("Camera init failed:", err);
              if (isMounted) {
                setCameraError(
                  "Camera access was denied or is unavailable. Use 'Snap / Upload Photo' or 'Enter Code' below."
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

  // Handle Photo / File Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setIsProcessingFile(true);

    try {
      const html5QrCode = new Html5Qrcode("dineback-qr-file-helper");
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleScanSuccess(decodedText);
    } catch (err) {
      console.warn("QR file scan error:", err);
      setValidationError("Could not detect a valid DineBack QR in this image. Please try another photo or enter code.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      {/* Hidden helper for file scanning */}
      <div id="dineback-qr-file-helper" className="hidden" />

      {/* Mode Selector Tabs */}
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => setMode("camera")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === "camera"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Live Camera
        </button>
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === "photo"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Snap / Photo
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === "manual"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          Enter Code
        </button>
      </div>

      {validationError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Scan Error</p>
            <p className="text-red-200/80">{validationError}</p>
          </div>
        </div>
      )}

      {cameraError && mode !== "camera" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>{cameraError}</p>
        </div>
      )}

      {isNavigating && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Valid invoice detected. Loading bill...</span>
        </div>
      )}

      {/* Live Camera Mode */}
      {mode === "camera" && !isNavigating && (
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden rounded-3xl">
          <div className="p-4 text-center border-b border-slate-800/80">
            <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Scan Restaurant Bill QR
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Point your camera at the cashier screen or bill receipt
            </p>
          </div>

          <div className="relative bg-black flex items-center justify-center min-h-[280px]">
            <div id={elementId} className="w-full overflow-hidden" />
          </div>

          <div className="p-3 bg-slate-950/80 text-center text-[11px] text-slate-500 border-t border-slate-800/60">
            Powered by Arc Testnet • USDC Cashback Enabled
          </div>
        </Card>
      )}

      {/* Snap / Photo Upload Mode */}
      {mode === "photo" && !isNavigating && (
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl rounded-3xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Snap or Upload QR Photo
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Take a quick photo of the QR code or pick a screenshot from your phone gallery.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              type="button"
              disabled={isProcessingFile}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 font-bold gap-2 text-sm shadow-lg shadow-emerald-500/20"
            >
              {isProcessingFile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing Photo...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Take Photo / Pick Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual Input Mode */}
      {mode === "manual" && (
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl rounded-3xl">
          <CardContent className="p-6">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Payment Request Code or Link
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. db_8f72k9a1b2c3 or paste URL"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Accepted Formats:</span>
                <p>• Direct ID: <code className="text-emerald-400">db_8f72k9a1b2c3</code></p>
                <p>• Full URL: <code className="text-emerald-400">https://.../pay/db_8f72k9a1b2c3</code></p>
              </div>

              <Button
                type="submit"
                disabled={isNavigating || !manualCode.trim()}
                className="w-full py-3 font-bold gap-2 shadow-lg shadow-emerald-500/20"
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
    </div>
  );
}
