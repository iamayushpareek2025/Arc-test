"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
  ShieldAlert,
  HelpCircle,
  Zap,
  CheckCircle2,
  Lock,
} from "lucide-react";

type CameraStatus = "idle" | "requesting" | "scanning" | "denied" | "unavailable";

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

  // Mode: "camera" (live stream), "photo" (camera snap / gallery), "manual" (invoice code)
  const [mode, setMode] = React.useState<"camera" | "photo" | "manual">("camera");
  const [cameraStatus, setCameraStatus] = React.useState<CameraStatus>("idle");
  const [manualCode, setManualCode] = React.useState<string>("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [isNavigating, setIsNavigating] = React.useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = React.useState<boolean>(false);
  const [recentInvoices, setRecentInvoices] = React.useState<RecentInvoice[]>([]);

  const scannerRef = React.useRef<Html5Qrcode | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);
  const isStoppingRef = React.useRef<boolean>(false);
  const elementId = "dineback-live-qr-reader";

  // Fetch recent active invoices for 1-tap testing
  React.useEffect(() => {
    let isMounted = true;
    async function loadInvoices() {
      try {
        const res = await fetch("/api/invoices");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success && Array.isArray(data.invoices)) {
            setRecentInvoices(data.invoices.slice(0, 3));
          }
        }
      } catch {
        // Ignore background fetch error
      }
    }
    loadInvoices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Safe scanner stopper & cleanup helper
  const stopLiveScanner = React.useCallback(async () => {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop/clear warning:", err);
      } finally {
        scannerRef.current = null;
        isStoppingRef.current = false;
      }
    }
  }, []);

  // Successful QR Detection Handler
  const handleScanSuccess = React.useCallback(
    async (decodedText: string) => {
      const result = parseAndValidatePaymentInput(decodedText);
      if (result.isValid && result.paymentId) {
        setIsNavigating(true);
        await stopLiveScanner();
        router.push(`/pay/${result.paymentId}`);
      } else {
        setValidationError(
          result.error || "Invalid DineBack QR code. Please scan a verified invoice."
        );
      }
    },
    [router, stopLiveScanner]
  );

  // Start Live Camera Function
  const startLiveCamera = React.useCallback(async () => {
    setValidationError(null);
    setStatusMessage(null);

    // 1. Check for secure context
    const isSecure =
      typeof window !== "undefined" &&
      (window.isSecureContext ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    if (!isSecure) {
      setCameraStatus("unavailable");
      setStatusMessage(
        "Mobile browsers require HTTPS or localhost for live camera streams. For local IP testing, use 'Snap / Photo' or enter the invoice code."
      );
      return;
    }

    // 2. Check if mediaDevices API is available
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraStatus("unavailable");
      setStatusMessage(
        "Camera API is not supported on this browser. Please use 'Snap / Photo' instead."
      );
      return;
    }

    setCameraStatus("requesting");

    try {
      await stopLiveScanner();

      const html5QrCode = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.75);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      };

      // Prefer rear camera (environment)
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignore frame decode misses
        }
      );

      setCameraStatus("scanning");
    } catch (err: unknown) {
      console.warn("Camera start failed, testing camera list fallback:", err);

      // Attempt fallback by selecting back camera ID directly
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0 && scannerRef.current) {
          const backCamera =
            devices.find((d) => d.label.toLowerCase().includes("back")) ||
            devices[devices.length - 1];

          await scannerRef.current.start(
            backCamera.id,
            {
              fps: 15,
              qrbox: { width: 220, height: 220 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {}
          );
          setCameraStatus("scanning");
          return;
        }
      } catch {
        // Fall through to error state classification
      }

      // Classify error for understandable user guidance
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : "";
      const errorName = err instanceof Error ? err.name : "";

      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError" ||
        errorMessage.includes("denied") ||
        errorMessage.includes("permission")
      ) {
        setCameraStatus("denied");
        setStatusMessage(
          "Camera permission was denied. Tap the lock/settings icon in your browser address bar to enable camera, or use Photo mode below."
        );
      } else if (
        errorName === "NotFoundError" ||
        errorName === "DevicesNotFoundError" ||
        errorMessage.includes("not found")
      ) {
        setCameraStatus("unavailable");
        setStatusMessage("No camera hardware detected. Please use 'Snap / Photo' mode.");
      } else if (
        errorName === "NotReadableError" ||
        errorName === "TrackStartError" ||
        errorMessage.includes("in use")
      ) {
        setCameraStatus("unavailable");
        setStatusMessage(
          "Camera is currently in use by another application. Please close other camera apps and retry."
        );
      } else {
        setCameraStatus("unavailable");
        setStatusMessage(
          "Could not initialize live camera stream. Use 'Snap / Photo' to capture the QR code instantly."
        );
      }
    }
  }, [handleScanSuccess, stopLiveScanner]);

  // Clean up scanner when switching mode or unmounting
  React.useEffect(() => {
    if (mode !== "camera") {
      stopLiveScanner();
      setCameraStatus("idle");
    }
    return () => {
      stopLiveScanner();
    };
  }, [mode, stopLiveScanner]);

  // Handle Photo / File Upload Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setIsProcessingFile(true);

    try {
      // 1. Pure multi-scale canvas decode
      const decodedText = await decodeQRFromFile(file);
      if (decodedText) {
        handleScanSuccess(decodedText);
        return;
      }

      // 2. Fallback to html5-qrcode scanFile
      const html5QrCode = new Html5Qrcode("dineback-qr-fallback-box");
      const fallbackText = await html5QrCode.scanFile(file, false);
      html5QrCode.clear();

      if (fallbackText) {
        handleScanSuccess(fallbackText);
        return;
      }

      throw new Error("No QR code detected");
    } catch {
      setValidationError(
        "Could not detect a clear QR code in this image. Please ensure the QR code is centered and well-lit, or select the invoice below."
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
        result.error || "Please enter a valid invoice ID (e.g. db_8f72k9a1b2c3) or payment URL."
      );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Hidden fallback container */}
      <div id="dineback-qr-fallback-box" style={{ width: 1, height: 1, overflow: "hidden", opacity: 0 }} />

      {/* Hidden native camera & gallery inputs */}
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

      {/* Mode Selector Tabs */}
      <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setMode("camera");
            setValidationError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
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
          onClick={() => {
            setMode("photo");
            setValidationError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
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
          onClick={() => {
            setMode("manual");
            setValidationError(null);
          }}
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

      {/* Validation / Error Messages */}
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
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-300 flex items-center justify-center gap-2 shadow-lg">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span className="font-semibold">Valid invoice detected! Opening bill checkout...</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: LIVE CAMERA VIEWPORT & STATE HANDLING */}
      {/* ========================================================================= */}
      {mode === "camera" && !isNavigating && (
        <Card className="border-slate-800 bg-slate-900/95 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-4 text-center border-b border-slate-800/80">
            <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Scan QR Code
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Point your camera at the bill QR on the restaurant screen
            </p>
          </div>

          {/* Viewport Frame with Aspect-Ratio Lock to prevent layout jumping */}
          <div className="relative bg-slate-950 aspect-square w-full max-h-[320px] flex items-center justify-center overflow-hidden">
            {/* Viewfinder Target Guide Corners */}
            <div className="absolute inset-8 pointer-events-none z-10 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-7 h-7 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                <div className="w-7 h-7 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
              </div>
              <div className="flex justify-between">
                <div className="w-7 h-7 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                <div className="w-7 h-7 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
              </div>
            </div>

            {/* Sub-State: Scanning (Live Stream Active) */}
            <div
              id={elementId}
              className={`w-full h-full overflow-hidden ${
                cameraStatus === "scanning" ? "block" : "hidden"
              }`}
            />

            {/* Sub-State: Idle (Initial State before camera is opened) */}
            {cameraStatus === "idle" && (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Live Camera Scanner</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                    Tap below to open your camera and scan the bill QR code.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={startLiveCamera}
                  className="py-3 px-6 text-xs font-bold gap-2 shadow-lg shadow-emerald-500/20 rounded-2xl"
                >
                  <Camera className="w-4 h-4" />
                  Open Camera
                </Button>
              </div>
            )}

            {/* Sub-State: Requesting Camera Access */}
            {cameraStatus === "requesting" && (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">Requesting camera access...</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Please allow camera permission in your browser prompt.
                  </p>
                </div>
              </div>
            )}

            {/* Sub-State: Camera Permission Denied */}
            {cameraStatus === "denied" && (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Camera Access Denied</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                    To enable camera access, tap the lock/settings icon in your browser address bar and allow Camera permission.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-[240px] pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full text-xs font-bold gap-1.5 rounded-xl"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Use Photo Instead
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={startLiveCamera}
                    className="w-full text-xs font-semibold gap-1.5 border-slate-700 rounded-xl"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Sub-State: Camera Unavailable / Insecure Context */}
            {cameraStatus === "unavailable" && (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Camera Stream Unavailable</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                    {statusMessage ||
                      "Live camera streams require HTTPS on mobile browsers. Use Photo mode below to snap and scan instantly."}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-xs font-bold gap-1.5 shadow-lg shadow-emerald-500/20 rounded-xl"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take Photo of QR
                </Button>
              </div>
            )}
          </div>

          {/* Camera Footer Options */}
          <div className="p-3.5 bg-slate-950/80 flex items-center justify-between border-t border-slate-800/80 text-xs">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 text-[11px] font-semibold transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Snap Photo Fallback</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 text-[11px] font-semibold transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>From Gallery</span>
            </button>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SNAP / PHOTO UPLOAD FALLBACK */}
      {/* ========================================================================= */}
      {mode === "photo" && !isNavigating && (
        <Card className="border-slate-800 bg-slate-900/95 shadow-2xl rounded-3xl backdrop-blur-md">
          <CardContent className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
              <QrCode className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Photo QR Scanner
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Take a quick photo of the restaurant bill QR code or select a saved image.
              </p>
            </div>

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
                Upload from Gallery
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: MANUAL INVOICE CODE ENTRY */}
      {/* ========================================================================= */}
      {mode === "manual" && (
        <Card className="border-slate-800 bg-slate-900/95 shadow-2xl rounded-3xl">
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
                <p>• Full URL: <code className="text-emerald-400 font-mono">/pay/db_8f72k9a1b2c3</code></p>
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

      {/* Consumer Native Phone Camera Tip */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-emerald-300">
            Native Phone Camera Tip
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            You can also open your phone’s regular <strong className="text-slate-200">Camera App</strong> or <strong className="text-slate-200">MetaMask Browser</strong> and point it directly at the restaurant QR code to jump straight to checkout!
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
