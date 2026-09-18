import { http, createConfig, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  ssr: true,
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [arcTestnet.id]: http("https://rpc.testnet.arc.io", {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
});

