import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { QuoteStatus } from "@/types";
import { formatQuoteAmount } from "@/lib/quoteMoney";

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  finalized: { label: "Finalizado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export interface RecentQuote {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  currency?: string | null;
  usd_brl_rate_used?: number | string | null;
  clients?: { razao_social?: string | null; nome_fantasia?: string | null } | null;
}

/** Últimas propostas: nome do cliente com reticências, e valor + situação empilhados no celular. */
export function RecentQuotesView({ quotes }: { quotes?: RecentQuote[] | null }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Propostas recentes</CardTitle>
        <CardDescription>Últimas propostas criadas</CardDescription>
      </CardHeader>
      <CardContent>
        {!quotes || quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma proposta ainda</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {quotes.map((quote) => (
              <li
                key={quote.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-medium">{quote.quote_number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {quote.clients?.nome_fantasia || quote.clients?.razao_social || "-"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="whitespace-nowrap text-sm font-medium tabular-nums">
                    {formatQuoteAmount(quote.total, quote as any)}
                  </span>
                  <Badge variant={statusConfig[quote.status as QuoteStatus]?.variant} className={`status-badge-${quote.status}`}>
                    {statusConfig[quote.status as QuoteStatus]?.label}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function RecentQuotes() {
  const { isAdmin, user } = useAuth();

  const { data: quotes } = useQuery({
    queryKey: ["recent-quotes", isAdmin, user?.user_id],
    queryFn: async () => {
      let query = supabase
        .from("quotes")
        .select("*, clients(razao_social, nome_fantasia)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!isAdmin) query = query.eq("created_by", user!.user_id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return <RecentQuotesView quotes={quotes as any} />;
}
