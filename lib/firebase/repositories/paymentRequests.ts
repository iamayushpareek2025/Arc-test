import { db, isFirebaseConfigured } from "../client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import crypto from "crypto";
import { PaymentRequest, PaymentStatus } from "@/types/payment";
import {
  CreatePaymentRequestInput,
  createPaymentRequestInputSchema,
  paymentRequestSchema,
} from "@/lib/validation/paymentRequest";
import { RestaurantRepository } from "./restaurants";
import { CampaignRepository } from "./campaigns";
import { validateTransition } from "@/lib/payments/statusLifecycle";
import { ARC_USDC_ADDRESS } from "@/lib/arc/chain";

const COLLECTION_NAME = "paymentRequests";
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Global fallback store across server & memory
declare global {
  // eslint-disable-next-line no-var
  var __DINEBACK_DEV_INVOICES__: Map<string, PaymentRequest> | undefined;
}

const memoryStore =
  globalThis.__DINEBACK_DEV_INVOICES__ ||
  (globalThis.__DINEBACK_DEV_INVOICES__ = new Map<string, PaymentRequest>());

const LOCAL_STORAGE_KEY = "dineback_dev_invoices";

function getLocalStorageInvoices(): Map<string, PaymentRequest> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    const map = new Map<string, PaymentRequest>();
    for (const item of parsed) {
      if (item && item.id) map.set(item.id, item);
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveLocalStorageInvoice(invoice: PaymentRequest) {
  if (typeof window === "undefined") return;
  try {
    const map = getLocalStorageInvoices();
    map.set(invoice.id, invoice);
    const arr = Array.from(map.values());
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent("dineback_invoice_update", { detail: invoice }));
  } catch {
    // Ignore localStorage errors
  }
}

export class PaymentRequestRepository {
  static generateId(): string {
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(6);
      window.crypto.getRandomValues(bytes);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `db_${hex}`;
    }
    const randomHex = crypto.randomBytes(6).toString("hex");
    return `db_${randomHex}`;
  }

  static async create(
    input: CreatePaymentRequestInput
  ): Promise<PaymentRequest> {
    const validatedInput = createPaymentRequestInputSchema.parse(input);

    // 1. Verify restaurant
    const restaurant = await RestaurantRepository.getById(
      validatedInput.restaurantId
    );
    if (!restaurant) {
      throw new Error(
        `Restaurant with ID "${validatedInput.restaurantId}" not found.`
      );
    }
    if (restaurant.status !== "ACTIVE") {
      throw new Error(
        `Restaurant "${restaurant.name}" is currently ${restaurant.status}. Cannot issue invoices.`
      );
    }

    // 2. Resolve Cashback & Campaign
    let cashbackBps = 0;
    let maxCashback = 0;
    let expectedCashback = 0;
    let campaignTitle: string | undefined = undefined;

    if (validatedInput.campaignId) {
      const campaign = await CampaignRepository.getById(
        validatedInput.campaignId
      );
      if (campaign && campaign.status === "ACTIVE") {
        const now = Date.now();
        if (now >= campaign.validFrom && now <= campaign.validTo) {
          cashbackBps = campaign.cashbackBps;
          maxCashback = campaign.maxCashback;
          campaignTitle = campaign.title;

          // Integer basis-point math (e.g. 500 BPS = 5%)
          const rawCashback =
            (validatedInput.billAmount * cashbackBps) / 10000;
          expectedCashback =
            maxCashback > 0
              ? Math.min(rawCashback, maxCashback)
              : rawCashback;
        }
      }
    }

    const id = this.generateId();
    const now = Date.now();
    const durationMs = (validatedInput.durationMinutes || 15) * 60 * 1000;
    const expiresAt = now + durationMs;
    const paymentUrl = `${APP_BASE_URL}/pay/${id}`;

    const newRequest: PaymentRequest = {
      id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantWallet: restaurant.walletAddress,
      invoiceId: validatedInput.invoiceId,
      tableNumber: validatedInput.tableNumber || undefined,
      billAmount: validatedInput.billAmount,
      currency: "USDC",
      tokenAddress: ARC_USDC_ADDRESS,
      cashbackBps,
      expectedCashback,
      maxCashback,
      campaignId: validatedInput.campaignId || undefined,
      campaignTitle,
      status: "CREATED",
      paymentUrl,
      notes: validatedInput.notes || undefined,
      createdAt: now,
      expiresAt,
      updatedAt: now,
      txHash: null,
      blockNumber: null,
      payerAddress: null,
      chainId: null,
      confirmedAt: null,
    };

    paymentRequestSchema.parse(newRequest);

    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await setDoc(docRef, newRequest);
      } catch {
        // Fallback
      }
    }

    memoryStore.set(id, newRequest);
    saveLocalStorageInvoice(newRequest);

    // Sync to internal dev server API in background
    if (typeof window !== "undefined") {
      fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRequest),
      }).catch(() => {});
    }

    return newRequest;
  }

  static async getById(id: string): Promise<PaymentRequest | null> {
    let request: PaymentRequest | null = null;

    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          request = snapshot.data() as PaymentRequest;
        }
      } catch {
        // Fallback
      }
    }

    if (!request) {
      request = memoryStore.get(id) || null;
    }

    if (!request && typeof window !== "undefined") {
      const localMap = getLocalStorageInvoices();
      request = localMap.get(id) || null;
      if (request) {
        memoryStore.set(id, request);
      }
    }

    // Try fetching from server dev endpoint if still not found in browser
    if (!request && typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.invoice) {
            request = data.invoice as PaymentRequest;
            memoryStore.set(id, request);
            saveLocalStorageInvoice(request);
          }
        }
      } catch {
        // Fallback
      }
    }

    if (!request) return null;

    // Automatic expiration check
    if (
      (request.status === "CREATED" || request.status === "PENDING") &&
      Date.now() > request.expiresAt
    ) {
      return await this.updateStatus(id, "EXPIRED");
    }

    return request;
  }

  static async updateStatus(
    id: string,
    targetStatus: PaymentStatus,
    metadata?: Partial<PaymentRequest>
  ): Promise<PaymentRequest> {
    const current = await this.getById(id);
    if (!current) {
      throw new Error(`Payment request "${id}" not found.`);
    }

    validateTransition(current.status, targetStatus);

    const updated: PaymentRequest = {
      ...current,
      ...metadata,
      status: targetStatus,
      updatedAt: Date.now(),
    };

    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
          status: targetStatus,
          updatedAt: updated.updatedAt,
          ...(metadata || {}),
        });
      } catch {
        // Keep memory in sync
      }
    }

    memoryStore.set(id, updated);
    saveLocalStorageInvoice(updated);

    if (typeof window !== "undefined") {
      fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(() => {});
    }

    return updated;
  }

  static async cancel(id: string): Promise<PaymentRequest> {
    return await this.updateStatus(id, "CANCELLED");
  }

  static async listByRestaurant(
    restaurantId: string,
    maxCount = 50
  ): Promise<PaymentRequest[]> {
    if (isFirebaseConfigured) {
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          where("restaurantId", "==", restaurantId),
          orderBy("createdAt", "desc"),
          limit(maxCount)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => d.data() as PaymentRequest);
        }
      } catch {
        // Fallback
      }
    }

    const localMap = getLocalStorageInvoices();
    for (const [k, v] of localMap.entries()) {
      memoryStore.set(k, v);
    }

    return Array.from(memoryStore.values())
      .filter((r) => r.restaurantId === restaurantId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxCount);
  }
}
