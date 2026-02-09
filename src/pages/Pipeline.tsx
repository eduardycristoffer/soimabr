import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, User, Building2, DollarSign } from "lucide-react";
import { PipelineStage, Lead } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import LeadFormModal, { type LeadFormValues } from "@/components/pipeline/LeadFormModal";
import LeadDetailModal from "@/components/pipeline/LeadDetailModal";

type LeadWithStage = Lead & { pipeline_stages?: PipelineStage | null; clients?: any };

export default function Pipeline() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithStage | null>(null);
  const [detailLead, setDetailLead] = useState<LeadWithStage | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Queries
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
      return data as LeadWithStage[];
    },
  });

  // Mutations
  const moveLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      fromStageId,
      toStageId,
    }: {
      leadId: string;
      fromStageId: string;
      toStageId: string;
    }) => {
      const { error: updateErr } = await supabase
        .from("leads")
        .update({ stage_id: toStageId })
        .eq("id", leadId);
      if (updateErr) throw updateErr;

      const { error: histErr } = await supabase.from("lead_histories").insert({
        lead_id: leadId,
        user_id: user!.user_id,
        from_stage_id: fromStageId,
        to_stage_id: toStageId,
        action: "MOVED",
      });
      if (histErr) throw histErr;
    },
    onMutate: async ({ leadId, toStageId }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const prev = queryClient.getQueryData<LeadWithStage[]>(["leads"]);
      queryClient.setQueryData<LeadWithStage[]>(["leads"], (old) =>
        old?.map((l) =>
          l.id === leadId
            ? {
                ...l,
                stage_id: toStageId,
                pipeline_stages: stages?.find((s) => s.id === toStageId) ?? l.pipeline_stages,
              }
            : l
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["leads"], ctx.prev);
      toast.error("Erro ao mover lead");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const createLeadMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      const firstStage = stages?.find((s) => s.order_index === 1) ?? stages?.[0];
      const { data, error } = await supabase
        .from("leads")
        .insert({
          title: values.title,
          company_name: values.company_name || null,
          contact_name: values.contact_name || null,
          contact_email: values.contact_email || null,
          contact_phone: values.contact_phone || null,
          estimated_value: values.estimated_value ? Number(values.estimated_value) : null,
          expected_close_date: values.expected_close_date || null,
          notes: values.notes || null,
          owner_id: user!.user_id,
          stage_id: firstStage?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("lead_histories").insert({
        lead_id: data.id,
        user_id: user!.user_id,
        to_stage_id: firstStage?.id ?? null,
        action: "CREATED",
        notes: "Lead criado",
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setFormOpen(false);
      toast.success("Lead criado com sucesso");
    },
    onError: () => toast.error("Erro ao criar lead"),
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: LeadFormValues }) => {
      const { error } = await supabase
        .from("leads")
        .update({
          title: values.title,
          company_name: values.company_name || null,
          contact_name: values.contact_name || null,
          contact_email: values.contact_email || null,
          contact_phone: values.contact_phone || null,
          estimated_value: values.estimated_value ? Number(values.estimated_value) : null,
          expected_close_date: values.expected_close_date || null,
          notes: values.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setFormOpen(false);
      setEditingLead(null);
      toast.success("Lead atualizado");
    },
    onError: () => toast.error("Erro ao atualizar lead"),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDetailOpen(false);
      setDetailLead(null);
      toast.success("Lead excluído");
    },
    onError: () => toast.error("Erro ao excluir lead"),
  });

  // DnD handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, lead: LeadWithStage) => {
      e.dataTransfer.setData("leadId", lead.id);
      e.dataTransfer.setData("fromStageId", lead.stage_id ?? "");
      e.dataTransfer.effectAllowed = "move";
      setDraggingLeadId(lead.id);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverStageId(stageId);
    },
    []
  );

  const handleDragLeave = useCallback(() => setDragOverStageId(null), []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toStageId: string) => {
      e.preventDefault();
      setDragOverStageId(null);
      setDraggingLeadId(null);
      const leadId = e.dataTransfer.getData("leadId");
      const fromStageId = e.dataTransfer.getData("fromStageId");
      if (!leadId || fromStageId === toStageId) return;
      moveLeadMutation.mutate({ leadId, fromStageId, toStageId });
    },
    [moveLeadMutation]
  );

  const handleDragEnd = useCallback(() => {
    setDragOverStageId(null);
    setDraggingLeadId(null);
  }, []);

  // Helpers
  const getLeadsByStage = (stageId: string) =>
    leads?.filter((l) => l.stage_id === stageId) || [];

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
    }).format(value);
  };

  const openCreateForm = () => {
    setEditingLead(null);
    setFormOpen(true);
  };

  const openEditForm = (lead: LeadWithStage) => {
    setDetailOpen(false);
    setEditingLead(lead);
    setFormOpen(true);
  };

  const openDetail = (lead: LeadWithStage) => {
    setDetailLead(lead);
    setDetailOpen(true);
  };

  const handleFormSubmit = (values: LeadFormValues) => {
    if (editingLead) {
      updateLeadMutation.mutate({ id: editingLead.id, values });
    } else {
      createLeadMutation.mutate(values);
    }
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
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages?.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          const isOver = dragOverStageId === stage.id;
          return (
            <div
              key={stage.id}
              className={cn(
                "min-w-[300px] flex-shrink-0 rounded-lg bg-muted/30 p-4 transition-colors",
                isOver && "ring-2 ring-primary/50 bg-primary/5"
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className="mb-4 space-y-1">
                <div className="flex items-center justify-between">
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
                {(() => {
                  const total = stageLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
                  return total > 0 ? (
                    <p className="text-xs font-medium text-primary pl-5">
                      {formatCurrency(total)}
                    </p>
                  ) : null;
                })()}
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
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openDetail(lead)}
                      className={cn(
                        "cursor-grab transition-all hover:shadow-md active:cursor-grabbing group",
                        draggingLeadId === lead.id && "opacity-50 scale-95"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* Empty state */}
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

      {/* Modals */}
      <LeadFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLead(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={editingLead ?? undefined}
        isLoading={createLeadMutation.isPending || updateLeadMutation.isPending}
      />

      <LeadDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        lead={detailLead}
        isAdmin={isAdmin}
        onEdit={() => detailLead && openEditForm(detailLead)}
        onDelete={() => detailLead && deleteLeadMutation.mutate(detailLead.id)}
      />
    </div>
  );
}
