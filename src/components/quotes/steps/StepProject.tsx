import { QuoteWizardData } from "@/hooks/useQuoteWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepProject({ data, updateData, onNext, onPrev }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome do Projeto / Obra *</Label>
          <Input
            placeholder="Ex: Edifício Solar, Parque Industrial XYZ"
            value={data.project_name}
            onChange={(e) => updateData({ project_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Localização da Obra</Label>
          <Input
            placeholder="Ex: São Paulo - SP, Porto Alegre - RS"
            value={data.project_location}
            onChange={(e) => updateData({ project_location: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!data.project_name.trim()}>Próximo</Button>
      </div>
    </div>
  );
}
