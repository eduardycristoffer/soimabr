import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasColumn } from "@/lib/dbFeatures";

export interface AutentiqueAvailability {
  /** Tabelas/colunas novas já existem no banco (SQL manual aplicado) */
  dbReady: boolean;
  /** A edge function `contract-signature` está publicada */
  deployed: boolean;
  /** A chave de API do Autentique foi configurada nos segredos */
  configured: boolean;
  /** Modo teste (documentos sem validade jurídica) */
  sandbox: boolean;
  webhookConfigured: boolean;
  /** Tudo pronto para enviar contratos para assinatura */
  active: boolean;
  isLoading: boolean;
}

const OFF: AutentiqueAvailability = {
  dbReady: false, deployed: false, configured: false, sandbox: true,
  webhookConfigured: false, active: false, isLoading: false,
};

/**
 * Diz se a assinatura digital via Autentique já pode ser usada.
 * Enquanto o banco não for atualizado, a função não for publicada ou a chave não for
 * informada, a tela de assinatura digital simplesmente não aparece e o sistema
 * continua funcionando como antes.
 */
export function useAutentiqueAvailability(): AutentiqueAvailability {
  const { data, isLoading } = useQuery({
    queryKey: ["autentique-availability"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<Omit<AutentiqueAvailability, "isLoading">> => {
      const dbReady =
        (await hasColumn("contracts", "autentique_document_id")) &&
        (await hasColumn("contract_signature_requests", "id"));
      if (!dbReady) return { ...OFF, dbReady: false };

      const { data: status, error } = await supabase.functions.invoke("contract-signature", {
        body: { action: "status" },
      });
      if (error || !status) return { ...OFF, dbReady: true };

      const configured = !!status.configured;
      return {
        dbReady: true,
        deployed: true,
        configured,
        sandbox: status.sandbox !== false,
        webhookConfigured: !!status.webhook_configured,
        active: configured,
      };
    },
  });

  return { ...(data || OFF), isLoading };
}
