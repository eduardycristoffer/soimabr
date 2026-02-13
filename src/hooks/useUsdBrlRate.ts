import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

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
    queryFn: async () => {
      const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
      if (!res.ok) throw new Error("Falha ao buscar cotação");
      const json = await res.json();
      const bid = parseFloat(json.USDBRL.bid);
      const timestamp = json.USDBRL.create_date; // "YYYY-MM-DD HH:MM:SS"
      return { rate: bid, lastUpdatedAt: timestamp };
    },
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
