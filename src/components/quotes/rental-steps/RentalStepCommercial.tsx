import { RentalWizardData } from "@/hooks/useRentalWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  data: RentalWizardData;
  updateData: (d: Partial<RentalWizardData>) => void;
  subtotal: number;
  discountValue: number;
  taxValue: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
}

export default function RentalStepCommercial({ data, updateData, subtotal, discountValue, taxValue, total, onNext, onPrev }: Props) {
  const addPaymentItem = () => {
    updateData({ payment_terms_items: [...data.payment_terms_items, { text: "" }] });
  };

  const removePaymentItem = (index: number) => {
    const items = [...data.payment_terms_items];
    items.splice(index, 1);
    updateData({ payment_terms_items: items });
  };

  const updatePaymentItem = (index: number, text: string) => {
    const items = [...data.payment_terms_items];
    items[index] = { text };
    updateData({ payment_terms_items: items });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Impostos (%)</Label>
          <Input
            type="number" min="0" max="100" step="0.1"
            value={data.rental_tax_percent || ""}
            onChange={(e) => updateData({ rental_tax_percent: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Validade (dias)</Label>
          <Input
            type="number" min="1"
            value={data.validity_days}
            onChange={(e) => updateData({ validity_days: parseInt(e.target.value) || 30 })}
          />
        </div>
      </div>

      {/* Preview totals */}
      <div className="bg-accent/30 rounded-lg p-4 space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
        {data.rental_tax_percent > 0 && (
          <div className="flex justify-between text-muted-foreground"><span>Impostos ({data.rental_tax_percent}%)</span><span>+R$ {taxValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
        )}
        <div className="flex justify-between font-bold text-lg text-primary border-t pt-2"><span>Total</span><span>R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Condições de Pagamento</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPaymentItem}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
        {data.payment_terms_items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) => updatePaymentItem(idx, e.target.value)}
              placeholder="Ex: 50% entrada, 50% na montagem"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => removePaymentItem(idx)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          value={data.notes}
          onChange={(e) => updateData({ notes: e.target.value })}
          placeholder="Observações adicionais..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Idioma da Proposta</Label>
          <Select value={data.language} onValueChange={(v) => updateData({ language: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox checked={data.hide_discount_value} onCheckedChange={(v) => updateData({ hide_discount_value: !!v })} />
          <Label className="cursor-pointer text-sm">Esconder valor do desconto no PDF</Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox checked={data.hide_unit_prices} onCheckedChange={(v) => updateData({ hide_unit_prices: !!v })} />
          <Label className="cursor-pointer text-sm">Esconder valores unitários no PDF</Label>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext}>Próximo</Button>
      </div>
    </div>
  );
}
