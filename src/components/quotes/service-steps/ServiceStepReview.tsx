import { ServiceWizardData } from "@/hooks/useServiceWizard";
import { itemKind, itemLineValue, itemNumber, serviceProblems } from "@/lib/serviceProposal";
import { formatMoney } from "@/lib/quoteMoney";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Loader2, Save } from "lucide-react";

interface Props {
  data: ServiceWizardData;
  totals: { fixedTotal: number; fixedCount: number; measuredCount: number; optionalCount: number };
  updateData: (d: Partial<ServiceWizardData>) => void;
  onPrev: () => void;
  onSaveDraft: () => void;
  onFinalize: () => void;
  /** só ao editar uma proposta já finalizada */
  onSaveChanges?: () => void;
  isSaving: boolean;
}

export default function ServiceStepReview({ data, totals, updateData, onPrev, onSaveDraft, onFinalize, onSaveChanges, isSaving }: Props) {
  const problems = serviceProblems({
    client_id: data.client_id,
    items: data.items,
    data: data.service,
    validity_days: data.validity_days,
  });
  const blocked = problems.length > 0 || !data.texts_reviewed;

  return (
    <div className="space-y-6">
      <div className="py-4 text-center">
        <h3 className="text-xl font-bold">Revisão final</h3>
        <p className="mt-1 text-muted-foreground">Confira antes de salvar a proposta de serviço</p>
      </div>

      <div className="space-y-2 rounded-lg bg-accent/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">Total dos itens com quantidade definida</p>
        <p className="text-3xl font-bold text-primary">{formatMoney(totals.fixedTotal)}</p>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>👤 {data.client_name || "—"}</span>
          <span>•</span>
          <span>📍 {data.project_name || "—"}</span>
          <span>•</span>
          <span>{totals.measuredCount} sob medição</span>
          <span>•</span>
          <span>{totals.optionalCount} opcional(is)</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-[13px] sm:text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2 sm:px-3 text-left">Item</th>
              <th className="px-2 py-2 sm:px-3 text-left">Descrição</th>
              <th className="px-2 py-2 sm:px-3 text-right">Qtd</th>
              <th className="hidden px-2 py-2 sm:px-3 text-left sm:table-cell">Un</th>
              <th className="hidden px-2 py-2 sm:px-3 text-right sm:table-cell">Preço unit.</th>
              <th className="px-2 py-2 sm:px-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => {
              const k = itemKind(it);
              const line = itemLineValue(it);
              return (
                <tr key={it.id} className="border-t align-top">
                  <td className="px-2 py-2 sm:px-3 text-muted-foreground">{itemNumber(i)}</td>
                  <td className="px-2 py-2 sm:px-3">
                    {it.description || <em className="text-destructive">sem descrição</em>}
                    {k === "optional" && <span className="ml-2 text-[10px] font-semibold uppercase text-muted-foreground">(opcional)</span>}
                    {it.note && <div className="text-xs text-muted-foreground">{it.note}</div>}
                  </td>
                  <td className="px-2 py-2 sm:px-3 text-right whitespace-nowrap">{it.quantity ?? ""}<span className="sm:hidden"> {it.unit}</span></td>
                  <td className="hidden px-2 py-2 sm:px-3 sm:table-cell">{it.unit}</td>
                  <td className="hidden px-2 py-2 sm:px-3 text-right whitespace-nowrap sm:table-cell">{formatMoney(it.unit_price)}</td>
                  <td className="px-2 py-2 sm:px-3 text-right whitespace-nowrap">{line > 0 && k !== "optional" ? formatMoney(line) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
        <Checkbox id="texts-reviewed" checked={data.texts_reviewed} onCheckedChange={(v) => updateData({ texts_reviewed: v === true })} className="mt-0.5" />
        <Label htmlFor="texts-reviewed" className="text-sm font-normal leading-snug">
          Revisei os textos da proposta (objeto, responsabilidades, reajuste, retenções e demais considerações) e eles
          valem para este cliente.
        </Label>
      </div>

      <div className="flex flex-col justify-between gap-3 pt-2 sm:flex-row">
        <Button variant="outline" onClick={onPrev} disabled={isSaving}>Voltar</Button>
        <div className="flex flex-wrap justify-end gap-3">
          {onSaveChanges && (
            <Button variant="secondary" onClick={onSaveChanges} disabled={isSaving || blocked} title="Salva a correção mantendo a proposta finalizada e registra nova revisão">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar alteração (manter finalizada)
            </Button>
          )}
          <Button variant={onSaveChanges ? "outline" : "secondary"} onClick={onSaveDraft} disabled={isSaving || !data.client_id}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {onSaveChanges ? "Voltar para Rascunho" : "Salvar Rascunho"}
          </Button>
          <Button onClick={onFinalize} disabled={isSaving || blocked}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Finalizar Proposta
          </Button>
        </div>
      </div>
    </div>
  );
}
