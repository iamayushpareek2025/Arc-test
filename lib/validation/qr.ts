export const PAYMENT_ID_REGEX = /^db_[a-f0-9]{12}$/i;

export interface QRParseResult {
  isValid: boolean;
  paymentId?: string;
  error?: string;
}

/**
 * Validates and extracts a DineBack payment ID from a scanned QR or pasted URL/code.
 * Strictly rejects javascript:, malicious schemes, unknown routes, and malformed IDs.
 */
export function parseAndValidatePaymentInput(rawInput: string): QRParseResult {
  if (!rawInput || typeof rawInput !== "string") {
    return { isValid: false, error: "Input is empty or invalid." };
  }

  const trimmed = rawInput.trim();

  // 1. Security check: Reject malicious schemes immediately
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("vbscript:")
  ) {
    return { isValid: false, error: "Malicious or unsupported URL scheme." };
  }

  // 2. Direct payment ID format (e.g. "db_8f72k9a1b2c3")
  if (PAYMENT_ID_REGEX.test(trimmed)) {
    return { isValid: true, paymentId: trimmed.toLowerCase() };
  }

  // 3. Relative path format (e.g. "/pay/db_8f72k9a1b2c3")
  if (trimmed.startsWith("/pay/")) {
    const candidateId = trimmed.replace("/pay/", "").split("?")[0].split("#")[0].trim();
    if (PAYMENT_ID_REGEX.test(candidateId)) {
      return { isValid: true, paymentId: candidateId.toLowerCase() };
    }
  }

  // 4. Full URL format (e.g. "https://dineback.app/pay/db_8f72k9a1b2c3" or "http://localhost:3000/pay/...")
  try {
    const parsedUrl = new URL(trimmed);
    
    // Only accept http / https protocols
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return { isValid: false, error: "Only HTTP/HTTPS URLs are supported." };
    }

    const pathname = parsedUrl.pathname;
    const match = pathname.match(/^\/pay\/([a-zA-Z0-9_-]+)$/);
    if (match && match[1]) {
      const candidateId = match[1];
      if (PAYMENT_ID_REGEX.test(candidateId)) {
        return { isValid: true, paymentId: candidateId.toLowerCase() };
      }
      return { isValid: false, error: `Invalid payment request ID format: "${candidateId}".` };
    }

    return {
      isValid: false,
      error: "URL is not a valid DineBack payment invoice link (expected /pay/<id>).",
    };
  } catch {
    // Not a valid URL and not a valid ID
    return {
      isValid: false,
      error: "Invalid QR code or payment code format.",
    };
  }
}
