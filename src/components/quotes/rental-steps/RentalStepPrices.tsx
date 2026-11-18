import { useLayoutEffect, useRef } from "react";
import { ChevronDown, EyeOff, Plus, Trash2 } from "lucide-react";
import { RentalWizardData } from "@/hooks/useRentalWizard";
import {
  GROUP_TITLE, RENTAL_UNITS, customLine, effectiveQty, groupTotal, isShown, lineValue, type LineGroup, type RentalLine, type RentalTotals,
} from "@/lib/rentalProposal";
import { formatMoney } from "@/lib/quoteMoney";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  data: RentalWizardData;
  months: number;
  totals: RentalTotals;
  updateData: (d: Partial<RentalWizardData>) => void;
  updateLines: (lines: RentalLine[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

/** Caixa de texto que cresce com o conteúdo: a descrição inteira fica visível, inclusive no celular. */
function AutoGrowTextarea(props: React.ComponentProps<typeof Textarea>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <Textarea ref={ref} rows={1} {...props} />;
}

const num = (v: string) => (v === "" ? 0 : Math.max(0, parseFloat(v) || 0));

function LineRow({ line, months, onChange, onRemove }: { line: RentalLine; months: number; onChange: (p: Partial<RentalLine>) => void; onRemove?: () => void }) {
  const shown = isShown(line);
  const missingValue = line.enabled && !(Number(line.unit_price) > 0);
  const qty = effectiveQty(line, months);

  // Item desligado fica numa linha só (a tela não vira uma lista enorme); ligue o interruptor para informar o valor
  if (!line.enabled) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-3 py-2" data-line-key={line.key ?? "custom"}>
        <Switch checked={false} onCheckedChange={(v) => onChange({ enabled: v })} aria-label={`Incluir na proposta: ${line.description || "item"}`} />
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">{line.description || "Item sem descrição"}</span>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-destructive" onClick={onRemove} aria-label="Remover item">
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3" data-line-key={line.key ?? "custom"}>
      <div className="flex items-start gap-3">
        <Switch checked={line.enabled} onCheckedChange={(v) => onChange({ enabled: v })} aria-label={`Incluir na proposta: ${line.description || "item"}`} className="mt-2" />
        <div className="min-w-0 flex-1 space-y-2">
          <AutoGrowTextarea
            value={line.description}
            onChange={(e) => onChange({ description: e.target.value })}
            aria-label="Descrição do item"
            placeholder="Descrição do item"
            className="min-h-0 resize-none overflow-hidden py-2 text-sm leading-snug"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[90px_100px_1fr_auto]">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Quantidade</Label>
              <Input
                type="number" min="0" step="1" inputMode="numeric"
                aria-label="Quantidade"
                value={line.follows_months ? (months || "") : (line.quantity || "")}
                disabled={line.follows_months}
                placeholder="0"
                onChange={(e) => onChange({ quantity: Math.round(num(e.target.value)) })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Unidade</Label>
              <select
                aria-label="Unidade"
                value={line.unit}
                onChange={(e) => onChange({ unit: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {[...new Set([...RENTAL_UNITS, line.unit])].map((u) => (<option key={u} value={u}>{u}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Valor unitário (R$)</Label>
              <Input
                type="number" min="0" step="0.01" inputMode="decimal"
                aria-label="Valor unitário"
                value={line.unit_price || ""}
                placeholder="0,00"
                onChange={(e) => onChange({ unit_price: num(e.target.value) })}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex flex-col justify-end text-right">
              <span className="text-[11px] text-muted-foreground">Total</span>
              <span className="h-9 content-center text-sm font-semibold tabular-nums">{shown && qty > 0 ? formatMoney(lineValue(line, months)) : "—"}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => onChange(line.follows_months ? { follows_months: false, quantity: months } : { follows_months: true })}
              >
                {line.follows_months ? "Quantidade = prazo em meses · usar quantidade fixa" : "Quantidade fixa · acompanhar o prazo em meses"}
              </button>
              {missingValue && (
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400"><EyeOff className="h-3 w-3" aria-hidden /> Sem valor: não aparece na proposta</span>
              )}
              {shown && qty === 0 && <span>Só valor unitário (tarifa), sem quantidade</span>}
            </div>
            {onRemove && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={onRemove} aria-label="Remover item">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group, title, subtitle, lines, months, update }: { group: LineGroup; title: string; subtitle: string; lines: RentalLine[]; months: number; update: (lines: RentalLine[]) => void }) {
  const mine = lines.filter((l) => l.group === group);
  const set = (id: string, p: Partial<RentalLine>) => update(lines.map((l) => (l.id === id ? { ...l, ...p } : l)));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {mine.map((l) => (
          <LineRow key={l.id} line={l} months={months} onChange={(p) => set(l.id, p)} onRemove={l.key === null ? () => update(lines.filter((x) => x.id !== l.id)) : undefined} />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => update([...lines, customLine(group)])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar item
        </Button>
        <div className="flex justify-between border-t pt-2 text-sm font-semibold">
          <span>Total — {title.toLowerCase()}</span>
          <span className="tabular-nums">{formatMoney(groupTotal(lines, group, months))}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function NightTable({ group, lines, update }: { group: "night17" | "night22"; lines: RentalLine[]; update: (lines: RentalLine[]) => void }) {
  const mine = lines.filter((l) => l.group === group);
  const set = (id: string, p: Partial<RentalLine>) => update(lines.map((l) => (l.id === id ? { ...l, ...p } : l)));
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{GROUP_TITLE[group]}</h4>
      {mine.map((l) => (
        <div key={l.id} className="grid grid-cols-[auto_1fr_120px] items-center gap-3">
          <Switch checked={l.enabled} onCheckedChange={(v) => set(l.id, { enabled: v })} aria-label={`Incluir: ${l.description} (${GROUP_TITLE[group]})`} />
          <span className="text-sm">{l.description}</span>
          <Input
            type="number" min="0" step="0.01" inputMode="decimal" placeholder="R$ / hora"
            aria-label={`Valor por hora: ${l.description} (${GROUP_TITLE[group]})`}
            value={l.unit_price || ""}
            onChange={(e) => set(l.id, { unit_price: num(e.target.value) })}
            className="h-9 text-sm"
          />
        </div>
      ))}
    </div>
  );
}

export default function RentalStepPrices({ data, months, totals, updateData, updateLines, onNext, onPrev }: Props) {
  const rent = data.lines.find((l) => l.key === "rent");
  const canNext = months > 0 && !!rent && isShown(rent);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-accent/20 p-4">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[250px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="rent-months">Período total de locação (meses) *</Label>
            <Input
              id="rent-months" type="number" min="1" step="1" inputMode="numeric" placeholder="Ex: 8"
              value={data.rental_duration_months ?? ""}
              onChange={(e) => updateData({ rental_duration_months: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ligue o interruptor para incluir um item e informe o valor. Os itens mensais (locação, seguro, operador, manutenção...) acompanham este prazo. <strong>Item sem valor não aparece na proposta</strong>, e você pode acrescentar itens próprios.
          </p>
        </div>
      </div>

      <GroupCard
        group="ebl" title="Locação de bens móveis" subtitle="Equipamento e itens locados (valor mensal × meses)."
        lines={data.lines} months={months} update={updateLines}
      />
      <GroupCard
        group="cmo" title="Serviços de mão-de-obra" subtitle="Montagem, mobilização, operador, manutenção, assistência técnica e demais serviços — cada custo separado."
        lines={data.lines} months={months} update={updateLines}
      />

      <Collapsible className="rounded-lg border">
        <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
          Manutenção corretiva fora do horário comercial <span className="ml-2 text-xs font-normal text-muted-foreground">(opcional — com campo de adesão na proposta)</span>
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-5 border-t px-4 py-4">
          <NightTable group="night17" lines={data.lines} update={updateLines} />
          <NightTable group="night22" lines={data.lines} update={updateLines} />
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-1.5">
        <Label htmlFor="freight-note">Observação do frete</Label>
        <Input
          id="freight-note" placeholder="Ex.: Frete saindo de Santana de Parnaíba/SP"
          value={data.rental.freight_note}
          onChange={(e) => updateData({ rental: { ...data.rental, freight_note: e.target.value } })}
        />
      </div>

      <div className="space-y-1.5 rounded-lg bg-muted/50 p-4 text-sm" aria-label="Totais do quadro de preços">
        <div className="flex justify-between"><span className="text-muted-foreground">Total — locação de bens móveis</span><span className="tabular-nums">{formatMoney(totals.ebl)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total — serviços de mão-de-obra</span><span className="tabular-nums">{formatMoney(totals.cmo)}</span></div>
        <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Valor total estimado por equipamento</span><span className="tabular-nums">{formatMoney(totals.subtotal)}</span></div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!canNext} title={canNext ? undefined : "Informe o prazo e o valor da locação mensal para continuar"}>Próximo</Button>
      </div>
    </div>
  );
}
