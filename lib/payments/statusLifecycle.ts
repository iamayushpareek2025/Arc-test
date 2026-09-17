import { PaymentStatus } from "@/types/payment";

export const ALLOWED_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: ["PENDING", "PAID", "CANCELLED", "EXPIRED"],
  PENDING: ["PAID", "FAILED", "CANCELLED", "EXPIRED"],
  PAID: ["REWARD_PENDING", "COMPLETED"],
  REWARD_PENDING: ["COMPLETED"],
  COMPLETED: [],
  EXPIRED: [],
  FAILED: [],
  CANCELLED: [],
};

export const TERMINAL_STATUSES: PaymentStatus[] = [
  "COMPLETED",
  "EXPIRED",
  "FAILED",
  "CANCELLED",
];

/**
 * Checks if a status transition is permitted by the state machine
 */
export function canTransition(
  current: PaymentStatus,
  target: PaymentStatus
): boolean {
  if (current === target) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

/**
 * Validates transition or throws an explicit domain error
 */
export function validateTransition(
  current: PaymentStatus,
  target: PaymentStatus
): void {
  if (!canTransition(current, target)) {
    throw new Error(
      `Invalid payment status transition from "${current}" to "${target}".`
    );
  }
}

export function isTerminalStatus(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export interface StatusMeta {
  label: string;
  description: string;
  badgeVariant: "default" | "success" | "warning" | "danger" | "secondary" | "outline";
  isPayable: boolean;
}

export function getStatusMeta(status: PaymentStatus): StatusMeta {
  switch (status) {
    case "CREATED":
      return {
        label: "Created",
        description: "Invoice ready for customer scan",
        badgeVariant: "default",
        isPayable: true,
      };
    case "PENDING":
      return {
        label: "Pending Payment",
        description: "Customer viewing invoice on Arc Testnet",
        badgeVariant: "warning",
        isPayable: true,
      };
    case "PAID":
      return {
        label: "Payment Settled",
        description: "USDC bill payment verified on Arc blockchain",
        badgeVariant: "success",
        isPayable: false,
      };
    case "REWARD_PENDING":
      return {
        label: "Processing Reward",
        description: "Disbursing on-chain cashback from RewardPool",
        badgeVariant: "success",
        isPayable: false,
      };
    case "COMPLETED":
      return {
        label: "Completed",
        description: "Payment settled and cashback rewarded",
        badgeVariant: "success",
        isPayable: false,
      };
    case "EXPIRED":
      return {
        label: "Expired",
        description: "Invoice validity time has elapsed",
        badgeVariant: "danger",
        isPayable: false,
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        description: "Invoice was cancelled by merchant",
        badgeVariant: "secondary",
        isPayable: false,
      };
    case "FAILED":
      return {
        label: "Failed",
        description: "Payment failed or was reverted on-chain",
        badgeVariant: "danger",
        isPayable: false,
      };
    default:
      return {
        label: status,
        description: "",
        badgeVariant: "secondary",
        isPayable: false,
      };
  }
}
