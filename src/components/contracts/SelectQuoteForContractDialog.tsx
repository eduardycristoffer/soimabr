import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileSignature } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (quoteId: string) => void;
}

export default function SelectQuoteForContractDialog({ open, onClose, onSelect }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["quotes-eligible-for-contract"],
    queryFn: async () => {
      const [{ data: quotes }, { data: existing }] = await Promise.all([
        supabase
          .from("quotes")
          .select("id, quote_number, quote_type, total, currency, project_name, clients(razao_social, nome_fantasia)")
          .eq("status", "finalized")
          .order("created_at", { ascending: false }),
        supabase.from("contracts").select("quote_id"),
      ]);
      const used = new Set((existing || []).map((c: any) => c.quote_id));
      return (quotes || []).filter((q: any) => !used.has(q.id));
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolher proposta</DialogTitle>
          <DialogDescription>
            Selecione uma proposta finalizada para gerar o contrato.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <FileSignature className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma proposta finalizada disponível para gerar contrato.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((q: any) => (
              <button
                key={q.id}
                onClick={() => onSelect(q.id)}
                className="w-full text-left border rounded-md p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm font-medium">{q.quote_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {q.clients?.nome_fantasia || q.clients?.razao_social || "—"}
                      {q.project_name ? ` · ${q.project_name}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase text-muted-foreground">
                      {q.quote_type === "locacao" ? "Locação" : "Venda"}
                    </div>
                    <div className="text-sm font-medium">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: q.currency || "BRL" }).format(q.total || 0)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
