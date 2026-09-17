import { formatUnits, parseUnits } from "viem";

/**
 * Format raw on-chain token units to human-readable number or string.
 * Strictly uses dynamic decimals provided from contract query.
 */
export function formatTokenUnits(
  rawUnits: bigint | string | number,
  decimals: number
): string {
  try {
    const rawBigInt = typeof rawUnits === "bigint" ? rawUnits : BigInt(rawUnits);
    return formatUnits(rawBigInt, decimals);
  } catch (err) {
    console.error("Failed to format token units:", err);
    return "0.00";
  }
}

/**
 * Parses user input amount (e.g., "12.50") into raw BigInt units using contract decimals.
 */
export function parseTokenUnits(
  amount: string | number,
  decimals: number
): bigint {
  try {
    const normalized = typeof amount === "number" ? amount.toFixed(decimals) : amount;
    return parseUnits(normalized, decimals);
  } catch (err) {
    console.error("Failed to parse token units:", err);
    return BigInt(0);
  }
}
