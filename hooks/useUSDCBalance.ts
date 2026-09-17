"use client";

import { useAccount, useReadContract, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { ARC_USDC_ADDRESS, ARC_TESTNET_CHAIN_ID } from "@/lib/arc/chain";
import { erc20Abi } from "@/lib/arc/abi/erc20";

export interface USDCBalanceResult {
  rawBalance: bigint;
  decimals: number;
  symbol: string;
  formatted: string;
  displayNumber: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  isCorrectNetwork: boolean;
}

/**
 * Custom hook to dynamically read and format USDC balance on Arc Testnet.
 * Never hardcodes decimals; queries decimals() dynamically from the ERC20 contract.
 */
export function useUSDCBalance(targetAddress?: `0x${string}`): USDCBalanceResult {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const address = targetAddress || connectedAddress;
  const isCorrectNetwork = chainId === ARC_TESTNET_CHAIN_ID;

  // Query decimals dynamically
  const {
    data: decimalsData,
    isLoading: isLoadingDecimals,
    isError: isErrorDecimals,
  } = useReadContract({
    address: ARC_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: ARC_TESTNET_CHAIN_ID,
    query: {
      staleTime: 60_000,
    },
  });

  // Query symbol dynamically
  const { data: symbolData } = useReadContract({
    address: ARC_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: ARC_TESTNET_CHAIN_ID,
    query: {
      staleTime: 60_000,
    },
  });

  // Query balance for account
  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    isError: isErrorBalance,
    refetch,
  } = useReadContract({
    address: ARC_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: {
      enabled: Boolean(address),
      refetchInterval: 10_000, // Refresh every 10s
    },
  });

  const decimals = typeof decimalsData === "number" ? decimalsData : 6;
  const symbol = (typeof symbolData === "string" ? symbolData : "USDC");
  const rawBalance = typeof balanceData === "bigint" ? balanceData : BigInt(0);

  const formatted = address && balanceData !== undefined
    ? formatUnits(rawBalance, decimals)
    : "0.00";

  const displayNumber = parseFloat(formatted) || 0;

  return {
    rawBalance,
    decimals,
    symbol,
    formatted,
    displayNumber,
    isLoading: isLoadingDecimals || isLoadingBalance,
    isError: isErrorDecimals || isErrorBalance,
    refetch,
    isCorrectNetwork,
  };
}
