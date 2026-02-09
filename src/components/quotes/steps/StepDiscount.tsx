import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QuoteWizardData } from "@/hooks/useQuoteWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, ShieldCheck } from "lucide-react";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  subtotal: number;
  discountValue: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepDiscount({ data, updateData, subtotal, discountValue, total, onNext, onPrev }: Props) {
  const { role } = useAuth();

  const { data: rules } = useQuery({
    queryKey: ["discount-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_rules")
        .select("*")
        .order("max_discount_percent");
      if (error) throw error;
      return data;
    },
  });

  const myRules = rules?.filter((r) => r.role === role) || [];
  const maxNoApproval = myRules.find((r) => !r.requires_approval)?.max_discount_percent || 0;
  const maxWithApproval = myRules.find((r) => r.requires_approval)?.max_discount_percent || maxNoApproval;
  const needsApproval = data.discount_percent > maxNoApproval && data.discount_percent <= maxWithApproval;
  const exceedsMax = data.discount_percent > maxWithApproval;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: data.currency }).format(value);

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

          {/* Rules info */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Seus limites ({role}):</p>
            {myRules.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <Badge variant={r.requires_approval ? "secondary" : "default"} className="text-[10px]">
                  {r.requires_approval ? "Com aprovação" : "Sem aprovação"}
                </Badge>
                <span>até {r.max_discount_percent}%</span>
              </div>
            ))}
          </div>

          {needsApproval && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Desconto de {data.discount_percent}% requer aprovação de um administrador.
              </AlertDescription>
            </Alert>
          )}

          {exceedsMax && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Desconto de {data.discount_percent}% excede o limite máximo de {maxWithApproval}% para seu perfil.
              </AlertDescription>
            </Alert>
          )}

          {!needsApproval && !exceedsMax && data.discount_percent > 0 && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Desconto dentro do limite aprovado automaticamente.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-semibold">Resumo de Valores</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {data.discount_percent > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto ({data.discount_percent}%)</span>
                <span className="font-medium">-{formatCurrency(discountValue)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={exceedsMax}>Próximo</Button>
      </div>
    </div>
  );
}
