import { RentalWizardData } from "@/hooks/useRentalWizard";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle } from "lucide-react";

interface Props {
  data: RentalWizardData;
  total: number;
  onPrev: () => void;
  onSaveDraft: () => void;
  onFinalize: () => void;
  isSaving: boolean;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function RentalStepReview({ data, total, onPrev, onSaveDraft, onFinalize, isSaving }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <h3 className="text-xl font-bold">Revisão Final</h3>
        <p className="text-muted-foreground mt-1">Confirme os dados antes de salvar a proposta de locação</p>
      </div>

      <div className="bg-accent/30 rounded-lg p-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Valor Total da Proposta</p>
        <p className="text-3xl font-bold text-primary">{fmt(total)}</p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span>🏗️ {data.selected_crane_name}</span>
          <span>•</span>
          <span>📍 {data.project_name}</span>
          <span>•</span>
          <span>📅 {data.rental_duration_months} meses</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
        <Button variant="outline" onClick={onPrev} disabled={isSaving}>Voltar</Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onSaveDraft} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Rascunho
          </Button>
          <Button onClick={onFinalize} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Finalizar Proposta
          </Button>
        </div>
      </div>
    </div>
  );
}
