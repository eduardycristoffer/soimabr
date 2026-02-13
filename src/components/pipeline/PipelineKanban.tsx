import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, User, Building2, DollarSign, FileText, Globe, Megaphone, UserCheck } from "lucide-react";
import { LeadWithStage, PipelineStage } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  stages: PipelineStage[];
  leads: LeadWithStage[];
  filter: "all" | "lead" | "proposal";
  onDrop: (leadId: string, fromStageId: string, toStageId: string) => void;
  onCardClick: (lead: LeadWithStage) => void;
}

export default function PipelineKanban({ stages, leads, filter, onDrop, onCardClick }: Props) {
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, lead: LeadWithStage) => {
    e.dataTransfer.setData("leadId", lead.id);
    e.dataTransfer.setData("fromStageId", lead.stage_id ?? "");
    e.dataTransfer.effectAllowed = "move";
    setDraggingLeadId(lead.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStageId(stageId);
  }, []);

  const handleDragLeave = useCallback(() => setDragOverStageId(null), []);

  const handleDropEvent = useCallback((e: React.DragEvent, toStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    setDraggingLeadId(null);
    const leadId = e.dataTransfer.getData("leadId");
    const fromStageId = e.dataTransfer.getData("fromStageId");
    if (!leadId || fromStageId === toStageId) return;
    onDrop(leadId, fromStageId, toStageId);
  }, [onDrop]);

  const handleDragEnd = useCallback(() => {
    setDragOverStageId(null);
    setDraggingLeadId(null);
  }, []);

  const getLeadsByStage = (stageId: string) => {
    let filtered = leads?.filter((l) => l.stage_id === stageId) || [];
    if (filter === "lead") filtered = filtered.filter((l) => !(l as any).quote_id);
    if (filter === "proposal") filtered = filtered.filter((l) => !!(l as any).quote_id);
    return filtered;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
    }).format(value);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "webhook": return <Globe className="h-3 w-3" />;
      case "indicacao": return <Megaphone className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
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
            onDrop={(e) => handleDropEvent(e, stage.id)}
          >
            {/* Stage Header */}
            <div className="mb-4 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="font-semibold">{stage.name}</h3>
                  <Badge variant="secondary" className="ml-1">{stageLeads.length}</Badge>
                </div>
              </div>
              {(() => {
                const total = stageLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
                return total > 0 ? (
                  <p className="text-xs font-medium text-primary pl-5">{formatCurrency(total)}</p>
                ) : null;
              })()}
            </div>

            {/* Leads */}
            <div className="space-y-3">
              {stageLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-background/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum lead nesta etapa</p>
                </div>
              ) : (
                stageLeads.map((lead) => {
                  const hasQuote = !!(lead as any).quote_id;
                  const isConverted = lead.is_converted;
                  const source = (lead as any).source || "manual";
                  const leadOrigin = (lead as any).lead_origin || "manual";

                  return (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onCardClick(lead)}
                      className={cn(
                        "cursor-grab transition-all hover:shadow-md active:cursor-grabbing group",
                        draggingLeadId === lead.id && "opacity-50 scale-95"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium leading-tight">{lead.title}</h4>
                              {hasQuote && (
                                <Badge variant="outline" className="text-[10px] border-primary text-primary">
                                  <FileText className="h-2.5 w-2.5 mr-0.5" />
                                  Proposta
                                </Badge>
                              )}
                              {isConverted && (
                                <Badge variant="outline" className="text-[10px] border-green-500 text-green-600">
                                  <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                                  Cliente
                                </Badge>
                              )}
                            </div>

                            {/* Source badge */}
                            {source !== "manual" && (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px]">
                                  {getSourceIcon(source)}
                                  <span className="ml-0.5">{source}</span>
                                </Badge>
                              </div>
                            )}

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

                            {/* Show quote number if has quote */}
                            {hasQuote && (lead as any).quotes?.quote_number && (
                              <div className="flex items-center gap-1 text-sm text-primary font-mono">
                                <FileText className="h-3 w-3" />
                                {(lead as any).quotes.quote_number}
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
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
