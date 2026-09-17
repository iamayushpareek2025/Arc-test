import { z } from "zod";
import { ethereumAddressRegex } from "./restaurant";

export const paymentStatusEnum = z.enum([
  "CREATED",
  "PENDING",
  "PAID",
  "REWARD_PENDING",
  "COMPLETED",
  "EXPIRED",
  "FAILED",
  "CANCELLED",
]);

export const createPaymentRequestInputSchema = z.object({
  restaurantId: z.string().min(2, "Restaurant ID is required"),
  invoiceId: z.string().min(2, "Invoice ID is required"),
  tableNumber: z.string().optional(),
  billAmount: z.number().positive("Bill amount must be greater than 0"),
  campaignId: z.string().optional(),
  notes: z.string().max(200, "Notes cannot exceed 200 characters").optional(),
  durationMinutes: z.number().int().min(1).max(120).default(15),
});

export const paymentRequestSchema = z.object({
  id: z.string().min(5, "Payment request ID is required"),
  restaurantId: z.string().min(2, "Restaurant ID is required"),
  restaurantName: z.string().min(2, "Restaurant name is required"),
  restaurantWallet: z
    .string()
    .regex(ethereumAddressRegex, "Invalid restaurant wallet address"),
  invoiceId: z.string().min(2, "Invoice ID is required"),
  tableNumber: z.string().optional(),
  billAmount: z.number().positive("Bill amount must be greater than 0"),
  currency: z.literal("USDC"),
  tokenAddress: z
    .string()
    .regex(ethereumAddressRegex, "Invalid token address"),
  cashbackBps: z.number().int().min(0).max(10000),
  expectedCashback: z.number().nonnegative(),
  maxCashback: z.number().nonnegative(),
  campaignId: z.string().optional(),
  campaignTitle: z.string().optional(),
  status: paymentStatusEnum.default("CREATED"),
  paymentUrl: z.string().url("Invalid payment URL"),
  notes: z.string().optional(),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).nullable().optional(),
  blockNumber: z.number().int().positive().nullable().optional(),
  payerAddress: z.string().regex(ethereumAddressRegex).nullable().optional(),
  chainId: z.number().int().positive().nullable().optional(),
  confirmedAt: z.number().int().positive().nullable().optional(),
});

export type CreatePaymentRequestInput = z.infer<
  typeof createPaymentRequestInputSchema
>;
export type PaymentRequestDoc = z.infer<typeof paymentRequestSchema>;
