import { RentalWizardData } from "@/hooks/useRentalWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface Props {
  data: RentalWizardData;
  updateData: (d: Partial<RentalWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function RentalStepConfig({ data, updateData, onNext, onPrev }: Props) {
  const numVal = (v: number | null | undefined) => (v === null || v === undefined ? "" : v);

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-semibold text-primary">Valores da Locação</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tempo de Locação (meses) *</Label>
            <Input
              type="number" min="1" placeholder="Ex: 12"
              value={numVal(data.rental_duration_months)}
              onChange={(e) => updateData({ rental_duration_months: e.target.value ? parseInt(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor Mensal (R$) *</Label>
            <Input
              type="number" min="0" step="0.01" placeholder="0,00"
              value={numVal(data.rental_monthly_value)}
              onChange={(e) => updateData({ rental_monthly_value: e.target.value ? parseFloat(e.target.value) : null })}
            />
          </div>
          <div className="space-y-2 flex items-end">
            <div className="bg-accent/50 rounded-md p-3 w-full text-center">
              <p className="text-xs text-muted-foreground">Subtotal Locação</p>
              <p className="text-lg font-bold text-primary">
                R$ {((data.rental_monthly_value || 0) * (data.rental_duration_months || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-semibold text-primary">Custos Adicionais</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Mobilização (R$)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={data.rental_mobilization || ""}
              onChange={(e) => updateData({ rental_mobilization: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Desmobilização (R$)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={data.rental_demobilization || ""}
              onChange={(e) => updateData({ rental_demobilization: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Frete (R$)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={data.rental_freight || ""}
              onChange={(e) => updateData({ rental_freight: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Montagem (R$)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={data.rental_assembly || ""}
              onChange={(e) => updateData({ rental_assembly: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Desmontagem (R$)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={data.rental_disassembly || ""}
              onChange={(e) => updateData({ rental_disassembly: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-semibold text-primary">Serviços Inclusos</h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "rental_operator_included" as const, label: "Operador incluso" },
            { key: "rental_maintenance_included" as const, label: "Manutenção inclusa" },
            { key: "rental_insurance_included" as const, label: "Seguro incluso" },
            { key: "rental_technical_assistance" as const, label: "Assistência técnica" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <Checkbox
                checked={data[key]}
                onCheckedChange={(v) => updateData({ [key]: !!v })}
              />
              <Label className="cursor-pointer">{label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!data.rental_duration_months || !data.rental_monthly_value}>Próximo</Button>
      </div>
    </div>
  );
}
