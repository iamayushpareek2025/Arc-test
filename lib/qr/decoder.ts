import jsQR from "jsqr";

/**
 * Universal ultra-resilient QR decoder.
 * Uses a 4-tier detection pipeline:
 * 1. Native Hardware BarcodeDetector API (Android Chrome & modern Safari)
 * 2. Multi-scale full image canvas pass with inversion
 * 3. 4-way rotation passes (0°, 90°, 180°, 270°) for EXIF camera photos
 * 4. Center-crop zoom pass (focusing on the middle 60% of the photo)
 */
export async function decodeQRFromFile(file: File | Blob): Promise<string | null> {
  // 1. First attempt: Native BarcodeDetector if available in browser
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({
        formats: ["qr_code"],
      });
      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch {
      // Fall through to canvas decoder
    }
  }

  // 2. Canvas-based multi-pass decoding
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          // Pass A: Full image at multiple scale tiers (1000px, 800px, 600px, 400px)
          const targetSizes = [1000, 800, 600, 450];
          for (const maxDim of targetSizes) {
            const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.floor(img.width * ratio);
            const h = Math.floor(img.height * ratio);

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) continue;

            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);

            const code = jsQR(imageData.data, w, h, {
              inversionAttempts: "attemptBoth",
            });
            if (code && code.data && code.data.trim().length > 0) {
              resolve(code.data.trim());
              return;
            }
          }

          // Pass B: Center Crop 60% (user aims at QR in center of photo)
          const cropW = Math.floor(img.width * 0.65);
          const cropH = Math.floor(img.height * 0.65);
          const cropX = Math.floor((img.width - cropW) / 2);
          const cropY = Math.floor((img.height - cropH) / 2);

          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = 600;
          cropCanvas.height = 600;
          const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
          if (cropCtx) {
            cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 600, 600);
            const cropData = cropCtx.getImageData(0, 0, 600, 600);
            const cropCode = jsQR(cropData.data, 600, 600, {
              inversionAttempts: "attemptBoth",
            });
            if (cropCode && cropCode.data && cropCode.data.trim().length > 0) {
              resolve(cropCode.data.trim());
              return;
            }
          }

          // Pass C: Rotations (90°, 180°, 270°) for sideways mobile photos
          const angles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
          for (const angle of angles) {
            const rotCanvas = document.createElement("canvas");
            const maxDim = 800;
            const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.floor(img.width * ratio);
            const h = Math.floor(img.height * ratio);

            rotCanvas.width = angle === Math.PI ? w : h;
            rotCanvas.height = angle === Math.PI ? h : w;

            const rotCtx = rotCanvas.getContext("2d", { willReadFrequently: true });
            if (!rotCtx) continue;

            rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
            rotCtx.rotate(angle);
            rotCtx.drawImage(img, -w / 2, -h / 2, w, h);

            const rotData = rotCtx.getImageData(0, 0, rotCanvas.width, rotCanvas.height);
            const rotCode = jsQR(rotData.data, rotCanvas.width, rotCanvas.height, {
              inversionAttempts: "attemptBoth",
            });
            if (rotCode && rotCode.data && rotCode.data.trim().length > 0) {
              resolve(rotCode.data.trim());
              return;
            }
          }

          resolve(null);
        } catch (err) {
          console.warn("QR decode pipeline error:", err);
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = src;
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
