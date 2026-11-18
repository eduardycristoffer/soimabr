import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Client, QuoteStatus } from "@/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Globe, Mail, Phone, MapPin, User, FileText } from "lucide-react";
import { QuoteAmount } from "@/components/quotes/QuoteAmount";

interface ClientDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Rascunho",
  finalized: "Finalizado",
  cancelled: "Cancelado",
};

export default function ClientDetailModal({ open, onOpenChange, client }: ClientDetailModalProps) {
  const { data: quotes } = useQuery({
    queryKey: ["client-quotes", client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, project_name, total, currency, usd_brl_rate_used, status, created_at")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client?.id && open,
  });

  if (!client) return null;

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(date));

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-2 text-sm">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <span className="text-muted-foreground">{label}: </span>
          <span className="font-medium">{value}</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {client.razao_social}
            <Badge variant={client.client_type === "nacional" ? "default" : "secondary"}>
              {client.client_type === "nacional" ? (
                <><Building2 className="mr-1 h-3 w-3" />Nacional</>
              ) : (
                <><Globe className="mr-1 h-3 w-3" />Internacional</>
              )}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {client.nome_fantasia || "Detalhes do cliente"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Documentos */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Documentos</h4>
            {client.cnpj && <InfoRow icon={FileText} label="CNPJ" value={client.cnpj} />}
            {client.cpf && <InfoRow icon={FileText} label="CPF" value={client.cpf} />}
            {client.inscricao_estadual && <InfoRow icon={FileText} label="IE" value={client.inscricao_estadual} />}
            {client.tax_id && <InfoRow icon={FileText} label="Tax ID" value={client.tax_id} />}
          </div>

          <Separator />

          {/* Contato */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Contato</h4>
            <InfoRow icon={Mail} label="Email" value={client.email} />
            <InfoRow icon={Phone} label="Telefone" value={client.telefone} />
            {client.contato_nome && (
              <>
                <InfoRow icon={User} label="Contato" value={client.contato_nome} />
                <InfoRow icon={Mail} label="Email contato" value={client.contato_email} />
                <InfoRow icon={Phone} label="Tel contato" value={client.contato_telefone} />
              </>
            )}
          </div>

          <Separator />

          {/* Endereço */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Endereço</h4>
            <InfoRow icon={MapPin} label="Endereço" value={client.endereco} />
            <InfoRow icon={MapPin} label="Cidade/Estado" value={
              client.cidade && client.estado
                ? `${client.cidade}/${client.estado}`
                : client.cidade || undefined
            } />
            <InfoRow icon={MapPin} label="CEP" value={client.cep} />
            <InfoRow icon={Globe} label="País" value={client.pais} />
          </div>

          {client.observacoes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Observações</h4>
                <p className="text-sm text-muted-foreground">{client.observacoes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Propostas vinculadas */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Propostas ({quotes?.length ?? 0})</h4>
            {!quotes || quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma proposta vinculada</p>
            ) : (
              <div className="space-y-2">
                {quotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                    <div>
                      <span className="font-mono font-medium">{q.quote_number}</span>
                      {q.project_name && <span className="ml-2 text-muted-foreground">· {q.project_name}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <QuoteAmount className="font-medium text-right" value={q.total} quote={q} />
                      <Badge variant={q.status === "finalized" ? "default" : q.status === "cancelled" ? "destructive" : "secondary"} className="text-xs">
                        {statusLabels[q.status as QuoteStatus]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
