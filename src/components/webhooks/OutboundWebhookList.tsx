import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import OutboundWebhookFormModal from "./OutboundWebhookFormModal";

const EVENT_LABELS: Record<string, string> = {
  "lead.created": "Lead Criado",
  "lead.updated": "Lead Atualizado",
  "lead.converted": "Lead Convertido",
  "proposal.created": "Proposta Criada",
  "proposal.finalized": "Proposta Finalizada",
  "pipeline.stage_changed": "Mudança de Etapa",
};

export default function OutboundWebhookList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["outbound-webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_webhooks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editing) {
        const { error } = await supabase
          .from("outbound_webhooks")
          .update(values as any)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("outbound_webhooks")
          .insert(values as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-webhooks"] });
      setModalOpen(false);
      setEditing(null);
      toast.success(editing ? "Webhook atualizado" : "Webhook criado");
    },
    onError: () => toast.error("Erro ao salvar webhook"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("outbound_webhooks")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outbound-webhooks"] }),
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outbound_webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-webhooks"] });
      toast.success("Webhook removido");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhooks de Saída</CardTitle>
              <CardDescription>Envie eventos para sistemas externos</CardDescription>
            </div>
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !webhooks?.length ? (
            <p className="text-muted-foreground text-center py-8">Nenhum webhook configurado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell>
                      <Badge variant="outline">{EVENT_LABELS[wh.event_type] || wh.event_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[300px] truncate">{wh.target_url}</TableCell>
                    <TableCell>{wh.retry_count}</TableCell>
                    <TableCell>
                      <Switch
                        checked={wh.is_active}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: wh.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(wh); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(wh.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OutboundWebhookFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={(data) => upsertMutation.mutate(data)}
        editing={editing}
        isPending={upsertMutation.isPending}
      />
    </div>
  );
}
