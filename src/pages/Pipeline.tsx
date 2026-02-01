import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, User, Building2, DollarSign } from "lucide-react";
import { PipelineStage, Lead } from "@/types";
import { cn } from "@/lib/utils";

export default function Pipeline() {
  const { isAdmin, user } = useAuth();

  const { data: stages } = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as PipelineStage[];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, pipeline_stages(*), clients(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getLeadsByStage = (stageId: string) => {
    return leads?.filter((lead) => lead.stage_id === stageId) || [];
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            Acompanhe seus leads do primeiro contato ao fechamento
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages?.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div
              key={stage.id}
              className="min-w-[300px] flex-shrink-0 rounded-lg bg-muted/30 p-4"
            >
              {/* Stage Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="font-semibold">{stage.name}</h3>
                  <Badge variant="secondary" className="ml-1">
                    {stageLeads.length}
                  </Badge>
                </div>
              </div>

              {/* Leads */}
              <div className="space-y-3">
                {stageLeads.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-background/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum lead nesta etapa
                    </p>
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      className={cn(
                        "cursor-pointer transition-shadow hover:shadow-md",
                        "group"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          <div className="flex-1 space-y-2">
                            <h4 className="font-medium leading-tight">
                              {lead.title}
                            </h4>
                            
                            {lead.company_name && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {lead.company_name}
                              </div>
                            )}
                            
                            {lead.contact_name && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <User className="h-3 w-3" />
                                {lead.contact_name}
                              </div>
                            )}
                            
                            {lead.estimated_value && (
                              <div className="flex items-center gap-1 text-sm font-medium text-primary">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(lead.estimated_value)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state quando não há stages */}
      {(!stages || stages.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold">Pipeline não configurado</h3>
            <p className="text-muted-foreground">
              As etapas do pipeline serão carregadas automaticamente
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
