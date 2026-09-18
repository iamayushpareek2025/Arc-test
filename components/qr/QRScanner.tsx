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
  Upload,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export function QRScanner() {
  const router = useRouter();

  const [mode, setMode] = React.useState<"camera" | "photo" | "manual">("photo");
  const [manualCode, setManualCode] = React.useState<string>("");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isNavigating, setIsNavigating] = React.useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = React.useState<boolean>(false);

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);
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
        setValidationError(result.error || "Scanned QR code is not a valid DineBack invoice link.");
      }
    },
    [router]
  );

  // Initialize Live Camera Scanner (Works on localhost or HTTPS)
  React.useEffect(() => {
    let isMounted = true;

    if (mode === "camera" && !isNavigating) {
      setCameraError(null);
      setValidationError(null);

      const isSecure =
        typeof window !== "undefined" &&
        (window.isSecureContext ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      if (!isSecure) {
        setCameraError(
          "Mobile browsers block live video streams over non-HTTPS local IP. Use 'Snap / Photo' below to scan with your phone camera instantly."
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
              console.warn("Camera init failed:", err);
              if (isMounted) {
                setCameraError(
                  "Camera access was denied or is unavailable. Please use 'Snap / Photo' or 'Enter Code' below."
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

  // Robust Photo / File Scan using multi-scale jsQR & canvas
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
        "Could not detect a valid QR code in this image. Please ensure the QR is well-lit and in focus, or enter the invoice code directly."
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
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
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
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === "camera"
              ? "bg-emerald-500 text-slate-950 shadow-md font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Live Camera
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

      {cameraError && mode !== "camera" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">{cameraError}</p>
        </div>
      )}

      {isNavigating && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Valid invoice detected. Loading bill...</span>
        </div>
      )}

      {/* Snap / Photo Upload Mode */}
      {mode === "photo" && !isNavigating && (
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl rounded-3xl">
          <CardContent className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Scan Restaurant QR Code
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Take a quick photo of the bill QR code or pick a screenshot from your gallery.
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
                className="w-full py-4 font-bold gap-2 text-sm shadow-lg shadow-emerald-500/20"
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
                className="w-full py-3.5 text-xs font-semibold gap-2 border-slate-700 hover:bg-slate-800"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                Upload Photo from Gallery
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Camera Mode */}
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

          <div className="relative bg-black flex items-center justify-center min-h-[280px]">
            <div id={elementId} className="w-full overflow-hidden" />
          </div>

          <div className="p-3 bg-slate-950/80 text-center text-[11px] text-slate-500 border-t border-slate-800/60">
            Powered by Arc Testnet • USDC Cashback Enabled
          </div>
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
