import { useQuery } from "@tanstack/react-query";
import { hasColumn } from "@/lib/dbFeatures";

/**
 * "Confirmar fechamento" só aparece depois que o SQL supabase/manual/2026-11-20_proposal_closing.sql
 * foi aplicado (as colunas existem). Antes disso, a lista de propostas fica como era.
 */
export function useQuoteClosingEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ["feature", "quote-closing"],
    queryFn: async () => {
      const [a, b, c] = await Promise.all([
        hasColumn("quotes", "closed_at"),
        hasColumn("quotes", "closed_by"),
        hasColumn("quotes", "closing_note"),
      ]);
      return a && b && c;
    },
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  return data === true;
}
