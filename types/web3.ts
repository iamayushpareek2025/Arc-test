export interface ArcNetworkConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: { http: readonly string[] };
    public: { http: readonly string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  testnet: boolean;
}

export type TransactionStep =
  | 'IDLE'
  | 'CHECKING_ALLOWANCE'
  | 'APPROVING_TOKEN'
  | 'WAITING_PAYMENT'
  | 'CONFIRMING'
  | 'VERIFYING_EVENT'
  | 'COMPLETED'
  | 'FAILED';
