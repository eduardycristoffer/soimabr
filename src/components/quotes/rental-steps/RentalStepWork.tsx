import { RentalWizardData } from "@/hooks/useRentalWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  data: RentalWizardData;
  updateData: (d: Partial<RentalWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function RentalStepWork({ data, updateData, onNext, onPrev }: Props) {
  const numVal = (v: number | null) => (v === null ? "" : v);
  const parseNum = (v: string) => (v === "" ? null : parseFloat(v));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome do Projeto / Obra *</Label>
          <Input
            placeholder="Ex: Edifício Solar, Parque Industrial XYZ"
            value={data.project_name}
            onChange={(e) => updateData({ project_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Endereço / Localização da Obra</Label>
          <Input
            placeholder="Ex: São Paulo - SP"
            value={data.project_location}
            onChange={(e) => updateData({ project_location: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Obra</Label>
          <Select value={data.rental_work_type} onValueChange={(v) => updateData({ rental_work_type: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="residencial">Residencial</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prazo da Obra (meses)</Label>
          <Input
            type="number" min="1" placeholder="Ex: 12"
            value={numVal(data.rental_duration_months)}
            onChange={(e) => updateData({ rental_duration_months: parseNum(e.target.value) as any })}
          />
        </div>
        <div className="space-y-2">
          <Label>Início Previsto</Label>
          <Input
            type="date"
            value={data.rental_start_date}
            onChange={(e) => updateData({ rental_start_date: e.target.value })}
          />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-semibold text-primary">Requisitos Técnicos</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Altura Necessária (m)</Label>
            <Input
              type="number" min="0" step="0.1" placeholder="Ex: 30"
              value={numVal(data.rental_height_needed)}
              onChange={(e) => updateData({ rental_height_needed: parseNum(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Comprimento da Lança (m)</Label>
            <Input
              type="number" min="0" step="0.1" placeholder="Ex: 50"
              value={numVal(data.rental_jib_needed)}
              onChange={(e) => updateData({ rental_jib_needed: parseNum(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Peso Máximo a Içar (kg)</Label>
            <Input
              type="number" min="0" step="1" placeholder="Ex: 6000"
              value={numVal(data.rental_max_weight)}
              onChange={(e) => updateData({ rental_max_weight: parseNum(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Condição do Terreno</Label>
          <Select value={data.rental_terrain_condition} onValueChange={(v) => updateData({ rental_terrain_condition: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="plano">Plano</SelectItem>
              <SelectItem value="inclinado">Inclinado</SelectItem>
              <SelectItem value="dificil_acesso">Difícil Acesso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Checkbox
            checked={data.rental_special_foundation}
            onCheckedChange={(v) => updateData({ rental_special_foundation: !!v })}
          />
          <Label className="cursor-pointer">Necessita fundação especial</Label>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!data.project_name.trim()}>Próximo</Button>
      </div>
    </div>
  );
}
