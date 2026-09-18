import { http, createConfig, createStorage, noopStorage, injected } from "wagmi";
import { arcTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  ssr: true,
  storage: createStorage({
    storage: typeof window !== "undefined" && window.localStorage ? window.localStorage : noopStorage,
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

