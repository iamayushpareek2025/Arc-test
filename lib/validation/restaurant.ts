import { z } from "zod";

export const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const restaurantSchema = z.object({
  id: z.string().min(2, "Restaurant ID must be at least 2 characters"),
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  cuisine: z.string().min(2, "Cuisine is required"),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  walletAddress: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum/Arc wallet address"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).default("ACTIVE"),
  activeCampaignId: z.string().optional(),
  totalRevenue: z.number().nonnegative().default(0),
  totalPaymentsCount: z.number().int().nonnegative().default(0),
  cashbackDistributed: z.number().nonnegative().default(0),
  rating: z.number().min(0).max(5).optional().default(4.9),
  isVerified: z.boolean().default(true),
});

export type RestaurantInput = z.infer<typeof restaurantSchema>;
