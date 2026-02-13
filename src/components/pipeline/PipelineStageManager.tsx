import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PipelineStage } from "@/types";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
}

export default function PipelineStageManager({ open, onOpenChange, stages }: Props) {
  const queryClient = useQueryClient();
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#6B7280");

  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index);

  const swapOrderMutation = useMutation({
    mutationFn: async ({ stageA, stageB }: { stageA: PipelineStage; stageB: PipelineStage }) => {
      const { error: err1 } = await supabase
        .from("pipeline_stages")
        .update({ order_index: stageB.order_index })
        .eq("id", stageA.id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("pipeline_stages")
        .update({ order_index: stageA.order_index })
        .eq("id", stageB.id);
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
    onError: () => toast.error("Erro ao reordenar etapas"),
  });

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    swapOrderMutation.mutate({
      stageA: sortedStages[index],
      stageB: sortedStages[index - 1],
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= sortedStages.length - 1) return;
    swapOrderMutation.mutate({
      stageA: sortedStages[index],
      stageB: sortedStages[index + 1],
    });
  };

  const addStageMutation = useMutation({
    mutationFn: async () => {
      if (!newStageName.trim()) return;
      const customStages = stages.filter((s) => !(s as any).is_fixed || !["final", "lost"].includes((s as any).stage_type));
      const maxOrder = Math.max(...customStages.map((s) => s.order_index), 0);

      const finalStages = stages.filter((s) => ["final", "lost"].includes((s as any).stage_type));
      for (const fs of finalStages) {
        await supabase
          .from("pipeline_stages")
          .update({ order_index: fs.order_index + 1 })
          .eq("id", fs.id);
      }

      const { error } = await supabase.from("pipeline_stages").insert({
        name: newStageName.trim(),
        order_index: maxOrder + 1,
        color: newStageColor,
        is_fixed: false,
        stage_type: "custom",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      setNewStageName("");
      toast.success("Etapa adicionada");
    },
    onError: () => toast.error("Erro ao adicionar etapa"),
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const firstStage = stages.find((s) => s.order_index === 1);
      if (firstStage) {
        await supabase
          .from("leads")
          .update({ stage_id: firstStage.id })
          .eq("stage_id", stageId);
      }
      const { error } = await supabase.from("pipeline_stages").delete().eq("id", stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Etapa removida");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao remover etapa"),
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from("pipeline_stages")
        .update({ name, color })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Etapa atualizada");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar etapa"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Gerenciar Etapas do Pipeline</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            {sortedStages.map((stage, idx) => {
              const isFixed = (stage as any).is_fixed;
              return (
                <div
                  key={stage.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === 0 || swapOrderMutation.isPending}
                      onClick={() => handleMoveUp(idx)}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === sortedStages.length - 1 || swapOrderMutation.isPending}
                      onClick={() => handleMoveDown(idx)}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  {isFixed ? (
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{stage.name}</span>
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-[10px]">
                        Fixa
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        defaultValue={stage.name}
                        className="h-7 text-sm"
                        onBlur={(e) => {
                          if (e.target.value !== stage.name) {
                            updateStageMutation.mutate({
                              id: stage.id,
                              name: e.target.value,
                              color: stage.color,
                            });
                          }
                        }}
                      />
                      <input
                        type="color"
                        defaultValue={stage.color}
                        className="h-7 w-7 cursor-pointer rounded border-0"
                        onChange={(e) =>
                          updateStageMutation.mutate({
                            id: stage.id,
                            name: stage.name,
                            color: e.target.value,
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteStageMutation.mutate(stage.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Nova etapa</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newStageColor}
                onChange={(e) => setNewStageColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border-0"
              />
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Nome da etapa"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => addStageMutation.mutate()}
                disabled={!newStageName.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
