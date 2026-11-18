import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFleet, type FleetData } from "@/lib/fleetApi";

export const FLEET_KEY = ["fleet"] as const;

/** Toda a frota de uma vez (são dezenas de gruas): gruas, locações, custos, catálogo e clientes. */
export function useFleetData(enabled = true) {
  return useQuery<FleetData>({ queryKey: FLEET_KEY, queryFn: fetchFleet, enabled, staleTime: 30_000 });
}

/** Depois de qualquer gravação: atualiza a frota e os cartões dentro dos contratos. */
export function useRefreshFleet() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: FLEET_KEY });
    qc.invalidateQueries({ queryKey: ["contract-rentals"] });
  };
}
