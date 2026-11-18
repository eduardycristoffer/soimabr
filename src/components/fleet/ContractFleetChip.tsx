import { useQuery } from "@tanstack/react-query";
import { Construction } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFleetEnabled } from "@/hooks/useFleetEnabled";
import { Badge } from "@/components/ui/badge";

/** Para cada contrato da lista: códigos das gruas em obra (locações não canceladas nem encerradas). */
export function useContractFleetMap(contractIds: string[]): { enabled: boolean; map: Record<string, string[]> } {
  const { isAdmin } = useAuth();
  const enabled = useFleetEnabled(isAdmin);
  const key = [...contractIds].sort().join(",");
  const { data } = useQuery({
    queryKey: ["contract-rentals", "map", key],
    enabled: enabled && contractIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("fleet_rentals" as any) as any)
        .select("contract_id, cancelled_at, actual_end_date, fleet_units(code)")
        .in("contract_id", contractIds);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const r of data as any[]) {
        if (r.cancelled_at || r.actual_end_date) continue;
        const code = r.fleet_units?.code;
        if (r.contract_id && code) map[r.contract_id] = [...(map[r.contract_id] ?? []), code];
      }
      return map;
    },
  });
  return { enabled, map: data ?? {} };
}

/** Selo na lista de contratos: qual grua atende o contrato (ou "Sem grua" quando é locação ainda sem alocação). */
export function ContractFleetChip({ isRental, codes, enabled }: { isRental: boolean; codes?: string[]; enabled: boolean }) {
  if (!enabled || !isRental) return null;
  if (codes && codes.length > 0) {
    return <Badge variant="outline" className="gap-1"><Construction className="h-3 w-3" aria-hidden />{codes.join(", ")}</Badge>;
  }
  return <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">Sem grua</Badge>;
}
