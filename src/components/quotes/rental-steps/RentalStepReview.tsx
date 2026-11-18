import { RentalWizardData } from "@/hooks/useRentalWizard";
import { rentalProblems } from "@/lib/rentalProposal";
import { formatMoney } from "@/lib/quoteMoney";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Save, CheckCircle, Send } from "lucide-react";

interface Props {
  data: RentalWizardData;
  total: number;
  updateData: (d: Partial<RentalWizardData>) => void;
  onPrev: () => void;
  onSaveDraft: () => void;
  onFinalize: () => void;
  onSaveChanges?: () => void;
  /** Desconto acima do limite: não pode finalizar, só enviar para aprovação */
  needsApproval?: boolean;
  onRequestApproval?: () => void;
  isSaving: boolean;
}

export default function RentalStepReview({ data, total, updateData, onPrev, onSaveDraft, onFinalize, onSaveChanges, needsApproval = false, onRequestApproval, isSaving }: Props) {
  const problems = rentalProblems({
    client_id: data.client_id,
    months: data.rental_duration_months || 0,
    lines: data.lines,
    data: data.rental,
    validity_days: data.validity_days,
  });
  // Aprovação de desconto não exige estar pronta para finalizar: o administrador vai revisar
  const blocked = problems.length > 0 || !data.texts_reviewed;

  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <h3 className="text-xl font-bold">Revisão Final</h3>
        <p className="text-muted-foreground mt-1">Confirme os dados antes de salvar a proposta de locação</p>
      </div>

      <div className="bg-accent/30 rounded-lg p-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Valor Total da Proposta</p>
        <p className="text-3xl font-bold text-primary">{formatMoney(total)}</p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span>🏗️ {data.selected_crane_name}</span>
          <span>•</span>
          <span>📍 {data.project_name}</span>
          <span>•</span>
          <span>📅 {data.rental_duration_months || 0} meses</span>
        </div>
      </div>

      {needsApproval && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm">
          <Send className="h-4 w-4 shrink-0" />
          <span>Esta proposta requer aprovação de desconto por um administrador antes de ser finalizada.</span>
        </div>
      )}

      {problems.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-1 font-medium">Para finalizar, corrija:</p>
            <ul className="list-disc pl-5 text-sm">
              {problems.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <p className="mt-1 text-xs">Você pode salvar como rascunho e completar depois.</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-start gap-2 rounded-lg border p-3">
        <Checkbox id="rental-texts-reviewed" checked={data.texts_reviewed} onCheckedChange={(v) => updateData({ texts_reviewed: v === true })} className="mt-0.5" />
        <Label htmlFor="rental-texts-reviewed" className="text-sm font-normal leading-snug">
          Revisei os textos da proposta (seguro, observações, medição e pagamentos, prazos, jornadas, reajustes e multas) e
          eles valem para este cliente.
        </Label>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
        <Button variant="outline" onClick={onPrev} disabled={isSaving}>Voltar</Button>
        <div className="flex flex-wrap gap-3 justify-end">
          {onSaveChanges && !needsApproval && (
            <Button variant="secondary" onClick={onSaveChanges} disabled={isSaving || blocked} title="Salva a correção mantendo a proposta finalizada e registra nova revisão">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar alteração (manter finalizada)
            </Button>
          )}
          <Button variant={onSaveChanges ? "outline" : "secondary"} onClick={onSaveDraft} disabled={isSaving || !data.client_id}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {onSaveChanges ? "Voltar para Rascunho" : "Salvar Rascunho"}
          </Button>
          {needsApproval ? (
            <Button onClick={onRequestApproval} disabled={isSaving || !data.client_id}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar para Aprovação
            </Button>
          ) : (
            <Button onClick={onFinalize} disabled={isSaving || blocked}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Finalizar Proposta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
