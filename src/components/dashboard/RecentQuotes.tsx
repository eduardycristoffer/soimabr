import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { QuoteStatus } from "@/types";

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  finalized: { label: "Finalizado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

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

  const formatCurrency = (value: number, currency: string = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propostas Recentes</CardTitle>
        <CardDescription>Últimas propostas criadas</CardDescription>
      </CardHeader>
      <CardContent>
        {!quotes || quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma proposta ainda
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium font-mono">
                    {quote.quote_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quote.clients?.nome_fantasia || quote.clients?.razao_social || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {formatCurrency(quote.total, quote.currency)}
                  </span>
                  <Badge variant={statusConfig[quote.status as QuoteStatus]?.variant} className={`status-badge-${quote.status}`}>
                    {statusConfig[quote.status as QuoteStatus]?.label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
