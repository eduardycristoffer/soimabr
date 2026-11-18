import { useQuery } from "@tanstack/react-query";
import { hasColumn } from "@/lib/dbFeatures";

/**
 * A proposta de serviço só é oferecida depois que o SQL de `supabase/manual/2026-11-19_service_proposal.sql`
 * foi aplicado (as colunas novas existem). Antes disso, a tela fica exatamente como era.
 */
export function useServiceProposalEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ["feature", "service-proposal"],
    queryFn: async () => {
      const [a, b, c] = await Promise.all([
        hasColumn("quotes", "service_data"),
        hasColumn("quote_items", "unit"),
        hasColumn("quote_items", "is_optional"),
      ]);
      return a && b && c;
    },
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  return data === true;
}
