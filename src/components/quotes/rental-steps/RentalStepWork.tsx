import { RentalWizardData } from "@/hooks/useRentalWizard";
import type { RentalData } from "@/lib/rentalProposal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  data: RentalWizardData;
  updateData: (d: Partial<RentalWizardData>) => void;
  updateRental: (d: Partial<RentalData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function RentalStepWork({ data, updateData, updateRental, onNext, onPrev }: Props) {
  const numVal = (v: number | null) => (v === null ? "" : v);
  const parseNum = (v: string) => (v === "" ? null : parseFloat(v));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rent-project">Nome do Projeto / Obra *</Label>
          <Input
            id="rent-project"
            placeholder="Ex: Edifício Solar, Parque Industrial XYZ"
            value={data.project_name}
            onChange={(e) => updateData({ project_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rent-location">Endereço / Localização da Obra</Label>
          <Input
            id="rent-location"
            placeholder="Ex: São Paulo - SP"
            value={data.project_location}
            onChange={(e) => updateData({ project_location: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rent-attention">Contato na obra (Att.)</Label>
          <Input
            id="rent-attention"
            placeholder="Ex: Eng. Fulano de Tal"
            value={data.rental.attention}
            onChange={(e) => updateRental({ attention: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rent-duration">Período da locação (meses)</Label>
          <Input
            id="rent-duration"
            type="number" min="1" placeholder="Ex: 12"
            value={numVal(data.rental_duration_months)}
            onChange={(e) => updateData({ rental_duration_months: parseNum(e.target.value) as any })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rent-start">Início Previsto</Label>
          <Input
            id="rent-start"
            type="date"
            value={data.rental_start_date}
            onChange={(e) => updateData({ rental_start_date: e.target.value })}
          />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-primary">Requisitos Técnicos</h4>
          <p className="text-xs text-muted-foreground">Opcional — usados só para sugerir as gruas compatíveis na próxima etapa.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rent-height">Altura Necessária (m)</Label>
            <Input
              id="rent-height"
              type="number" min="0" step="0.1" placeholder="Ex: 30"
              value={numVal(data.rental_height_needed)}
              onChange={(e) => updateData({ rental_height_needed: parseNum(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rent-jib">Comprimento da Lança (m)</Label>
            <Input
              id="rent-jib"
              type="number" min="0" step="0.1" placeholder="Ex: 50"
              value={numVal(data.rental_jib_needed)}
              onChange={(e) => updateData({ rental_jib_needed: parseNum(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rent-weight">Peso Máximo a Içar (kg)</Label>
            <Input
              id="rent-weight"
              type="number" min="0" step="1" placeholder="Ex: 6000"
              value={numVal(data.rental_max_weight)}
              onChange={(e) => updateData({ rental_max_weight: parseNum(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!data.project_name.trim()}>Próximo</Button>
      </div>
    </div>
  );
}
