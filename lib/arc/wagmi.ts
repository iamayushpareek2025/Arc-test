import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected } from "@wagmi/core";
import { arcTestnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  connectors: [
    injected(),
  ],
  transports: {
    [arcTestnet.id]: http(),
  },
});
