import { parseUnits, formatUnits, keccak256, toHex, stringToHex, isHex } from "viem";

export const ARC_USDC_DECIMALS = 6;
export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

/**
 * Converts a string ID (e.g. "db_8f72a1b2c3d4" or "cmp_bistro_weekend") to a deterministic bytes32 hash.
 */
export function idToBytes32(id?: string | null): `0x${string}` {
  if (!id || id.trim() === "") {
    return ZERO_BYTES32;
  }
  const cleanId = id.trim();
  // If it's already a 64-char (32-byte) hex string with 0x prefix
  if (isHex(cleanId) && cleanId.length === 66) {
    return cleanId as `0x${string}`;
  }
  return keccak256(stringToHex(cleanId));
}

/**
 * Parses user or invoice amount into raw integer token base units (BigInt) for Arc USDC (6 decimals).
 * Never uses floating-point math for blockchain numbers.
 */
export function parseUSDC(amount: number | string): bigint {
  try {
    if (typeof amount === "number") {
      if (isNaN(amount) || amount < 0) return BigInt(0);
      // Fixed to 6 decimal places to prevent float artifacts
      return parseUnits(amount.toFixed(ARC_USDC_DECIMALS), ARC_USDC_DECIMALS);
    }
    return parseUnits(amount.trim(), ARC_USDC_DECIMALS);
  } catch (err) {
    console.error("Failed to parse USDC amount to base units:", err);
    return BigInt(0);
  }
}

/**
 * Formats raw BigInt base units to human-readable USDC string with 2 decimal display.
 */
export function formatUSDC(rawUnits: bigint | string | number): string {
  try {
    const rawBigInt = typeof rawUnits === "bigint" ? rawUnits : BigInt(rawUnits || 0);
    return formatUnits(rawBigInt, ARC_USDC_DECIMALS);
  } catch (err) {
    console.error("Failed to format USDC base units:", err);
    return "0.00";
  }
}
