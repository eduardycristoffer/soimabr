import { QuoteWizardData } from "@/hooks/useQuoteWizard";
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
  const hasGrua = data.equipment.length > 0;

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

      {hasGrua && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Especificações Técnicas da Grua</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grua_lanca_m">Lança (m)</Label>
                <Input
                  id="grua_lanca_m"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 36"
                  value={data.grua_lanca_m ?? ""}
                  onChange={(e) => updateData({ grua_lanca_m: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grua_altura_torre_m">Altura da torre (m)</Label>
                <Input
                  id="grua_altura_torre_m"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 27"
                  value={data.grua_altura_torre_m ?? ""}
                  onChange={(e) => updateData({ grua_altura_torre_m: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grua_carga_maxima_kg">Carga máxima (kg)</Label>
                <Input
                  id="grua_carga_maxima_kg"
                  type="number"
                  step="1"
                  placeholder="Ex: 6000"
                  value={data.grua_carga_maxima_kg ?? ""}
                  onChange={(e) => updateData({ grua_carga_maxima_kg: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grua_carga_ponta_kg">Carga na ponta (kg)</Label>
                <Input
                  id="grua_carga_ponta_kg"
                  type="number"
                  step="1"
                  placeholder="Ex: 1400"
                  value={data.grua_carga_ponta_kg ?? ""}
                  onChange={(e) => updateData({ grua_carga_ponta_kg: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
