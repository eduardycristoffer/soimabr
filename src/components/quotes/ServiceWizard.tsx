import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useServiceWizard, SERVICE_WIZARD_STEPS } from "@/hooks/useServiceWizard";
import { cityFromAddress, itemsFromRows, normalizeServiceData, serviceProblems } from "@/lib/serviceProposal";
import { saveServiceProposal } from "@/lib/serviceProposalSave";
import WizardHeader from "./WizardHeader";

import StepClient from "./steps/StepClient";
import ServiceStepScope, { IssuerCompany } from "./service-steps/ServiceStepScope";
import ServiceStepItems from "./service-steps/ServiceStepItems";
import ServiceStepTerms from "./service-steps/ServiceStepTerms";
import ServiceStepReview from "./service-steps/ServiceStepReview";

interface Props {
  onClose: () => void;
  editingQuoteId?: string | null;
  duplicatingQuoteId?: string | null;
}

interface CompanyRow extends IssuerCompany {
  address: string | null;
  representante_nome: string | null;
  representante_cargo: string | null;
}

export default function ServiceWizard({ onClose, editingQuoteId, duplicatingQuoteId }: Props) {
  const queryClient = useQueryClient();
  const wizard = useServiceWizard();
  const sourceQuoteId = editingQuoteId || duplicatingQuoteId;

  // Empresas que podem emitir a proposta (Dacrom é a padrão)
  const { data: companies } = useQuery({
    queryKey: ["service-issuer-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("id, slug, company_name, razao_social, address, representante_nome, representante_cargo")
        .order("company_name");
      if (error) throw error;
      return (data || []) as CompanyRow[];
    },
    staleTime: 5 * 60_000,
  });

  const companyBySlug = (slug: string) => (companies || []).find((c) => c.slug === slug);

  // Proposta nova: preenche cidade e assinante com os dados da empresa emitente (uma vez)
  const defaultsApplied = useRef(false);
  useEffect(() => {
    if (defaultsApplied.current || sourceQuoteId || !companies) return;
    defaultsApplied.current = true;
    const c = companyBySlug(wizard.data.service.company_slug);
    if (c) {
      wizard.updateService({
        issue_city: cityFromAddress(c.address),
        signer_name: c.representante_nome || "",
        signer_role: c.representante_cargo || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, sourceQuoteId]);

  const onCompanyChange = (slug: string) => {
    const c = companyBySlug(slug);
    wizard.updateService({
      company_slug: slug,
      issue_city: cityFromAddress(c?.address),
      signer_name: c?.representante_nome || "",
      signer_role: c?.representante_cargo || "",
    });
  };

  // Editar / duplicar: carrega a proposta existente UMA vez (não sobrescreve o que o usuário digitou
  // se a janela perder e recuperar o foco)
  const loaded = useRef(false);
  const { isLoading: isLoadingQuote, data: sourceQuote } = useQuery({
    queryKey: ["service-quote-source", sourceQuoteId],
    queryFn: async () => {
      const { data: quote, error } = await supabase
        .from("quotes")
        .select("*, clients(razao_social, nome_fantasia, client_type), quote_items(*)")
        .eq("id", sourceQuoteId!)
        .single();
      if (error) throw error;
      return quote as any;
    },
    enabled: !!sourceQuoteId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!sourceQuote || loaded.current) return;
    loaded.current = true;
    const q = sourceQuote;
    wizard.updateData({
      client_id: q.client_id,
      client_name: q.clients?.nome_fantasia || q.clients?.razao_social || "",
      client_type: q.clients?.client_type || "nacional",
      project_name: q.project_name || "",
      project_location: q.project_location || "",
      validity_days: q.validity_days || 30,
      notes: q.notes || "",
      show_unit_prices: !q.hide_unit_prices,
      items: itemsFromRows(q.quote_items),
      service: normalizeServiceData(q.service_data, companyBySlug(q.service_data?.company_slug) || undefined),
      // proposta que já existe foi revisada antes; basta reconfirmar se mexer nos textos
      texts_reviewed: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceQuote]);

  const originalStatus: string | null = editingQuoteId ? (sourceQuote?.status ?? null) : null;

  const saveMutation = useMutation({
    mutationFn: async (mode: "draft" | "finalized" | "keep") => {
      const d = wizard.data;
      if (!d.client_id) throw new Error("Escolha o cliente antes de salvar.");
      if (mode !== "draft") {
        const problems = serviceProblems({ client_id: d.client_id, items: d.items, data: d.service, validity_days: d.validity_days });
        if (problems.length) throw new Error(problems[0]);
      }

      await supabase.auth.refreshSession();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Sessão expirada. Faça login novamente para salvar a proposta.");
      const userId = userData.user.id;

      const { quoteNumber } = await saveServiceProposal(supabase, {
        mode,
        editingQuoteId,
        originalStatus,
        userId,
        input: {
          client_id: d.client_id,
          project_name: d.project_name,
          project_location: d.project_location,
          validity_days: d.validity_days,
          notes: d.notes,
          show_unit_prices: d.show_unit_prices,
          items: d.items,
          service: d.service,
        },
      });

      return { quoteNumber, mode };
    },
    onSuccess: ({ quoteNumber, mode }) => {
      const isEdit = !!editingQuoteId;
      toast({
        title: mode === "keep"
          ? `Alteração salva (mantida como ${originalStatus === "finalized" ? "Finalizada" : "Rascunho"})`
          : mode === "finalized"
          ? (isEdit ? "Proposta de serviço atualizada e finalizada!" : "Proposta de serviço finalizada!")
          : (isEdit ? "Proposta de serviço atualizada!" : "Rascunho de serviço salvo!"),
        description: `Número: ${quoteNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      wizard.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar proposta de serviço",
        description: error?.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  if (sourceQuoteId && isLoadingQuote) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando proposta...</p>
      </div>
    );
  }

  const stepClientData = {
    client_id: wizard.data.client_id,
    client_name: wizard.data.client_name,
    client_type: wizard.data.client_type,
  };

  return (
    <div className="space-y-6">
      <WizardHeader
        title={editingQuoteId ? "Editar proposta de serviço" : duplicatingQuoteId ? "Duplicar proposta de serviço" : "Nova proposta de serviço"}
        steps={SERVICE_WIZARD_STEPS}
        current={wizard.step}
        onBack={onClose}
        onGoTo={wizard.goToStep}
      />

      <div className="min-h-[400px]">
        {wizard.step === 1 && (
          <StepClient data={stepClientData as any} updateData={(d: any) => wizard.updateData(d)} onNext={wizard.nextStep} />
        )}
        {wizard.step === 2 && (
          <ServiceStepScope
            data={wizard.data}
            updateData={wizard.updateData}
            updateService={wizard.updateService}
            companies={companies || []}
            onCompanyChange={onCompanyChange}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}
        {wizard.step === 3 && (
          <ServiceStepItems data={wizard.data} updateData={wizard.updateData} totals={wizard.totals} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 4 && (
          <ServiceStepTerms data={wizard.data} updateData={wizard.updateData} updateService={wizard.updateService} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 5 && (
          <ServiceStepReview
            data={wizard.data}
            totals={wizard.totals}
            updateData={wizard.updateData}
            onPrev={wizard.prevStep}
            onSaveDraft={() => saveMutation.mutate("draft")}
            onFinalize={() => saveMutation.mutate("finalized")}
            onSaveChanges={originalStatus === "finalized" ? () => saveMutation.mutate("keep") : undefined}
            isSaving={saveMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
