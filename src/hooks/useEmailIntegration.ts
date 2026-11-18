import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasColumn } from "@/lib/dbFeatures";

export interface EmailAvailability {
  /** Tabelas novas existem no banco (SQL manual aplicado) */
  dbReady: boolean;
  /** A edge function `proposal-email` está publicada */
  deployed: boolean;
  /** A conta de e-mail da empresa está conectada e ativa */
  configured: boolean;
  /** Os envios precisam da autorização de um administrador */
  requireAdminApproval: boolean;
  fromEmail: string | null;
  isLoading: boolean;
}

const OFF: EmailAvailability = {
  dbReady: false, deployed: false, configured: false, requireAdminApproval: false, fromEmail: null, isLoading: false,
};

/** Chamada às ações da função de e-mail, com mensagem de erro legível. */
export async function callProposalEmail(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("proposal-email", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error && data?.ok !== false) throw new Error(data.error);
  return data;
}

/**
 * Diz se o envio de propostas por e-mail já pode ser usado. Enquanto o banco não for atualizado
 * ou a função não for publicada, os botões novos não aparecem e nada muda no sistema.
 */
export function useEmailIntegration(): EmailAvailability {
  const { data, isLoading } = useQuery({
    queryKey: ["email-integration-availability"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<Omit<EmailAvailability, "isLoading">> => {
      const dbReady =
        (await hasColumn("email_integration", "id")) &&
        (await hasColumn("proposal_email_dispatches", "id"));
      if (!dbReady) return { ...OFF, dbReady: false };

      const { data: status, error } = await supabase.functions.invoke("proposal-email", { body: { action: "status" } });
      if (error || !status) return { ...OFF, dbReady: true };
      return {
        dbReady: true,
        deployed: true,
        configured: !!status.configured,
        requireAdminApproval: !!status.require_admin_approval,
        fromEmail: status.from_email || null,
      };
    },
  });
  return { ...(data || OFF), isLoading };
}
