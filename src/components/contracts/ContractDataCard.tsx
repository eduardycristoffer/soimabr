import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import { createContractVersion } from "@/lib/contractVersions";
import type { PaymentScheduleItem } from "@/lib/contractPlaceholders";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  contract: any;
  quoteTotal: number;
  structuredServices: string[];
  isLocked: boolean;
  /** Chamado depois de salvar, com o que foi gravado em `contracts` */
  onSaved: (patch: Record<string, any>) => void | Promise<void>;
}

function readSchedule(contract: any): PaymentScheduleItem[] {
  const raw = contract?.payment_schedule;
  if (!Array.isArray(raw)) return [];
  return raw.map((p: any) => ({
    label: String(p?.label ?? ""),
    value: Number(p?.value ?? 0),
    due: String(p?.due ?? ""),
  }));
}

/**
 * Edição, depois da geração, dos dados que viram texto nas cláusulas:
 * prazo de entrega, parcelas de pagamento e serviços adicionais.
 */
export function ContractDataCard({ contract, quoteTotal, structuredServices, isLocked, onSaved }: Props) {
  // A coluna extra_services só existe depois que a atualização do banco for aplicada.
  // Enquanto não existir, a lista de serviços adicionais fica oculta (sem quebrar nada).
  const hasExtraServices = "extra_services" in (contract || {});

  const [deliveryDays, setDeliveryDays] = useState<string>("");
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [extras, setExtras] = useState<string[]>([]);

  // Recarrega só quando troca de contrato ou a versão muda (salvar aqui, restaurar versão...).
  // NÃO depende de updated_at: salvar outro campo do contrato (ex.: e-mail do gestor) apagaria
  // o que a pessoa ainda está digitando neste cartão.
  useEffect(() => {
    setDeliveryDays(contract?.delivery_days != null ? String(contract.delivery_days) : "");
    setSchedule(readSchedule(contract));
    setExtras(Array.isArray(contract?.extra_services) ? contract.extra_services.map(String) : []);
  }, [contract?.id, contract?.current_version]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSchedule = useMemo(
    () => schedule.reduce((s, p) => s + (Number(p.value) || 0), 0),
    [schedule],
  );
  const diff = totalSchedule - quoteTotal;
  const scheduleOk = schedule.length > 0 && Math.abs(diff) <= 0.01;
  const labelsOk = schedule.every((p) => p.label.trim().length > 0);

  const update = (idx: number, field: keyof PaymentScheduleItem, v: string) =>
    setSchedule((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: field === "value" ? Number(v) : v } : p)),
    );

  const save = useMutation({
    mutationFn: async () => {
      if (!scheduleOk)
        throw new Error(
          `A soma das parcelas (${brl(totalSchedule)}) deve ser igual ao total da proposta (${brl(quoteTotal)}).`,
        );
      if (!labelsOk) throw new Error("Preencha a descrição de todas as parcelas.");

      const patch: Record<string, any> = {
        delivery_days: deliveryDays.trim() ? Number(deliveryDays) : null,
        payment_schedule: schedule,
      };
      if (hasExtraServices) patch.extra_services = extras.map((e) => e.trim()).filter(Boolean);

      const { error } = await supabase.from("contracts").update(patch as any).eq("id", contract.id);
      if (error) throw error;
      try {
        await createContractVersion({
          contractId: contract.id,
          changeSummary: "Dados do contrato atualizados (prazo, parcelas e serviços)",
        });
      } catch (e) {
        console.error("Falha ao registrar versão:", e);
      }
      return patch;
    },
    onSuccess: async (patch) => {
      toast({ title: "Dados do contrato salvos" });
      await onSaved(patch);
    },
    onError: (e: any) =>
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prazo, parcelas e serviços</CardTitle>
        <CardDescription>
          Edite aqui e depois atualize as cláusulas — o texto delas é refeito com os novos dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-[220px]">
          <Label className="text-xs">Prazo de entrega (dias)</Label>
          <Input
            type="number"
            min={0}
            disabled={isLocked}
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm font-semibold">Parcelas de pagamento</h4>
            <div className="text-xs text-muted-foreground">
              Total da proposta: <strong>{brl(quoteTotal)}</strong>
              {" · "}Parcelas: <strong className={scheduleOk ? "" : "text-destructive"}>{brl(totalSchedule)}</strong>
            </div>
          </div>

          {schedule.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma parcela cadastrada.</p>
          )}

          {schedule.map((p, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_150px_1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input disabled={isLocked} value={p.label} onChange={(e) => update(idx, "label", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={isLocked}
                  value={Number.isFinite(p.value) ? p.value : 0}
                  onChange={(e) => update(idx, "value", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Vencimento</Label>
                <Input
                  disabled={isLocked}
                  value={p.due}
                  onChange={(e) => update(idx, "due", e.target.value)}
                  placeholder="ex: 20/11/2026 ou 'na entrega'"
                />
              </div>
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover parcela"
                  onClick={() => setSchedule((s) => s.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}

          {!isLocked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSchedule((s) => [...s, { label: `Parcela ${s.length + 1}`, value: 0, due: "" }])}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar parcela
            </Button>
          )}

          {schedule.length > 0 && !scheduleOk && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              A soma das parcelas difere do total da proposta em {brl(Math.abs(diff))}
              {diff > 0 ? " (a mais)" : " (a menos)"}.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Serviços incluídos</h4>
          {structuredServices.length > 0 ? (
            <ul className="list-disc pl-6 text-sm space-y-0.5">
              {structuredServices.map((b, i) => (
                <li key={i}>{b.replace(/^-\s*/, "")}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum serviço estruturado na proposta.</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Estes vêm dos itens da proposta (frete, montagem, operador...). Para mudar, edite a proposta.
          </p>

          {hasExtraServices && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs">Serviços adicionais deste contrato</Label>
              {extras.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    disabled={isLocked}
                    value={s}
                    placeholder="ex: Frete do equipamento de Anápolis-GO até Betim-MG"
                    onChange={(e) => setExtras((arr) => arr.map((v, i) => (i === idx ? e.target.value : v)))}
                  />
                  {!isLocked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover serviço"
                      onClick={() => setExtras((arr) => arr.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {!isLocked && (
                <Button variant="outline" size="sm" onClick={() => setExtras((arr) => [...arr, ""])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar serviço
                </Button>
              )}
            </div>
          )}
        </div>

        {!isLocked && (
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending || !scheduleOk || !labelsOk}>
              {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar dados do contrato
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
