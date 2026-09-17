import { defineChain } from "viem";

export const ARC_TESTNET_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_ARC_CHAIN_ID || 5042002
);

export const ARC_TESTNET_RPC =
  process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.io";

export const ARC_TESTNET_EXPLORER =
  process.env.NEXT_PUBLIC_ARCSCAN_URL || "https://testnet.arcscan.app";

export const ARC_USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x3600000000000000000000000000000000000000") as `0x${string}`;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18, // Verified dynamically in hooks; fallback config
  },
  rpcUrls: {
    default: {
      http: [ARC_TESTNET_RPC],
    },
    public: {
      http: [ARC_TESTNET_RPC],
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
