import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { hasColumn } from "@/lib/dbFeatures";
import { useRentalWizard, RENTAL_WIZARD_STEPS } from "@/hooks/useRentalWizard";
import {
  DEFAULT_COMPANY_SLUG, cityFromAddress, defaultRentalData, linesFromLegacy, normalizeRentalData, rentalProblems,
} from "@/lib/rentalProposal";
import { buildRentalQuotePayload, buildRentalRows } from "@/lib/rentalProposalSave";
import { saveQuoteWithItems } from "@/lib/serviceProposalSave";
import WizardHeader from "./WizardHeader";

import StepClient from "./steps/StepClient";
import RentalStepWork from "./rental-steps/RentalStepWork";
import RentalStepCrane from "./rental-steps/RentalStepCrane";
import RentalStepPrices from "./rental-steps/RentalStepPrices";
import RentalStepTerms, { RentalIssuerCompany } from "./rental-steps/RentalStepTerms";
import RentalStepCommercial from "./rental-steps/RentalStepCommercial";
import RentalStepSummary from "./rental-steps/RentalStepSummary";
import RentalStepReview from "./rental-steps/RentalStepReview";

interface Props {
  onClose: () => void;
  editingQuoteId?: string | null;
  duplicatingQuoteId?: string | null;
}

/** As colunas das propostas detalhadas (service_data, unit, is_optional) já existem no banco? */
async function detailedColumnsExist(): Promise<boolean> {
  const [a, b, c] = await Promise.all([
    hasColumn("quotes", "service_data"),
    hasColumn("quote_items", "unit"),
    hasColumn("quote_items", "is_optional"),
  ]);
  return a && b && c;
}

export default function RentalWizard({ onClose, editingQuoteId, duplicatingQuoteId }: Props) {
  const queryClient = useQueryClient();
  const wizard = useRentalWizard();

  const sourceQuoteId = editingQuoteId || duplicatingQuoteId;

  // Empresas que podem emitir a proposta (mesma lista da proposta de serviço)
  const { data: companies } = useQuery({
    queryKey: ["service-issuer-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("id, slug, company_name, razao_social, address, representante_nome, representante_cargo")
        .order("company_name");
      if (error) throw error;
      return (data || []) as RentalIssuerCompany[];
    },
    staleTime: 5 * 60_000,
  });
  const companyBySlug = (slug: string) => (companies || []).find((c) => c.slug === slug);

  // Proposta nova: preenche cidade e assinante com os dados da empresa emitente (uma vez)
  const defaultsApplied = useRef(false);
  useEffect(() => {
    if (defaultsApplied.current || sourceQuoteId || !companies) return;
    defaultsApplied.current = true;
    const c = companyBySlug(wizard.data.rental.company_slug);
    if (c) {
      wizard.updateRental({
        issue_city: cityFromAddress(c.address),
        signer_name: c.representante_nome || "",
        signer_role: c.representante_cargo || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, sourceQuoteId]);

  const onCompanyChange = (slug: string) => {
    const c = companyBySlug(slug);
    wizard.updateRental({
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
    queryKey: ["rental-quote-source", sourceQuoteId],
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
    // Proposta feita no quadro de preços novo (service_data) ou antiga (só colunas rental_*)
    const isDetailed = q.service_data?.kind === "locacao";
    const rental = isDetailed
      ? normalizeRentalData(q.service_data, companyBySlug(q.service_data?.company_slug) || undefined)
      : { ...defaultRentalData(companyBySlug(DEFAULT_COMPANY_SLUG) || undefined), lines: linesFromLegacy(q) };
    const crane = (q.quote_items || []).find((i: any) => i.product_category === "grua");

    wizard.updateData({
      client_id: q.client_id,
      client_name: q.clients?.nome_fantasia || q.clients?.razao_social || "",
      client_type: q.clients?.client_type || "nacional",
      project_name: q.project_name || "",
      project_location: q.project_location || "",
      rental_work_type: q.rental_work_type || "",
      rental_height_needed: q.rental_height_needed ?? null,
      rental_jib_needed: q.rental_jib_needed ?? null,
      rental_max_weight: q.rental_max_weight ?? null,
      rental_duration_months: q.rental_duration_months ?? null,
      rental_start_date: q.rental_start_date || "",
      rental_terrain_condition: q.rental_terrain_condition || "",
      rental_special_foundation: q.rental_special_foundation ?? false,
      lines: rental.lines,
      rental,
      discount_percent: q.discount_percent || 0,
      rental_tax_percent: q.rental_tax_percent ?? 0,
      payment_terms: q.payment_terms || "",
      payment_terms_items: q.payment_terms_items || [],
      freight_terms: q.freight_terms || "",
      validity_days: q.validity_days,
      notes: q.notes || "",
      language: q.language || "pt-BR",
      hide_discount_value: q.hide_discount_value ?? false,
      hide_unit_prices: q.hide_unit_prices ?? false,
      grua_lanca_m: q.grua_lanca_m ?? null,
      grua_altura_torre_m: q.grua_altura_torre_m ?? null,
      grua_carga_maxima_kg: q.grua_carga_maxima_kg ?? null,
      grua_carga_ponta_kg: q.grua_carga_ponta_kg ?? null,
      grua_altura_trabalho_m: q.grua_altura_trabalho_m ?? null,
      selected_crane_id: crane?.product_id || "",
      selected_crane_name: crane?.product_name || "",
      selected_crane_code: crane?.product_code || "",
      // uma proposta antiga não tem os textos novos: eles precisam ser revisados; a nova já passou por isso
      texts_reviewed: isDetailed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceQuote]);

  // Status of the quote being edited (null when creating/duplicating)
  const originalStatus: string | null = editingQuoteId ? (sourceQuote?.status ?? null) : null;

  // Limite de desconto do operador — mesma regra da proposta de venda.
  // Antes, a locação gravava "desconto aprovado" sempre, sem checar o limite.
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { data: operatorRule } = useQuery({
    queryKey: ["discount-rules", "operator"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_rules")
        .select("*")
        .eq("role", "operator")
        .eq("requires_approval", false)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isAdmin,
  });
  const maxDiscount = isAdmin ? 100 : (operatorRule?.max_discount_percent || 0);
  const needsApproval = !isAdmin && wizard.data.discount_percent > maxDiscount;

  const saveMutation = useMutation({
    mutationFn: async (mode: "draft" | "finalized" | "keep" | "request_approval") => {
      const d = wizard.data;
      const months = d.rental_duration_months || 0;

      // Trava de segurança: acima do limite, só vai adiante como pedido de aprovação ou rascunho
      if (needsApproval && (mode === "finalized" || mode === "keep")) {
        throw new Error(`Desconto acima do limite (${maxDiscount}%). Envie para aprovação de um administrador.`);
      }
      if (mode === "request_approval" && !d.discount_justification.trim()) {
        throw new Error("Informe a justificativa do desconto para enviar para aprovação.");
      }
      if (!d.client_id) throw new Error("Escolha o cliente antes de salvar.");
      if (mode === "finalized" || mode === "keep") {
        const problems = rentalProblems({ client_id: d.client_id, months, lines: d.lines, data: d.rental, validity_days: d.validity_days });
        if (problems.length) throw new Error(problems[0]);
      }

      await supabase.auth.refreshSession();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Sessão expirada. Faça login novamente para salvar a proposta.");
      const userId = userData.user.id;

      // Banco sem as colunas das propostas detalhadas: grava no formato simples de antes (nada se perde, só os textos novos)
      const detailed = await detailedColumnsExist();
      const discountApproved = mode === "finalized" || mode === "keep" || (mode === "draft" && !needsApproval);
      const payload = buildRentalQuotePayload({ data: d, detailed, discountApproved });
      const rowsFor = (quoteId: string) => buildRentalRows(quoteId, { data: d, detailed });

      // "Enviar para aprovação" grava como rascunho e cria o pedido para um administrador
      const { quoteId, quoteNumber } = await saveQuoteWithItems(supabase, {
        mode: mode === "request_approval" ? "draft" : mode,
        editingQuoteId,
        originalStatus,
        userId,
        payload,
        rowsFor,
      });

      // Desconto acima do limite: cria o pedido de aprovação para um administrador (igual à venda)
      if (mode === "request_approval") {
        const { error: approvalError } = await supabase
          .from("discount_approval_requests")
          .insert({
            quote_id: quoteId,
            requested_by: userId,
            discount_percent: d.discount_percent,
            justification: d.discount_justification,
          });
        if (approvalError) throw approvalError;
      }

      return { quoteNumber, mode, detailed };
    },
    onSuccess: ({ quoteNumber, mode, detailed }) => {
      const isEdit = !!editingQuoteId;
      toast({
        title: mode === "request_approval"
          ? "Enviado para aprovação!"
          : mode === "keep"
          ? `Alteração salva (mantida como ${originalStatus === "finalized" ? "Finalizada" : "Rascunho"})`
          : mode === "finalized"
          ? (isEdit ? "Proposta de locação atualizada e finalizada!" : "Proposta de locação finalizada!")
          : (isEdit ? "Proposta de locação atualizada!" : "Rascunho de locação salvo!"),
        description: mode === "request_approval"
          ? `Proposta ${quoteNumber} aguardando aprovação de desconto.`
          : detailed
          ? `Número: ${quoteNumber}`
          : `Número: ${quoteNumber}. Salva no formato simples: o banco ainda não recebeu a atualização das propostas detalhadas.`,
      });
      queryClient.invalidateQueries({ queryKey: ["discount-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      wizard.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar proposta de locação",
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

  // Adapt StepClient props for rental wizard
  const stepClientData = {
    client_id: wizard.data.client_id,
    client_name: wizard.data.client_name,
    client_type: wizard.data.client_type,
  };

  return (
    <div className="space-y-6">
      <WizardHeader
        title={editingQuoteId ? "Editar proposta de locação" : duplicatingQuoteId ? "Duplicar proposta de locação" : "Nova proposta de locação"}
        steps={RENTAL_WIZARD_STEPS}
        current={wizard.step}
        onBack={onClose}
        onGoTo={wizard.goToStep}
      />

      <div className="min-h-[400px]">
        {wizard.step === 1 && (
          <StepClient
            data={stepClientData as any}
            updateData={(d: any) => wizard.updateData(d)}
            onNext={wizard.nextStep}
          />
        )}
        {wizard.step === 2 && (
          <RentalStepWork data={wizard.data} updateData={wizard.updateData} updateRental={wizard.updateRental} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 3 && (
          <RentalStepCrane data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 4 && (
          <RentalStepPrices
            data={wizard.data}
            months={wizard.months}
            totals={wizard.totals}
            updateData={wizard.updateData}
            updateLines={wizard.updateLines}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}
        {wizard.step === 5 && (
          <RentalStepTerms
            data={wizard.data}
            updateRental={wizard.updateRental}
            companies={companies || []}
            onCompanyChange={onCompanyChange}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}
        {wizard.step === 6 && (
          <RentalStepCommercial
            data={wizard.data}
            updateData={wizard.updateData}
            subtotal={wizard.subtotal}
            discountValue={wizard.discountValue}
            taxValue={wizard.taxValue}
            total={wizard.total}
            maxDiscount={maxDiscount}
            isAdmin={isAdmin}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}
        {wizard.step === 7 && (
          <RentalStepSummary data={wizard.data} months={wizard.months} totals={wizard.totals} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 8 && (
          <RentalStepReview
            data={wizard.data}
            total={wizard.total}
            updateData={wizard.updateData}
            onPrev={wizard.prevStep}
            onSaveDraft={() => saveMutation.mutate("draft")}
            onFinalize={() => saveMutation.mutate("finalized")}
            onSaveChanges={originalStatus === "finalized" ? () => saveMutation.mutate("keep") : undefined}
            needsApproval={needsApproval}
            onRequestApproval={() => saveMutation.mutate("request_approval")}
            isSaving={saveMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
