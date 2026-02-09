import { QuoteWizardData } from "@/hooks/useQuoteWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Currency } from "@/types";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepCommercial({ data, updateData, onNext, onPrev }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Moeda</Label>
          <Select value={data.currency} onValueChange={(v) => updateData({ currency: v as Currency })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">🇧🇷 Real (BRL)</SelectItem>
              <SelectItem value="USD">🇺🇸 Dólar (USD)</SelectItem>
              <SelectItem value="EUR">🇪🇺 Euro (EUR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Validade (dias)</Label>
          <Input
            type="number"
            min={1}
            value={data.validity_days}
            onChange={(e) => updateData({ validity_days: parseInt(e.target.value) || 30 })}
          />
        </div>

        <div className="space-y-2">
          <Label>Prazo de Entrega</Label>
          <Input
            placeholder="Ex: 90 dias úteis após aprovação"
            value={data.delivery_time}
            onChange={(e) => updateData({ delivery_time: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Condições de Pagamento</Label>
          <Input
            placeholder="Ex: 30/60/90 dias"
            value={data.payment_terms}
            onChange={(e) => updateData({ payment_terms: e.target.value })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Frete</Label>
          <Input
            placeholder="Ex: CIF destino, FOB fábrica"
            value={data.freight_terms}
            onChange={(e) => updateData({ freight_terms: e.target.value })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Observações</Label>
          <Textarea
            placeholder="Notas adicionais da proposta..."
            className="resize-none"
            rows={3}
            value={data.notes}
            onChange={(e) => updateData({ notes: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext}>Próximo</Button>
      </div>
    </div>
  );
}
