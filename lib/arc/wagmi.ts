import { http, createConfig, createStorage, injected } from "wagmi";
import { arcTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  ssr: false,
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
  connectors: [
    injected(),
  ],
  transports: {
    [arcTestnet.id]: http("https://rpc.testnet.arc.io", {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
});

