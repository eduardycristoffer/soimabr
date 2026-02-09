import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  User,
  Mail,
  Phone,
  DollarSign,
  CalendarDays,
  ArrowRight,
  Trash2,
  Pencil,
  Clock,
} from "lucide-react";
import { Lead, PipelineStage } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: (Lead & { pipeline_stages?: PipelineStage | null }) | null;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function LeadDetailModal({
  open,
  onOpenChange,
  lead,
  isAdmin,
  onEdit,
  onDelete,
}: LeadDetailModalProps) {
  const { data: history } = useQuery({
    queryKey: ["lead-history", lead?.id],
    enabled: !!lead?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_histories")
        .select("*, from_stage:pipeline_stages!lead_histories_from_stage_id_fkey(name, color), to_stage:pipeline_stages!lead_histories_to_stage_id_fkey(name, color)")
        .eq("lead_id", lead!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!lead) return null;

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) =>
    format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lead.title}
            {lead.pipeline_stages && (
              <Badge
                style={{ backgroundColor: lead.pipeline_stages.color, color: "#fff" }}
              >
                {lead.pipeline_stages.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {lead.company_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>{lead.company_name}</span>
              </div>
            )}
            {lead.contact_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span>{lead.contact_name}</span>
              </div>
            )}
            {lead.contact_email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{lead.contact_email}</span>
              </div>
            )}
            {lead.contact_phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{lead.contact_phone}</span>
              </div>
            )}
            {lead.estimated_value && (
              <div className="flex items-center gap-2 font-medium text-primary">
                <DollarSign className="h-4 w-4 shrink-0" />
                <span>{formatCurrency(lead.estimated_value)}</span>
              </div>
            )}
            {lead.expected_close_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>
                  {format(new Date(lead.expected_close_date), "dd/MM/yyyy")}
                </span>
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-1">Observações</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          <Separator />

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Histórico de movimentações
            </h4>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3"
                  >
                    <div className="flex-1">
                      {entry.action === "MOVED" ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: (entry as any).from_stage?.color,
                              color: (entry as any).from_stage?.color,
                            }}
                          >
                            {(entry as any).from_stage?.name ?? "?"}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge
                            style={{
                              backgroundColor: (entry as any).to_stage?.color,
                              color: "#fff",
                            }}
                          >
                            {(entry as any).to_stage?.name ?? "?"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="font-medium">{entry.action}</span>
                      )}
                      {entry.notes && (
                        <p className="text-muted-foreground mt-1">{entry.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Excluir
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
