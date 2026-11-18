import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Settings, LayoutGrid, List } from "lucide-react";
import { LeadWithStage } from "@/types";
import { toast } from "sonner";
import { usePipelineData } from "@/hooks/usePipelineData";

import LeadFormModal, { type LeadFormValues } from "@/components/pipeline/LeadFormModal";
import LeadDetailModal from "@/components/pipeline/LeadDetailModal";
import ClientFormModal from "@/components/clients/ClientFormModal";
import PipelineStageManager from "@/components/pipeline/PipelineStageManager";
import PipelineExport from "@/components/pipeline/PipelineExport";
import PipelineKanban from "@/components/pipeline/PipelineKanban";
import PipelineLeadList from "@/components/pipeline/PipelineLeadList";
import {
  ToggleGroup, ToggleGroupItem,
} from "@/components/ui/toggle-group";

export default function Pipeline() {
  const {
    stages,
    leads,
    isAdmin,
    moveLeadMutation,
    createLeadMutation,
    updateLeadMutation,
    deleteLeadMutation,
    convertLeadMutation,
  } = usePipelineData();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithStage | null>(null);
  const [detailLead, setDetailLead] = useState<LeadWithStage | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<LeadWithStage | null>(null);
  const [stageManagerOpen, setStageManagerOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "lead" | "proposal">("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

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
      updateLeadMutation.mutate({ id: editingLead.id, values }, {
        onSuccess: () => setFormOpen(false),
      });
    } else {
      createLeadMutation.mutate(values, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleConvert = (lead: LeadWithStage) => {
    setDetailOpen(false);
    setConvertingLead(lead);
    setConvertOpen(true);
  };

  const handleConvertSuccess = (clientId: string) => {
    if (!convertingLead) return;
    convertLeadMutation.mutate(
      { leadId: convertingLead.id, clientId },
      {
        onSuccess: () => {
          setConvertOpen(false);
          setConvertingLead(null);
        },
      }
    );
  };

  const handleDrop = useCallback(
    (leadId: string, fromStageId: string, toStageId: string) => {
      moveLeadMutation.mutate({ leadId, fromStageId, toStageId });
    },
    [moveLeadMutation]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">
            Acompanhe seus leads do primeiro contato ao fechamento
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
            <ToggleGroupItem value="kanban" size="sm" aria-label="Kanban">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" size="sm" aria-label="Lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as any)}>
            <ToggleGroupItem value="all" size="sm">Todos</ToggleGroupItem>
            <ToggleGroupItem value="lead" size="sm">Leads</ToggleGroupItem>
            <ToggleGroupItem value="proposal" size="sm">Propostas</ToggleGroupItem>
          </ToggleGroup>
          {stages && <PipelineExport stages={stages} />}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setStageManagerOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Etapas
            </Button>
          )}
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Kanban / List View */}
      {viewMode === "kanban" ? (
        stages && stages.length > 0 ? (
          <PipelineKanban
            stages={stages}
            leads={leads || []}
            filter={filter}
            onDrop={handleDrop}
            onCardClick={openDetail}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold">Pipeline não configurado</h3>
              <p className="text-muted-foreground">
                As etapas do pipeline serão carregadas automaticamente
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <PipelineLeadList
          leads={leads || []}
          filter={filter}
          onCardClick={openDetail}
        />
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
        onDelete={() => {
          if (detailLead) {
            deleteLeadMutation.mutate(detailLead.id, {
              onSuccess: () => {
                setDetailOpen(false);
                setDetailLead(null);
              },
            });
          }
        }}
        onConvert={() => detailLead && handleConvert(detailLead)}
      />

      <ClientFormModal
        open={convertOpen}
        onOpenChange={(open) => {
          setConvertOpen(open);
          if (!open) setConvertingLead(null);
        }}
        leadData={convertingLead ? {
          company_name: convertingLead.company_name || undefined,
          contact_name: convertingLead.contact_name || undefined,
          contact_email: convertingLead.contact_email || undefined,
          contact_phone: convertingLead.contact_phone || undefined,
        } : null}
        onConvertSuccess={handleConvertSuccess}
      />

      {stages && (
        <PipelineStageManager
          open={stageManagerOpen}
          onOpenChange={setStageManagerOpen}
          stages={stages}
        />
      )}
    </div>
  );
}
