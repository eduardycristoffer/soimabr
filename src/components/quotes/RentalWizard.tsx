import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useRentalWizard, RENTAL_WIZARD_STEPS } from "@/hooks/useRentalWizard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";

import StepClient from "./steps/StepClient";
import RentalStepWork from "./rental-steps/RentalStepWork";
import RentalStepCrane from "./rental-steps/RentalStepCrane";
import RentalStepConfig from "./rental-steps/RentalStepConfig";
import RentalStepCommercial from "./rental-steps/RentalStepCommercial";
import RentalStepSummary from "./rental-steps/RentalStepSummary";
import RentalStepReview from "./rental-steps/RentalStepReview";

interface Props {
  onClose: () => void;
  editingQuoteId?: string | null;
  duplicatingQuoteId?: string | null;
}

export default function RentalWizard({ onClose, editingQuoteId, duplicatingQuoteId }: Props) {
  const queryClient = useQueryClient();
  const wizard = useRentalWizard();

  const sourceQuoteId = editingQuoteId || duplicatingQuoteId;

  // Load existing quote for editing/duplicating
  const { isLoading: isLoadingQuote } = useQuery({
    queryKey: ["rental-quote-source", sourceQuoteId],
    queryFn: async () => {
      if (!sourceQuoteId) return null;
      const { data: quote, error } = await supabase
        .from("quotes")
        .select("*, clients(razao_social, nome_fantasia, client_type)")
        .eq("id", sourceQuoteId)
        .single();
      if (error) throw error;
      const q = quote as any;
      wizard.updateData({
        client_id: quote.client_id,
        client_name: quote.clients?.nome_fantasia || quote.clients?.razao_social || "",
        client_type: quote.clients?.client_type || "nacional",
        project_name: quote.project_name || "",
        project_location: quote.project_location || "",
        rental_work_type: q.rental_work_type || "",
        rental_height_needed: q.rental_height_needed ?? null,
        rental_jib_needed: q.rental_jib_needed ?? null,
        rental_max_weight: q.rental_max_weight ?? null,
        rental_duration_months: q.rental_duration_months ?? null,
        rental_start_date: q.rental_start_date || "",
        rental_terrain_condition: q.rental_terrain_condition || "",
        rental_special_foundation: q.rental_special_foundation ?? false,
        rental_monthly_value: q.rental_monthly_value ?? null,
        rental_mobilization: q.rental_mobilization ?? 0,
        rental_demobilization: q.rental_demobilization ?? 0,
        rental_freight: q.rental_freight ?? 0,
        rental_assembly: q.rental_assembly ?? 0,
        rental_disassembly: q.rental_disassembly ?? 0,
        rental_operator_included: q.rental_operator_included ?? false,
        rental_maintenance_included: q.rental_maintenance_included ?? false,
        rental_insurance_included: q.rental_insurance_included ?? false,
        rental_technical_assistance: q.rental_technical_assistance ?? false,
        discount_percent: quote.discount_percent,
        rental_tax_percent: q.rental_tax_percent ?? 0,
        payment_terms: quote.payment_terms || "",
        payment_terms_items: q.payment_terms_items || [],
        freight_terms: quote.freight_terms || "",
        validity_days: quote.validity_days,
        notes: quote.notes || "",
        language: q.language || "pt-BR",
        hide_discount_value: q.hide_discount_value ?? false,
        hide_unit_prices: q.hide_unit_prices ?? false,
        // Crane data from quote
        grua_lanca_m: quote.grua_lanca_m ?? null,
        grua_altura_torre_m: quote.grua_altura_torre_m ?? null,
        grua_carga_maxima_kg: quote.grua_carga_maxima_kg ?? null,
        grua_carga_ponta_kg: quote.grua_carga_ponta_kg ?? null,
        grua_altura_trabalho_m: quote.grua_altura_trabalho_m ?? null,
      });

      // Try to find selected crane from items
      const { data: items } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", sourceQuoteId)
        .eq("product_category", "grua")
        .limit(1);

      if (items && items.length > 0) {
        const crane = items[0];
        wizard.updateData({
          selected_crane_id: crane.product_id || "",
          selected_crane_name: crane.product_name,
          selected_crane_code: crane.product_code,
        });
      }

      return quote;
    },
    enabled: !!sourceQuoteId,
  });

  const saveMutation = useMutation({
    mutationFn: async (mode: "draft" | "finalized") => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");
      const userId = session.session.user.id;
      const finalStatus = mode === "finalized" ? "finalized" : "draft";

      const quotePayload: Record<string, any> = {
        client_id: wizard.data.client_id,
        quote_type: "locacao",
        project_name: wizard.data.project_name || null,
        project_location: wizard.data.project_location || null,
        grua_lanca_m: wizard.data.grua_lanca_m ?? null,
        grua_altura_torre_m: wizard.data.grua_altura_torre_m ?? null,
        grua_carga_maxima_kg: wizard.data.grua_carga_maxima_kg ?? null,
        grua_carga_ponta_kg: wizard.data.grua_carga_ponta_kg ?? null,
        grua_altura_trabalho_m: wizard.data.grua_altura_trabalho_m ?? null,
        currency: wizard.data.currency,
        payment_terms: wizard.data.payment_terms || null,
        payment_terms_items: wizard.data.payment_terms_items,
        freight_terms: wizard.data.freight_terms || null,
        validity_days: wizard.data.validity_days,
        notes: wizard.data.notes || null,
        language: wizard.data.language,
        discount_percent: wizard.data.discount_percent,
        discount_value: wizard.discountValue,
        discount_approved: true,
        subtotal: wizard.subtotal,
        total: wizard.total,
        status: finalStatus as "draft" | "finalized",
        hide_discount_value: wizard.data.hide_discount_value,
        hide_unit_prices: wizard.data.hide_unit_prices,
        // Rental fields
        rental_duration_months: wizard.data.rental_duration_months,
        rental_monthly_value: wizard.data.rental_monthly_value,
        rental_mobilization: wizard.data.rental_mobilization,
        rental_demobilization: wizard.data.rental_demobilization,
        rental_freight: wizard.data.rental_freight,
        rental_assembly: wizard.data.rental_assembly,
        rental_disassembly: wizard.data.rental_disassembly,
        rental_operator_included: wizard.data.rental_operator_included,
        rental_maintenance_included: wizard.data.rental_maintenance_included,
        rental_insurance_included: wizard.data.rental_insurance_included,
        rental_technical_assistance: wizard.data.rental_technical_assistance,
        rental_start_date: wizard.data.rental_start_date || null,
        rental_terrain_condition: wizard.data.rental_terrain_condition || null,
        rental_special_foundation: wizard.data.rental_special_foundation,
        rental_work_type: wizard.data.rental_work_type || null,
        rental_height_needed: wizard.data.rental_height_needed,
        rental_jib_needed: wizard.data.rental_jib_needed,
        rental_max_weight: wizard.data.rental_max_weight,
        rental_tax_percent: wizard.data.rental_tax_percent,
      };

      let quoteId: string;
      let quoteNumber: string;

      if (editingQuoteId) {
        const { data: currentQuote } = await supabase
          .from("quotes")
          .select("*, quote_items(*)")
          .eq("id", editingQuoteId)
          .single();

        if (currentQuote) {
          const { count } = await supabase
            .from("quote_versions")
            .select("id", { count: "exact", head: true })
            .eq("quote_id", editingQuoteId);
          const userId2 = session.session!.user.id;
          await supabase.from("quote_versions").insert({
            quote_id: editingQuoteId,
            version_number: (count || 0) + 1,
            snapshot: currentQuote as any,
            edited_by: userId2,
          });
        }

        const { error: updateError } = await supabase
          .from("quotes")
          .update({
            ...quotePayload,
            finalized_at: finalStatus === "finalized" ? new Date().toISOString() : null,
          } as any)
          .eq("id", editingQuoteId);
        if (updateError) throw updateError;

        await supabase.from("quote_items").delete().eq("quote_id", editingQuoteId);
        quoteId = editingQuoteId;
        quoteNumber = currentQuote?.quote_number || "";
      } else {
        const { data: quote, error: quoteError } = await supabase
          .from("quotes")
          .insert({
            ...quotePayload,
            quote_number: "",
            created_by: userId,
            finalized_at: finalStatus === "finalized" ? new Date().toISOString() : null,
          } as any)
          .select("id, quote_number")
          .single();
        if (quoteError) throw quoteError;
        quoteId = quote.id;
        quoteNumber = quote.quote_number;
      }

      // Insert crane as a quote_item for reference
      if (wizard.data.selected_crane_id) {
        await supabase.from("quote_items").insert({
          quote_id: quoteId,
          product_id: wizard.data.selected_crane_id,
          product_code: wizard.data.selected_crane_code,
          product_name: wizard.data.selected_crane_name,
          product_category: "grua",
          unit_price: wizard.data.rental_monthly_value || 0,
          quantity: 1,
          total_price: wizard.data.rental_monthly_value || 0,
          order_index: 0,
          grua_lanca_m: wizard.data.grua_lanca_m,
          grua_altura_torre_m: wizard.data.grua_altura_torre_m,
          grua_carga_maxima_kg: wizard.data.grua_carga_maxima_kg,
          grua_carga_ponta_kg: wizard.data.grua_carga_ponta_kg,
          grua_altura_trabalho_m: wizard.data.grua_altura_trabalho_m,
        } as any);
      }

      return { quoteNumber, mode };
    },
    onSuccess: ({ quoteNumber, mode }) => {
      const isEdit = !!editingQuoteId;
      toast({
        title: mode === "finalized"
          ? (isEdit ? "Proposta de locação atualizada e finalizada!" : "Proposta de locação finalizada!")
          : (isEdit ? "Proposta de locação atualizada!" : "Rascunho de locação salvo!"),
        description: `Número: ${quoteNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      wizard.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar proposta de locação",
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

  // Adapt StepClient props for rental wizard
  const stepClientData = {
    client_id: wizard.data.client_id,
    client_name: wizard.data.client_name,
    client_type: wizard.data.client_type,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {editingQuoteId ? "Editar Proposta de Locação" : duplicatingQuoteId ? "Duplicar Proposta de Locação" : "Nova Proposta de Locação"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Etapa {wizard.step} de 7 — {RENTAL_WIZARD_STEPS[wizard.step - 1].description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {RENTAL_WIZARD_STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => { if (s.id < wizard.step) wizard.goToStep(s.id); }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              s.id === wizard.step
                ? "bg-primary text-primary-foreground"
                : s.id < wizard.step
                ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                : "bg-muted text-muted-foreground"
            )}
          >
            {s.id < wizard.step ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{s.id}</span>}
            {s.title}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {wizard.step === 1 && (
          <StepClient
            data={stepClientData as any}
            updateData={(d: any) => wizard.updateData(d)}
            onNext={wizard.nextStep}
          />
        )}
        {wizard.step === 2 && (
          <RentalStepWork data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 3 && (
          <RentalStepCrane data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 4 && (
          <RentalStepConfig data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 5 && (
          <RentalStepCommercial
            data={wizard.data}
            updateData={wizard.updateData}
            subtotal={wizard.subtotal}
            discountValue={wizard.discountValue}
            taxValue={wizard.taxValue}
            total={wizard.total}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}
        {wizard.step === 6 && (
          <RentalStepSummary
            data={wizard.data}
            rentalSubtotal={wizard.rentalSubtotal}
            additionalCosts={wizard.additionalCosts}
            subtotal={wizard.subtotal}
            discountValue={wizard.discountValue}
            taxValue={wizard.taxValue}
            total={wizard.total}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}
        {wizard.step === 7 && (
          <RentalStepReview
            data={wizard.data}
            total={wizard.total}
            onPrev={wizard.prevStep}
            onSaveDraft={() => saveMutation.mutate("draft")}
            onFinalize={() => saveMutation.mutate("finalized")}
            isSaving={saveMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
