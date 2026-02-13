import { QuoteWizardData, QuoteItemDraft } from "@/hooks/useQuoteWizard";
import ProductPicker from "./ProductPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepEquipment({ data, updateData, onNext, onPrev }: Props) {
  const updateEquipmentItem = (index: number, field: keyof QuoteItemDraft, value: number | null) => {
    const updated = [...data.equipment];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ equipment: updated });
  };

  return (
    <div className="space-y-6">
      <ProductPicker
        categories={["grua"]}
        items={data.equipment}
        onItemsChange={(items) => updateData({ equipment: items })}
        title="Selecione a grua principal"
        onNext={onNext}
        onPrev={onPrev}
        currency={data.currency}
        hideNav
      />

      {data.equipment.map((item, idx) => (
        <Card key={item.product_id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{item.product_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lança (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 36"
                  value={item.grua_lanca_m ?? ""}
                  onChange={(e) => updateEquipmentItem(idx, "grua_lanca_m", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura da torre (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 27"
                  value={item.grua_altura_torre_m ?? ""}
                  onChange={(e) => updateEquipmentItem(idx, "grua_altura_torre_m", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Carga máxima (kg)</Label>
                <Input
                  type="number"
                  step="1"
                  placeholder="Ex: 6000"
                  value={item.grua_carga_maxima_kg ?? ""}
                  onChange={(e) => updateEquipmentItem(idx, "grua_carga_maxima_kg", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Carga na ponta (kg)</Label>
                <Input
                  type="number"
                  step="1"
                  placeholder="Ex: 1400"
                  value={item.grua_carga_ponta_kg ?? ""}
                  onChange={(e) => updateEquipmentItem(idx, "grua_carga_ponta_kg", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura de Trabalho (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 30"
                  value={item.grua_altura_trabalho_m ?? ""}
                  onChange={(e) => updateEquipmentItem(idx, "grua_altura_trabalho_m", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onPrev} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
          Voltar
        </button>
        <button type="button" onClick={onNext} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          Próximo
        </button>
      </div>
    </div>
  );
}
