import { db, isFirebaseConfigured } from "../client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { CashbackCampaign } from "@/types/campaign";
import { campaignSchema } from "@/lib/validation/campaign";

const COLLECTION_NAME = "campaigns";

export const SEED_CAMPAIGNS: CashbackCampaign[] = [
  {
    id: "cmp_bistro_weekend",
    restaurantId: "rest_arc_bistro",
    title: "Weekend 8% On-Chain Cashback",
    description: "Get instant 8% USDC cashback on all bills above 15 USDC during weekend dinner.",
    cashbackBps: 800, // 8.00%
    minSpend: 15.0,
    maxCashback: 50.0,
    budget: 1000.0,
    spent: 210.8,
    remainingBudget: 789.2,
    status: "ACTIVE",
    validFrom: 1700000000000,
    validTo: 2000000000000,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: "cmp_ramen_lunch",
    restaurantId: "rest_nakamoto_ramen",
    title: "Lunch Rush 10% Loyalty Reward",
    description: "Enjoy 10% cashback on your lunch bowl and drinks when paying with USDC on Arc.",
    cashbackBps: 1000, // 10.00%
    minSpend: 12.0,
    maxCashback: 25.0,
    budget: 500.0,
    spent: 148.0,
    remainingBudget: 352.0,
    status: "ACTIVE",
    validFrom: 1700000000000,
    validTo: 2000000000000,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: "cmp_verde_morning",
    restaurantId: "rest_verde_cafe",
    title: "Morning Coffee 5% Booster",
    description: "Start your morning right with 5% instant cashback on all coffee and bakery orders.",
    cashbackBps: 500, // 5.00%
    minSpend: 5.0,
    maxCashback: 10.0,
    budget: 300.0,
    spent: 49.0,
    remainingBudget: 251.0,
    status: "ACTIVE",
    validFrom: 1700000000000,
    validTo: 2000000000000,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

const memoryStore = new Map<string, CashbackCampaign>(
  SEED_CAMPAIGNS.map((c) => [c.id, c])
);

export class CampaignRepository {
  static async getById(id: string): Promise<CashbackCampaign | null> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          return snapshot.data() as CashbackCampaign;
        }
      } catch {
        // Fallback
      }
    }
    return memoryStore.get(id) || null;
  }

  static async listByRestaurant(
    restaurantId: string
  ): Promise<CashbackCampaign[]> {
    if (isFirebaseConfigured) {
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          where("restaurantId", "==", restaurantId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => d.data() as CashbackCampaign);
        }
      } catch {
        // Fallback
      }
    }
    return Array.from(memoryStore.values()).filter(
      (c) => c.restaurantId === restaurantId
    );
  }

  static async listActiveByRestaurant(
    restaurantId: string
  ): Promise<CashbackCampaign[]> {
    const all = await this.listByRestaurant(restaurantId);
    const now = Date.now();
    return all.filter(
      (c) =>
        c.status === "ACTIVE" &&
        now >= c.validFrom &&
        now <= c.validTo &&
        c.remainingBudget > 0
    );
  }

  static async upsert(data: CashbackCampaign): Promise<CashbackCampaign> {
    const validated = campaignSchema.parse(data);
    const docData: CashbackCampaign = {
      ...validated,
      remainingBudget: validated.budget - (validated.spent || 0),
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, COLLECTION_NAME, docData.id);
        await setDoc(docRef, docData, { merge: true });
      } catch {
        // Keep in memory
      }
    }
    memoryStore.set(docData.id, docData);
    return docData;
  }
}
