import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQuoteWizard, WIZARD_STEPS } from "@/hooks/useQuoteWizard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";

import StepClient from "./steps/StepClient";
import StepProject from "./steps/StepProject";
import StepEquipment from "./steps/StepEquipment";
import StepComponents from "./steps/StepComponents";
import StepAccessories from "./steps/StepAccessories";
import StepCommercial from "./steps/StepCommercial";
import StepDiscount from "./steps/StepDiscount";
import StepReview from "./steps/StepReview";

interface Props {
  onClose: () => void;
}

export default function QuoteWizard({ onClose }: Props) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();
  const wizard = useQuoteWizard();

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

      // Generate quote number
      const year = new Date().getFullYear().toString().slice(2);
      const { count } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true });
      const seq = String((count || 0) + 1).padStart(4, "0");
      const quoteNumber = `ORC${year}${seq}`;

      const discountApproved = mode === "finalized" || (mode === "draft" && !needsApproval);

      // Insert quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          client_id: wizard.data.client_id,
          created_by: userId,
          project_name: wizard.data.project_name || null,
          project_location: wizard.data.project_location || null,
          currency: wizard.data.currency,
          delivery_time: wizard.data.delivery_time || null,
          payment_terms: wizard.data.payment_terms || null,
          freight_terms: wizard.data.freight_terms || null,
          validity_days: wizard.data.validity_days,
          notes: wizard.data.notes || null,
          discount_percent: wizard.data.discount_percent,
          discount_value: wizard.discountValue,
          discount_approved: discountApproved,
          subtotal: wizard.subtotal,
          total: wizard.total,
          status: finalStatus as "draft" | "finalized",
          finalized_at: finalStatus === "finalized" ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (quoteError) throw quoteError;

      // Insert items
      const allItems = [
        ...wizard.data.equipment,
        ...wizard.data.components,
        ...wizard.data.accessories,
      ];

      if (allItems.length > 0) {
        const items = allItems.map((item, index) => ({
          quote_id: quote.id,
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          product_category: item.product_category,
          unit_price: item.unit_price,
          quantity: item.quantity,
          total_price: item.total_price,
          order_index: index,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(items);

        if (itemsError) throw itemsError;
      }

      // If requesting approval, create approval request
      if (mode === "request_approval") {
        const { error: approvalError } = await supabase
          .from("discount_approval_requests")
          .insert({
            quote_id: quote.id,
            requested_by: userId,
            discount_percent: wizard.data.discount_percent,
            justification: wizard.data.discount_justification,
          });

        if (approvalError) throw approvalError;
      }

      return { quoteNumber, mode };
    },
    onSuccess: ({ quoteNumber, mode }) => {
      const messages = {
        finalized: { title: "Proposta finalizada!", description: `Número: ${quoteNumber}` },
        draft: { title: "Rascunho salvo!", description: `Número: ${quoteNumber}` },
        request_approval: { title: "Enviado para aprovação!", description: `Proposta ${quoteNumber} aguardando aprovação de desconto.` },
      };
      toast(messages[mode]);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["discount-approvals"] });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Proposta Comercial</h1>
          <p className="text-sm text-muted-foreground">
            Etapa {wizard.step} de 8 — {WIZARD_STEPS[wizard.step - 1].description}
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
          <StepEquipment data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 4 && (
          <StepComponents data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 5 && (
          <StepAccessories data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 6 && (
          <StepCommercial data={wizard.data} updateData={wizard.updateData} onNext={wizard.nextStep} onPrev={wizard.prevStep} />
        )}
        {wizard.step === 7 && (
          <StepDiscount
            data={wizard.data}
            updateData={wizard.updateData}
            subtotal={wizard.subtotal}
            discountValue={wizard.discountValue}
            total={wizard.total}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}
        {wizard.step === 8 && (
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
          />
        )}
      </div>
    </div>
  );
}
