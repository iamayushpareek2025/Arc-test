import { defineChain } from "viem";

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.io";
export const ARC_TESTNET_EXPLORER = process.env.NEXT_PUBLIC_ARCSCAN_URL || "https://testnet.arcscan.app";
export const ARC_USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000") as `0x${string}`;

/**
 * Official Arc Testnet Chain Definition for Viem & Wagmi
 */
export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6, // Arc native gas & settlement token is USDC (6 decimals)
  },
  rpcUrls: {
    default: {
      http: [ARC_TESTNET_RPC, "https://rpc.testnet.arc.network"],
    },
    public: {
      http: [ARC_TESTNET_RPC, "https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      url: ARC_TESTNET_EXPLORER,
    },
  },
  testnet: true,
});
