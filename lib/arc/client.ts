import { createPublicClient, http } from "viem";
import { arcTestnet } from "./chain";

/**
 * Global Viem Public Client for Arc Testnet RPC interaction
 */
export const arcPublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});
