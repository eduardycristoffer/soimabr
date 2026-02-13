import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QuoteWizardData } from "@/hooks/useQuoteWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Send, Info } from "lucide-react";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  subtotal: number;
  discountValue: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  isInternationalUsd?: boolean;
  usdBrlRate?: number | null;
}

export default function StepDiscount({ data, updateData, subtotal, discountValue, total, onNext, onPrev, isInternationalUsd, usdBrlRate }: Props) {
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
  const exceedsMax = !isAdmin && data.discount_percent > maxDiscount;
  const needsJustification = exceedsMax && !data.discount_justification.trim();

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const showDualCurrency = isInternationalUsd && usdBrlRate && usdBrlRate > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Desconto (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={data.discount_percent}
              onChange={(e) => updateData({ discount_percent: Math.max(0, parseFloat(e.target.value) || 0) })}
            />
          </div>

          {exceedsMax && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-800">
              <Send className="h-4 w-4" />
              <AlertDescription>
                Desconto acima do limite ({maxDiscount}%). Será necessária aprovação de um administrador.
              </AlertDescription>
            </Alert>
          )}

          {exceedsMax && (
            <div className="space-y-2">
              <Label>Justificativa (obrigatório)</Label>
              <Textarea
                placeholder="Explique o motivo do desconto acima do limite..."
                value={data.discount_justification}
                onChange={(e) => updateData({ discount_justification: e.target.value })}
                rows={3}
              />
            </div>
          )}

          {!exceedsMax && data.discount_percent > 0 && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                {isAdmin
                  ? "Admin: desconto livre, sem restrições."
                  : `Desconto dentro do limite (${maxDiscount}%).`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-semibold">Resumo de Valores</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <div className="text-right">
                <span className="font-medium">{formatBRL(subtotal)}</span>
                {showDualCurrency && (
                  <span className="text-xs text-muted-foreground block">
                    ≈ {formatUSD(subtotal / usdBrlRate)}
                  </span>
                )}
              </div>
            </div>
            {data.discount_percent > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto ({data.discount_percent}%)</span>
                <div className="text-right">
                  <span className="font-medium">-{formatBRL(discountValue)}</span>
                  {showDualCurrency && (
                    <span className="text-xs text-muted-foreground block">
                      ≈ -{formatUSD(discountValue / usdBrlRate)}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base">
              <span className="font-semibold">Total</span>
              <div className="text-right">
                <span className="font-bold">{formatBRL(total)}</span>
                {showDualCurrency && (
                  <span className="text-xs text-muted-foreground block">
                    ≈ {formatUSD(total / usdBrlRate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {showDualCurrency && (
            <div className="flex items-start gap-1.5 pt-2 border-t text-xs text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                Valor em USD estimado com base na cotação do dia (1 USD = R$ {usdBrlRate.toFixed(4)}).
                O valor final pode variar conforme a cotação no momento do pagamento.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={needsJustification}>Próximo</Button>
      </div>
    </div>
  );
}
