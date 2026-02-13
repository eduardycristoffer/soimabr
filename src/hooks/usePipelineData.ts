import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LeadWithStage, PipelineStage } from "@/types";
import type { LeadFormValues } from "@/components/pipeline/LeadFormModal";

export function usePipelineData() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

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
        .select("*, pipeline_stages(*), clients(*), quotes(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as LeadWithStage[];
    },
  });

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

      // Record in both lead_histories and pipeline_history
      await supabase.from("lead_histories").insert({
        lead_id: leadId,
        user_id: user!.user_id,
        from_stage_id: fromStageId,
        to_stage_id: toStageId,
        action: "MOVED",
      });

      await supabase.from("pipeline_history").insert({
        lead_id: leadId,
        from_stage_id: fromStageId,
        to_stage_id: toStageId,
        moved_by: user!.user_id,
      });
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
      const firstStage = stages?.find((s) => (s as any).stage_type === "lead" && s.order_index === 1) ?? stages?.[0];
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
          source: values.source || "manual",
          lead_origin: values.source === "indicacao" ? "indicacao" : "manual",
          owner_id: user!.user_id,
          stage_id: firstStage?.id ?? null,
        } as any)
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

      await supabase.from("pipeline_history").insert({
        lead_id: data.id,
        to_stage_id: firstStage?.id ?? null,
        moved_by: user!.user_id,
        notes: "Lead criado",
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
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
          source: values.source || "manual",
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
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
      toast.success("Lead excluído");
    },
    onError: () => toast.error("Erro ao excluir lead"),
  });

  const convertLeadMutation = useMutation({
    mutationFn: async ({ leadId, clientData }: {
      leadId: string;
      clientData: {
        razao_social: string;
        nome_fantasia?: string;
        contato_nome?: string;
        contato_email?: string;
        contato_telefone?: string;
      };
    }) => {
      // Create client
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .insert({
          razao_social: clientData.razao_social,
          nome_fantasia: clientData.nome_fantasia || null,
          contato_nome: clientData.contato_nome || null,
          contato_email: clientData.contato_email || null,
          contato_telefone: clientData.contato_telefone || null,
          created_by: user!.user_id,
        })
        .select()
        .single();
      if (clientErr) throw clientErr;

      // Update lead
      const { error: leadErr } = await supabase
        .from("leads")
        .update({
          is_converted: true,
          converted_at: new Date().toISOString(),
          client_id: client.id,
        })
        .eq("id", leadId);
      if (leadErr) throw leadErr;

      // History
      await supabase.from("lead_histories").insert({
        lead_id: leadId,
        user_id: user!.user_id,
        action: "CONVERTED",
        notes: `Convertido em cliente: ${clientData.razao_social}`,
      });

      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Lead convertido em cliente com sucesso");
    },
    onError: () => toast.error("Erro ao converter lead"),
  });

  return {
    stages,
    leads,
    isAdmin,
    user,
    moveLeadMutation,
    createLeadMutation,
    updateLeadMutation,
    deleteLeadMutation,
    convertLeadMutation,
  };
}
