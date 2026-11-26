import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { fetchUsdBrlRate } from "@/lib/usdBrlRate";

interface UsdBrlRateResult {
  rate: number | null;
  lastUpdatedAt: string | null;
  isLoading: boolean;
  isError: boolean;
  isStale: boolean;
}

export function useUsdBrlRate(enabled = true): UsdBrlRateResult {
  const [fallbackRate, setFallbackRate] = useState<number | null>(null);
  const [fallbackUpdatedAt, setFallbackUpdatedAt] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["usd-brl-rate"],
    queryFn: () => fetchUsdBrlRate(),
    refetchInterval: 30_000,
    enabled,
    retry: 2,
    staleTime: 25_000,
  });

  useEffect(() => {
    if (data) {
      setFallbackRate(data.rate);
      setFallbackUpdatedAt(data.lastUpdatedAt);
    }
  }, [data]);

  const rate = data?.rate ?? fallbackRate;
  const lastUpdatedAt = data?.lastUpdatedAt ?? fallbackUpdatedAt;
  const isStale = isError && fallbackRate !== null;

  return { rate, lastUpdatedAt, isLoading: isLoading && !fallbackRate, isError: isError && !fallbackRate, isStale };
}
