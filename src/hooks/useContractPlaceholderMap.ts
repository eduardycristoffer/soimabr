import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildPlaceholderMap,
  servicosInclusosBullets,
  type ContractGenerationInputs,
  type ContractRep,
} from "@/lib/contractPlaceholders";

/**
 * Carrega proposta, cliente, itens, empresa e signatários de um contrato já gerado
 * e devolve `buildMap()`, que monta os {{campos}} com os dados ATUAIS do contrato.
 *
 * Serve ao editor para:
 *  - "Restaurar padrão" de uma cláusula já com os dados preenchidos (antes voltava com {{campos}} crus);
 *  - indicar corretamente quando uma cláusula difere do modelo;
 *  - atualizar cláusulas depois de editar parcelas, prazo, serviços ou representantes.
 */
export function useContractPlaceholderMap(contract: any | null | undefined) {
  const contractId: string | undefined = contract?.id;

  const { data: base } = useQuery({
    queryKey: ["contract-map-base", contractId, contract?.quote_id, contract?.company_id],
    enabled: !!contractId,
    queryFn: async () => {
      const quoteReq: any = contract.quote_id
        ? supabase.from("quotes").select("*, clients(*)").eq("id", contract.quote_id).maybeSingle()
        : Promise.resolve({ data: null });
      const itemsReq: any = contract.quote_id
        ? supabase
            .from("quote_items")
            .select("*, products(descricao, descricao_tecnica)")
            .eq("quote_id", contract.quote_id)
            .order("order_index")
        : Promise.resolve({ data: [] });
      const companyReq: any = contract.company_id
        ? supabase.from("company_settings").select("*").eq("id", contract.company_id).maybeSingle()
        : Promise.resolve({ data: null });
      const [q, it, co] = await Promise.all([quoteReq, itemsReq, companyReq]);
      return { quote: q.data as any, items: (it.data || []) as any[], company: co.data as any };
    },
  });

  // Mesma chave/consulta do editor de signatários: o cache é compartilhado
  const { data: sigs } = useQuery({
    queryKey: ["contract-signatories", contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_signatories")
        .select("*")
        .eq("contract_id", contractId!)
        .order("side")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const buildMap = useCallback(
    (override: Record<string, any> = {}): Record<string, string> | null => {
      if (!contract || !base?.quote) return null;
      const c: any = { ...contract, ...override };
      const named = (side: string) =>
        (sigs || []).filter((s: any) => s.side === side && (s.name || "").trim());
      const sellers = named("seller");
      const buyers = named("buyer");
      const toRep = (s: any): ContractRep => ({
        name: s.name || "",
        cpf: s.cpf || "",
        rg: s.rg,
        cargo: s.cargo,
      });

      const inputs: ContractGenerationInputs = {
        seller_reps: sellers.map(toRep),
        buyer_reps: buyers.map(toRep),
        seller_rep_name: sellers[0]?.name ?? c.seller_rep_name ?? "",
        seller_rep_cpf: sellers[0]?.cpf ?? c.seller_rep_cpf ?? "",
        seller_rep_rg: sellers[0]?.rg ?? c.seller_rep_rg ?? "",
        seller_rep_cargo: sellers[0]?.cargo ?? c.seller_rep_cargo ?? "",
        buyer_rep_name: buyers[0]?.name ?? c.buyer_rep_name ?? "",
        buyer_rep_cpf: buyers[0]?.cpf ?? c.buyer_rep_cpf ?? "",
        buyer_rep_rg: buyers[0]?.rg ?? c.buyer_rep_rg ?? "",
        buyer_rep_cargo: buyers[0]?.cargo ?? c.buyer_rep_cargo ?? "",
        seller_manager_name: c.seller_manager_name ?? "",
        seller_manager_cpf: c.seller_manager_cpf ?? "",
        seller_manager_phone: c.seller_manager_phone ?? "",
        seller_manager_email: c.seller_manager_email ?? "",
        buyer_manager_name: c.buyer_manager_name ?? "",
        buyer_manager_cpf: c.buyer_manager_cpf ?? "",
        buyer_manager_phone: c.buyer_manager_phone ?? "",
        buyer_manager_email: c.buyer_manager_email ?? "",
        payment_schedule: Array.isArray(c.payment_schedule) ? c.payment_schedule : [],
        delivery_days: c.delivery_days ?? undefined,
        extra_services: Array.isArray(c.extra_services) ? c.extra_services : [],
        // mantém a data original do contrato ao regerar cláusulas
        contract_date: c.generated_at || c.created_at,
      };

      return buildPlaceholderMap({
        quote: base.quote,
        client: base.quote.clients,
        company: base.company,
        items: base.items,
        inputs,
        contract_number: c.contract_number,
      });
    },
    [contract, base, sigs],
  );

  // Serviços que vêm estruturados da proposta (frete, montagem, operador...)
  const structuredServices = useMemo(
    () => (base?.quote ? servicosInclusosBullets(base.items, base.quote, []) : []),
    [base],
  );

  return {
    ready: !!base?.quote,
    quote: base?.quote as any,
    quoteTotal: Number(base?.quote?.total || 0),
    structuredServices,
    buildMap,
  };
}
