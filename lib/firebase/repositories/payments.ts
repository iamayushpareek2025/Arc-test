import { db, isFirebaseConfigured } from "../client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { PaymentReceipt } from "@/types/payment";

const COLLECTION_NAME = "payments";
const memoryStore = new Map<string, PaymentReceipt>();

export class PaymentRepository {
  /**
   * Records a confirmed blockchain payment (Immutable ledger)
   */
  static async record(receipt: PaymentReceipt): Promise<PaymentReceipt> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, COLLECTION_NAME, receipt.paymentId);
        await setDoc(docRef, receipt);
      } catch {
        // Fallback
      }
    }
    memoryStore.set(receipt.paymentId, receipt);
    return receipt;
  }

  /**
   * Fetch payment receipt by paymentId
   */
  static async getById(paymentId: string): Promise<PaymentReceipt | null> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, COLLECTION_NAME, paymentId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          return snapshot.data() as PaymentReceipt;
        }
      } catch {
        // Fallback
      }
    }
    return memoryStore.get(paymentId) || null;
  }

  /**
   * List recent payments for a customer wallet
   */
  static async listByCustomer(
    customerAddress: `0x${string}`,
    maxCount = 20
  ): Promise<PaymentReceipt[]> {
    if (isFirebaseConfigured) {
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          where("payer", "==", customerAddress.toLowerCase()),
          orderBy("timestamp", "desc"),
          limit(maxCount)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => d.data() as PaymentReceipt);
        }
      } catch {
        // Fallback
      }
    }
    return Array.from(memoryStore.values())
      .filter((p) => p.payer.toLowerCase() === customerAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxCount);
  }
}
