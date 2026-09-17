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
import { Restaurant } from "@/types/restaurant";
import { restaurantSchema } from "@/lib/validation/restaurant";

const COLLECTION_NAME = "restaurants";

export const SEED_RESTAURANTS: Restaurant[] = [
  {
    id: "rest_arc_bistro",
    name: "The Arc Bistro",
    slug: "arc-bistro",
    cuisine: "Modern Italian & Wine Bar",
    address: "101 Blockchain Boulevard",
    city: "San Francisco, CA",
    walletAddress: "0xc240d961DeD8af13069fB0F109155C965301d6Ea",
    logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
    status: "ACTIVE",
    activeCampaignId: "cmp_bistro_weekend",
    totalRevenue: 3420.5,
    totalPaymentsCount: 42,
    cashbackDistributed: 210.8,
    rating: 4.9,
    isVerified: true,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: "rest_nakamoto_ramen",
    name: "Nakamoto Ramen Bar",
    slug: "nakamoto-ramen",
    cuisine: "Authentic Hakata Tonkotsu",
    address: "21 Satoshi Way",
    city: "New York, NY",
    walletAddress: "0x1111111111111111111111111111111111111111",
    logoUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&auto=format&fit=crop&q=80",
    status: "ACTIVE",
    activeCampaignId: "cmp_ramen_lunch",
    totalRevenue: 1850.0,
    totalPaymentsCount: 28,
    cashbackDistributed: 148.0,
    rating: 4.8,
    isVerified: true,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: "rest_verde_cafe",
    name: "Verde Artisan Coffee & Bakery",
    slug: "verde-artisan-coffee",
    cuisine: "Specialty Coffee & Pastries",
    address: "404 Main Street",
    city: "Austin, TX",
    walletAddress: "0x2222222222222222222222222222222222222222",
    logoUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150&auto=format&fit=crop&q=80",
    coverImageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop&q=80",
    status: "ACTIVE",
    activeCampaignId: "cmp_verde_morning",
    totalRevenue: 980.25,
    totalPaymentsCount: 65,
    cashbackDistributed: 49.0,
    rating: 4.7,
    isVerified: true,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

const memoryStore = new Map<string, Restaurant>(
  SEED_RESTAURANTS.map((r) => [r.id, r])
);

export class RestaurantRepository {
  static async getById(id: string): Promise<Restaurant | null> {
    if (isFirebaseConfigured) {
      try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          return snapshot.data() as Restaurant;
        }
      } catch {
        // Fallback
      }
    }
    return memoryStore.get(id) || null;
  }

  static async getBySlug(slug: string): Promise<Restaurant | null> {
    if (isFirebaseConfigured) {
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          where("slug", "==", slug)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return snapshot.docs[0].data() as Restaurant;
        }
      } catch {
        // Fallback
      }
    }
    for (const r of memoryStore.values()) {
      if (r.slug === slug) return r;
    }
    return null;
  }

  static async listActive(): Promise<Restaurant[]> {
    if (isFirebaseConfigured) {
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          where("status", "==", "ACTIVE")
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => d.data() as Restaurant);
        }
      } catch {
        // Fallback
      }
    }
    return Array.from(memoryStore.values()).filter((r) => r.status === "ACTIVE");
  }

  static async upsert(data: Restaurant): Promise<Restaurant> {
    const validated = restaurantSchema.parse(data);
    const docData: Restaurant = {
      ...validated,
      walletAddress: validated.walletAddress as `0x${string}`,
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
