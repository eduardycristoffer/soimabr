import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { dispatchWebhookEvent } from "@/lib/dispatchWebhook";
import { useQuoteWizard, WIZARD_STEPS, QuoteWizardData, QuoteItemDraft } from "@/hooks/useQuoteWizard";
import { useUsdBrlRate } from "@/hooks/useUsdBrlRate";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";

import StepClient from "./steps/StepClient";
import StepProject from "./steps/StepProject";
import StepEquipment from "./steps/StepEquipment";
import StepComponents from "./steps/StepComponents";
import StepAccessories from "./steps/StepAccessories";
import StepTechnical from "./steps/StepTechnical";
import StepCommercial from "./steps/StepCommercial";
import StepDiscount from "./steps/StepDiscount";
import StepReview from "./steps/StepReview";

interface Props {
  onClose: () => void;
  editingQuoteId?: string | null;
  duplicatingQuoteId?: string | null;
}

export default function QuoteWizard({ onClose, editingQuoteId, duplicatingQuoteId }: Props) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();
  const wizard = useQuoteWizard();

  const isInternationalUsd = wizard.data.client_type === "internacional" && wizard.data.currency === "USD";
  const { rate: usdBrlRate, lastUpdatedAt: usdBrlLastUpdated, isStale: isRateStale } = useUsdBrlRate(isInternationalUsd);

  const sourceQuoteId = editingQuoteId || duplicatingQuoteId;

  // Load existing quote data for editing or duplicating
  const { isLoading: isLoadingQuote } = useQuery({
    queryKey: ["quote-source", sourceQuoteId],
    queryFn: async () => {
      if (!sourceQuoteId) return null;
      const { data: quote, error } = await supabase
        .from("quotes")
        .select("*, clients(razao_social, nome_fantasia, client_type)")
        .eq("id", sourceQuoteId)
        .single();
      if (error) throw error;

      const { data: items } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", sourceQuoteId)
        .order("order_index");

      // Map items to draft format
      const mapItems = (cats: string[]): QuoteItemDraft[] =>
        (items || [])
          .filter((i: any) => cats.includes(i.product_category))
          .map((i: any) => ({
            product_id: i.product_id || i.id,
            product_code: i.product_code,
            product_name: i.product_name,
            product_category: i.product_category,
            unit_price: i.unit_price,
            quantity: i.quantity,
            total_price: i.total_price,
            notes: i.notes || undefined,
            grua_lanca_m: i.grua_lanca_m ?? null,
            grua_altura_torre_m: i.grua_altura_torre_m ?? null,
            grua_carga_maxima_kg: i.grua_carga_maxima_kg ?? null,
            grua_carga_ponta_kg: i.grua_carga_ponta_kg ?? null,
            grua_altura_trabalho_m: i.grua_altura_trabalho_m ?? null,
          }));

      // Load panel items
      const { data: panelItems } = await supabase
        .from("quote_panel_items")
        .select("*")
        .eq("quote_id", sourceQuoteId)
        .order("order_index");

      const panelItemsDraft = (panelItems || []).map((pi: any) => ({
        text: pi.item_text,
        order: pi.order_index,
      }));

      const q = quote as any;
      wizard.updateData({
        client_id: quote.client_id,
        client_name: quote.clients?.nome_fantasia || quote.clients?.razao_social || "",
        client_type: quote.clients?.client_type || "nacional",
        project_name: quote.project_name || "",
        project_location: quote.project_location || "",
        equipment: mapItems(["grua"]),
        components: mapItems(["configuracao", "torre", "tramo", "chassis"]),
        accessories: mapItems(["acessorio"]),
        grua_lanca_m: null,
        grua_altura_torre_m: null,
        grua_carga_maxima_kg: null,
        grua_carga_ponta_kg: null,
        grua_altura_trabalho_m: null,
        // Technical fields
        spec_override_enabled: q.spec_override_enabled ?? false,
        spec_tipo: q.spec_tipo || "",
        spec_vel_elevacao: q.spec_vel_elevacao || "",
        spec_vel_rotacao: q.spec_vel_rotacao || "",
        spec_vel_translacao: q.spec_vel_translacao || "",
        panel_items: panelItemsDraft,
        panel_voltage: q.panel_voltage || "380",
        panel_include_motors: q.panel_include_motors ?? false,
        panel_motor_elev_kw: q.panel_motor_elev_kw ?? null,
        panel_motor_elev_hp: q.panel_motor_elev_hp ?? null,
        panel_motor_elev_vel: q.panel_motor_elev_vel || "",
        panel_motor_trans_kw: q.panel_motor_trans_kw ?? null,
        panel_motor_trans_hp: q.panel_motor_trans_hp ?? null,
        panel_motor_trans_vel: q.panel_motor_trans_vel || "",
        panel_motor_rot_kw: q.panel_motor_rot_kw ?? null,
        panel_motor_rot_hp: q.panel_motor_rot_hp ?? null,
        panel_motor_rot_vel: q.panel_motor_rot_vel || "",
        warranty_struct_years: q.warranty_struct_years ?? 3,
        warranty_components_years: q.warranty_components_years ?? 1,
        // Commercial
        currency: quote.currency,
        delivery_time: quote.delivery_time || "",
        payment_terms: quote.payment_terms || "",
        payment_terms_items: (quote as any).payment_terms_items || [],
        freight_terms: quote.freight_terms || "",
        validity_days: quote.validity_days,
        notes: quote.notes || "",
        language: q.language || "pt-BR",
        discount_percent: quote.discount_percent,
        discount_justification: "",
        usd_brl_rate_used: q.usd_brl_rate_used ?? null,
        usd_brl_rate_updated_at: q.usd_brl_rate_updated_at ?? null,
      });

      return quote;
    },
    enabled: !!sourceQuoteId,
  });

  // Fetch operator discount limit
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
    mutationFn: async (mode: "draft" | "finalized" | "request_approval") => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      const userId = session.session.user.id;
      const finalStatus = mode === "finalized" ? "finalized" : "draft";
      const discountApproved = mode === "finalized" || (mode === "draft" && !needsApproval);

      // Copy specs from first grua for backward compat with quotes table
      const firstGrua = wizard.data.equipment[0];
      const quotePayload: Record<string, any> = {
        client_id: wizard.data.client_id,
        project_name: wizard.data.project_name || null,
        project_location: wizard.data.project_location || null,
        grua_lanca_m: firstGrua?.grua_lanca_m ?? null,
        grua_altura_torre_m: firstGrua?.grua_altura_torre_m ?? null,
        grua_carga_maxima_kg: firstGrua?.grua_carga_maxima_kg ?? null,
        grua_carga_ponta_kg: firstGrua?.grua_carga_ponta_kg ?? null,
        grua_altura_trabalho_m: firstGrua?.grua_altura_trabalho_m ?? null,
        currency: wizard.data.currency,
        delivery_time: wizard.data.delivery_time || null,
        payment_terms: wizard.data.payment_terms || null,
        freight_terms: wizard.data.freight_terms || null,
        validity_days: wizard.data.validity_days,
        notes: wizard.data.notes || null,
        language: wizard.data.language,
        discount_percent: wizard.data.discount_percent,
        discount_value: wizard.discountValue,
        discount_approved: discountApproved,
        subtotal: wizard.subtotal,
        total: wizard.total,
        status: finalStatus as "draft" | "finalized",
        // Technical fields
        spec_override_enabled: wizard.data.spec_override_enabled,
        spec_tipo: wizard.data.spec_tipo || null,
        spec_vel_elevacao: wizard.data.spec_vel_elevacao || null,
        spec_vel_rotacao: wizard.data.spec_vel_rotacao || null,
        spec_vel_translacao: wizard.data.spec_vel_translacao || null,
        panel_voltage: wizard.data.panel_voltage || "380",
        panel_include_motors: wizard.data.panel_include_motors,
        panel_motor_elev_kw: wizard.data.panel_motor_elev_kw ?? null,
        panel_motor_elev_hp: wizard.data.panel_motor_elev_hp ?? null,
        panel_motor_elev_vel: wizard.data.panel_motor_elev_vel || null,
        panel_motor_trans_kw: wizard.data.panel_motor_trans_kw ?? null,
        panel_motor_trans_hp: wizard.data.panel_motor_trans_hp ?? null,
        panel_motor_trans_vel: wizard.data.panel_motor_trans_vel || null,
        panel_motor_rot_kw: wizard.data.panel_motor_rot_kw ?? null,
        panel_motor_rot_hp: wizard.data.panel_motor_rot_hp ?? null,
        panel_motor_rot_vel: wizard.data.panel_motor_rot_vel || null,
        warranty_struct_years: wizard.data.warranty_struct_years,
        warranty_components_years: wizard.data.warranty_components_years,
        payment_terms_items: wizard.data.payment_terms_items,
        hide_discount_value: wizard.data.hide_discount_value,
      };

      // Save USD rate for international quotes
      if (isInternationalUsd && usdBrlRate) {
        quotePayload.usd_brl_rate_used = usdBrlRate;
        quotePayload.usd_brl_rate_updated_at = usdBrlLastUpdated || new Date().toISOString();
      }

      let quoteId: string;
      let quoteNumber: string;

      if (editingQuoteId) {
        // Save version snapshot before updating
        const { data: currentQuote } = await supabase
          .from("quotes")
          .select("*, quote_items(*)")
          .eq("id", editingQuoteId)
          .single();

        if (currentQuote) {
          // Count existing versions
          const { count } = await supabase
            .from("quote_versions")
            .select("id", { count: "exact", head: true })
            .eq("quote_id", editingQuoteId);

          await supabase.from("quote_versions").insert({
            quote_id: editingQuoteId,
            version_number: (count || 0) + 1,
            snapshot: currentQuote as any,
            edited_by: userId,
          });
        }

        // Update quote
        const { error: updateError } = await supabase
          .from("quotes")
          .update({
            ...quotePayload,
            finalized_at: finalStatus === "finalized" ? new Date().toISOString() : null,
          } as any)
          .eq("id", editingQuoteId);
        if (updateError) throw updateError;

        // Delete old items and re-insert
        await supabase.from("quote_items").delete().eq("quote_id", editingQuoteId);
        await supabase.from("quote_panel_items").delete().eq("quote_id", editingQuoteId);

        quoteId = editingQuoteId;
        quoteNumber = currentQuote?.quote_number || "";
      } else {
        // Insert new quote (quote_number generated by trigger)
        const { data: quote, error: quoteError } = await supabase
          .from("quotes")
          .insert({
            ...quotePayload,
            quote_number: "", // Empty string triggers auto-generation
            created_by: userId,
            finalized_at: finalStatus === "finalized" ? new Date().toISOString() : null,
          } as any)
          .select("id, quote_number")
          .single();

        if (quoteError) throw quoteError;
        quoteId = quote.id;
        quoteNumber = quote.quote_number;
      }

      // Insert items
      const allItems = [
        ...wizard.data.equipment,
        ...wizard.data.components,
        ...wizard.data.accessories,
      ];

      if (allItems.length > 0) {
        const items = allItems.map((item, index) => ({
          quote_id: quoteId,
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          product_category: item.product_category,
          unit_price: item.unit_price,
          quantity: item.quantity,
          total_price: item.total_price,
          order_index: index,
          notes: item.notes || null,
          grua_lanca_m: item.product_category === "grua" ? (item.grua_lanca_m ?? null) : null,
          grua_altura_torre_m: item.product_category === "grua" ? (item.grua_altura_torre_m ?? null) : null,
          grua_carga_maxima_kg: item.product_category === "grua" ? (item.grua_carga_maxima_kg ?? null) : null,
          grua_carga_ponta_kg: item.product_category === "grua" ? (item.grua_carga_ponta_kg ?? null) : null,
          grua_altura_trabalho_m: item.product_category === "grua" ? (item.grua_altura_trabalho_m ?? null) : null,
          international_unit_price_brl: isInternationalUsd ? item.unit_price : null,
        }));

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(items as any);

        if (itemsError) throw itemsError;
      }

      // Insert panel items
      if (wizard.data.panel_items.length > 0) {
        const panelItems = wizard.data.panel_items.map((item, index) => ({
          quote_id: quoteId,
          item_text: item.text,
          order_index: index,
        }));

        const { error: panelError } = await supabase
          .from("quote_panel_items")
          .insert(panelItems as any);

        if (panelError) throw panelError;
      }

      // If requesting approval, create approval request
      if (mode === "request_approval") {
        const { error: approvalError } = await supabase
          .from("discount_approval_requests")
          .insert({
            quote_id: quoteId,
            requested_by: userId,
            discount_percent: wizard.data.discount_percent,
            justification: wizard.data.discount_justification,
          });

        if (approvalError) throw approvalError;
      }

      // === AUTO-SYNC: Create or update pipeline card for this quote ===
      try {
        // Find the "Proposta" stage (stage_type = 'proposal')
        const { data: proposalStage } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("stage_type", "proposal")
          .single();

        if (proposalStage) {
          // Check if client already has a lead in the pipeline
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("client_id", wizard.data.client_id)
            .limit(1)
            .maybeSingle();

          if (existingLead) {
            // Update existing lead: move to "Proposta" stage and link quote
            await supabase
              .from("leads")
              .update({
                stage_id: proposalStage.id,
                quote_id: quoteId,
                estimated_value: wizard.total,
              } as any)
              .eq("id", existingLead.id);
          } else {
            // Create new lead at "Proposta" stage
            // Fetch client name for the lead title
            const { data: clientInfo } = await supabase
              .from("clients")
              .select("razao_social, nome_fantasia, contato_nome, contato_email, contato_telefone")
              .eq("id", wizard.data.client_id)
              .single();

            await supabase.from("leads").insert({
              title: `Proposta ${quoteNumber} - ${clientInfo?.nome_fantasia || clientInfo?.razao_social || ""}`,
              company_name: clientInfo?.razao_social || null,
              contact_name: clientInfo?.contato_nome || null,
              contact_email: clientInfo?.contato_email || null,
              contact_phone: clientInfo?.contato_telefone || null,
              estimated_value: wizard.total,
              owner_id: userId,
              stage_id: proposalStage.id,
              client_id: wizard.data.client_id,
              quote_id: quoteId,
              source: "manual",
              lead_origin: "proposal_direct",
            } as any);
          }
        }
      } catch (pipelineErr) {
        // Non-blocking: log but don't fail the quote save
        console.error("Erro ao sincronizar pipeline:", pipelineErr);
      }

      return { quoteNumber, mode };
    },
    onSuccess: ({ quoteNumber, mode }) => {
      const isEdit = !!editingQuoteId;
      const messages = {
        finalized: { title: isEdit ? "Proposta atualizada e finalizada!" : "Proposta finalizada!", description: `Número: ${quoteNumber}` },
        draft: { title: isEdit ? "Proposta atualizada!" : "Rascunho salvo!", description: `Número: ${quoteNumber}` },
        request_approval: { title: "Enviado para aprovação!", description: `Proposta ${quoteNumber} aguardando aprovação de desconto.` },
      };
      toast(messages[mode]);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["discount-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });

      // Dispatch webhook events
      const eventType = isEdit ? "proposal.created" : "proposal.created";
      dispatchWebhookEvent(eventType, { quote_number: quoteNumber, client_id: wizard.data.client_id, total: wizard.total });
      if (mode === "finalized") {
        dispatchWebhookEvent("proposal.finalized", { quote_number: quoteNumber, client_id: wizard.data.client_id, total: wizard.total });
      }

      wizard.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar proposta",
        description: error.message,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {editingQuoteId ? "Editar Proposta Comercial" : duplicatingQuoteId ? "Duplicar Proposta Comercial" : "Nova Proposta Comercial"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Etapa {wizard.step} de 9 — {WIZARD_STEPS[wizard.step - 1].description}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {WIZARD_STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              if (s.id < wizard.step) wizard.goToStep(s.id);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              s.id === wizard.step
                ? "bg-primary text-primary-foreground"
                : s.id < wizard.step
                ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                : "bg-muted text-muted-foreground"
            )}
          >
            {s.id < wizard.step ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="text-[10px]">{s.id}</span>
            )}
            {s.title}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {wizard.step === 1 && (
          <StepClient data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} />
        )}
        {wizard.step === 2 && (
          <StepProject data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 3 && (
          <StepEquipment
            data={wizard.data} updateData={wizard.updateData}
            onNext={wizard.nextStep} onPrev={wizard.prevStep}
            isInternationalUsd={isInternationalUsd} usdBrlRate={usdBrlRate}
          />
        )}
        {wizard.step === 4 && (
          <StepComponents
            data={wizard.data} updateData={wizard.updateData}
            onNext={wizard.nextStep} onPrev={wizard.prevStep}
            isInternationalUsd={isInternationalUsd} usdBrlRate={usdBrlRate}
          />
        )}
        {wizard.step === 5 && (
          <StepAccessories
            data={wizard.data} updateData={wizard.updateData}
            onNext={wizard.nextStep} onPrev={wizard.prevStep}
            isInternationalUsd={isInternationalUsd} usdBrlRate={usdBrlRate}
          />
        )}
        {wizard.step === 6 && (
          <StepTechnical data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 7 && (
          <StepCommercial data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 8 && (
          <StepDiscount
            data={wizard.data}
            updateData={wizard.updateData}
            subtotal={wizard.subtotal}
            discountValue={wizard.discountValue}
            total={wizard.total}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
            isInternationalUsd={isInternationalUsd}
            usdBrlRate={usdBrlRate}
          />
        )}
        {wizard.step === 9 && (
          <StepReview
            data={wizard.data}
            subtotal={wizard.subtotal}
            discountValue={wizard.discountValue}
            total={wizard.total}
            onPrev={wizard.prevStep}
            onSaveDraft={() => saveMutation.mutate("draft")}
            onFinalize={() => saveMutation.mutate("finalized")}
            onRequestApproval={() => saveMutation.mutate("request_approval")}
            needsApproval={needsApproval}
            isSaving={saveMutation.isPending}
            usdBrlRate={usdBrlRate}
            usdBrlLastUpdated={usdBrlLastUpdated}
            isRateStale={isRateStale}
          />
        )}
      </div>
    </div>
  );
}
