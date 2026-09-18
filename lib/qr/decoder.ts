import jsQR from "jsqr";

/**
 * Robust multi-scale client-side QR decoder.
 * Handles high-resolution mobile photos, rotation, scaling, and canvas extraction.
 */
export async function decodeQRFromFile(file: File | Blob): Promise<string | null> {
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
        // Try multiple scale passes to reliably detect small or huge phone photo QRs
        const scales = [1.0, 0.75, 0.5, 0.35, 1.5];
        const maxDimension = 1200;

        for (const scale of scales) {
          try {
            let width = img.width * scale;
            let height = img.height * scale;

            if (width > maxDimension || height > maxDimension) {
              const ratio = Math.min(maxDimension / width, maxDimension / height);
              width = Math.floor(width * ratio);
              height = Math.floor(height * ratio);
            } else {
              width = Math.floor(width);
              height = Math.floor(height);
            }

            if (width <= 50 || height <= 50) continue;

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) continue;

            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);

            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "attemptBoth",
            });

            if (code && code.data && code.data.trim().length > 0) {
              resolve(code.data.trim());
              return;
            }
          } catch (err) {
            console.warn("Scale pass error:", err);
          }
        }

        resolve(null);
      };

      img.onerror = () => resolve(null);
      img.src = src;
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
