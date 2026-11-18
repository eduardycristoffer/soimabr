import { useQuery } from "@tanstack/react-query";
import { hasColumn } from "@/lib/dbFeatures";

/**
 * A gestão de frota só aparece depois que o SQL de `supabase/manual/2026-11-21_fleet.sql` foi aplicado
 * (as tabelas existem). Antes disso, menu e contratos ficam exatamente como eram.
 */
export function useFleetStatus(enabled = true): "loading" | "ready" | "missing" {
  const { data, isLoading } = useQuery({
    queryKey: ["feature", "fleet"],
    queryFn: async () => {
      const [a, b, c] = await Promise.all([
        hasColumn("fleet_units", "id"),
        hasColumn("fleet_rentals", "id"),
        hasColumn("fleet_costs", "id"),
      ]);
      return a && b && c;
    },
    enabled,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  if (!enabled) return "missing";
  if (isLoading) return "loading";
  return data === true ? "ready" : "missing";
}

/** `enabled=false` (quem não é administrador) não consulta o banco. */
export function useFleetEnabled(enabled = true): boolean {
  return useFleetStatus(enabled) === "ready";
}
