"use client";

import * as React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { PaymentRequest } from "@/types/payment";
import { PaymentRequestRepository } from "@/lib/firebase/repositories/paymentRequests";

export interface UsePaymentRequestResult {
  paymentRequest: PaymentRequest | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  isLiveFirestore: boolean;
  refetch: () => Promise<void>;
}

/**
 * Real-time Payment Request subscription hook
 * Listens to live Firestore updates or local/server shared dev state across tabs
 */
export function usePaymentRequest(
  paymentId?: string,
  autoSetPending = false
): UsePaymentRequestResult {
  const [paymentRequest, setPaymentRequest] =
    React.useState<PaymentRequest | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchManual = React.useCallback(async () => {
    if (!paymentId) return;
    try {
      let req = await PaymentRequestRepository.getById(paymentId);
      if (req && autoSetPending && req.status === "CREATED") {
        req = await PaymentRequestRepository.updateStatus(paymentId, "PENDING");
      }
      setPaymentRequest(req);
      if (!req) {
        setError(`Invoice "${paymentId}" not found.`);
      } else {
        setError(null);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load payment request";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [paymentId, autoSetPending]);

  React.useEffect(() => {
    if (!paymentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // If Firebase is configured, use real-time Firestore onSnapshot
    if (isFirebaseConfigured) {
      const docRef = doc(db, "paymentRequests", paymentId);
      const unsubscribe = onSnapshot(
        docRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as PaymentRequest;
            if (autoSetPending && data.status === "CREATED") {
              try {
                const updated = await PaymentRequestRepository.updateStatus(
                  paymentId,
                  "PENDING"
                );
                setPaymentRequest(updated);
              } catch {
                setPaymentRequest(data);
              }
            } else {
              setPaymentRequest(data);
            }
            setError(null);
          } else {
            // Document does not exist in Firestore; try fallback
            fetchManual();
          }
          setIsLoading(false);
        },
        (err) => {
          console.warn("Firestore snapshot error, falling back to repository:", err);
          fetchManual();
        }
      );

      return () => unsubscribe();
    } else {
      // Local fallback: fetch initial, poll every 2s, and listen to cross-tab storage events
      fetchManual();

      const handleCustomUpdate = (e: Event) => {
        const detail = (e as CustomEvent<PaymentRequest>).detail;
        if (detail && detail.id === paymentId) {
          setPaymentRequest(detail);
          setError(null);
          setIsLoading(false);
        } else {
          fetchManual();
        }
      };

      const handleStorageUpdate = (e: StorageEvent) => {
        if (e.key === "dineback_dev_invoices" || !e.key) {
          fetchManual();
        }
      };

      window.addEventListener("dineback_invoice_update", handleCustomUpdate);
      window.addEventListener("storage", handleStorageUpdate);
      const interval = setInterval(fetchManual, 2000);

      return () => {
        window.removeEventListener("dineback_invoice_update", handleCustomUpdate);
        window.removeEventListener("storage", handleStorageUpdate);
        clearInterval(interval);
      };
    }
  }, [paymentId, autoSetPending, fetchManual]);

  return {
    paymentRequest,
    isLoading,
    isError: Boolean(error),
    error,
    isLiveFirestore: isFirebaseConfigured,
    refetch: fetchManual,
  };
}
