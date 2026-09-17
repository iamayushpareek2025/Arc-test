import { z } from "zod";

export const campaignSchema = z
  .object({
    id: z.string().min(2, "Campaign ID is required"),
    restaurantId: z.string().min(2, "Restaurant ID is required"),
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(5, "Description must be at least 5 characters"),
    cashbackBps: z
      .number()
      .int()
      .min(1, "Cashback must be at least 1 BPS (0.01%)")
      .max(10000, "Cashback cannot exceed 10000 BPS (100%)"),
    minSpend: z.number().nonnegative("Minimum spend must be 0 or greater"),
    maxCashback: z.number().nonnegative("Maximum cashback must be 0 or greater"),
    budget: z.number().positive("Campaign budget must be greater than 0"),
    spent: z.number().nonnegative().default(0),
    remainingBudget: z.number().nonnegative().optional(),
    status: z
      .enum(["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "COMPLETED"])
      .default("ACTIVE"),
    validFrom: z.number().int().positive(),
    validTo: z.number().int().positive(),
  })
  .refine((data) => data.validTo > data.validFrom, {
    message: "Campaign end time (validTo) must be after start time (validFrom)",
    path: ["validTo"],
  });

export type CampaignInput = z.infer<typeof campaignSchema>;
