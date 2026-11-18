import { ServiceWizardData } from "@/hooks/useServiceWizard";
import {
  SERVICE_UNITS, SERVICE_ITEM_PRESETS, ServiceItem, emptyItem, itemKind, itemLineValue, itemNumber,
} from "@/lib/serviceProposal";
import { formatMoney } from "@/lib/quoteMoney";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { moveItem } from "./editors";

interface Props {
  data: ServiceWizardData;
  updateData: (d: Partial<ServiceWizardData>) => void;
  totals: { fixedTotal: number; fixedCount: number; measuredCount: number; optionalCount: number };
  onNext: () => void;
  onPrev: () => void;
}

const KIND_LABEL = {
  fixed: { text: "Soma no total", cls: "bg-primary/10 text-primary border-primary/30" },
  measured: { text: "Sob medição", cls: "bg-amber-50 text-amber-800 border-amber-300" },
  optional: { text: "Opcional", cls: "bg-muted text-muted-foreground border-border" },
} as const;

export default function ServiceStepItems({ data, updateData, totals, onNext, onPrev }: Props) {
  const items = data.items;
  const setItems = (next: ServiceItem[]) => updateData({ items: next });
  const patch = (id: string, p: Partial<ServiceItem>) => setItems(items.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const addPreset = (i: number) => {
    const p = SERVICE_ITEM_PRESETS[i];
    setItems([...items, emptyItem({ ...p, unit_price: 0 })]);
  };

  const canNext = items.length > 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-accent/20 p-3 text-xs text-muted-foreground space-y-1">
        <p><strong className="text-foreground">Como a tabela funciona:</strong></p>
        <p>• <strong>Com quantidade</strong>: o valor (quantidade × preço) soma no total da proposta.</p>
        <p>• <strong>Sem quantidade</strong> (deixe vazio): fica <em>sob medição</em> — vale o preço unitário e é cobrado conforme a execução.</p>
        <p>• <strong>Opcional</strong>: aparece na proposta com a marcação “OPCIONAL” e não entra no total.</p>
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => {
          const kind = itemKind(it);
          const line = itemLineValue(it);
          return (
            <div key={it.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Item {itemNumber(idx)}</span>
                  <Badge variant="outline" className={`text-[10px] ${KIND_LABEL[kind].cls}`}>{KIND_LABEL[kind].text}</Badge>
                </div>
                <div className="flex items-center">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => setItems(moveItem(items, idx, -1))} aria-label="Subir item">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === items.length - 1} onClick={() => setItems(moveItem(items, idx, 1))} aria-label="Descer item">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setItems(items.filter((x) => x.id !== it.id))} aria-label="Remover item">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Descrição do serviço</Label>
                <Textarea rows={2} value={it.description} onChange={(e) => patch(it.id, { description: e.target.value })} placeholder="Ex: Montagem da grua (previsão 4 dias)" className="text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number" min="0" step="1" inputMode="numeric" placeholder="sob medição"
                    value={it.quantity ?? ""}
                    onChange={(e) => patch(it.id, { quantity: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unidade</Label>
                  <Select value={it.unit} onValueChange={(v) => patch(it.id, { unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[...new Set([...SERVICE_UNITS, it.unit])].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preço unitário (R$)</Label>
                  <Input
                    type="number" min="0" step="0.01" inputMode="decimal"
                    value={it.unit_price || ""}
                    onChange={(e) => patch(it.id, { unit_price: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor da linha</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                    {line > 0 ? formatMoney(line) : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-1">
                  <Label className="text-xs">Observação (aparece abaixo da descrição)</Label>
                  <Input value={it.note} onChange={(e) => patch(it.id, { note: e.target.value })} placeholder="Ex: Por furo · Adicional em dias não úteis: 50%" />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <Switch checked={it.is_optional} onCheckedChange={(v) => patch(it.id, { is_optional: v })} />
                  Opcional
                </label>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum item ainda. Use “Atalhos de serviços” para começar pelos serviços mais comuns ou “Item em branco”.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}>
          <Plus className="mr-1 h-3 w-3" /> Item em branco
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              Atalhos de serviços <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-80 overflow-y-auto">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Traz descrição e unidade. O preço você define.
            </DropdownMenuLabel>
            {SERVICE_ITEM_PRESETS.map((p, i) => (
              <DropdownMenuItem key={i} onClick={() => addPreset(i)} className="text-xs">
                <span className="line-clamp-2">{p.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 rounded-lg bg-accent/30 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total dos itens com quantidade ({totals.fixedCount})</span>
          <span className="text-2xl font-bold text-primary">{formatMoney(totals.fixedTotal)}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <span>{totals.measuredCount} sob medição</span>
          <span>{totals.optionalCount} opcional(is)</span>
        </div>
        <label className="flex items-center gap-2 border-t pt-2 text-sm">
          <Switch checked={data.show_unit_prices} onCheckedChange={(v) => updateData({ show_unit_prices: v })} />
          Mostrar preços na proposta
        </label>
        {!data.show_unit_prices && (
          <p className="text-xs text-amber-700">
            Com os preços escondidos, o PDF mostra só a lista de serviços — sem preço unitário nem valor de linha.
            Numa proposta de serviço, a tabela de preços costuma ser o próprio conteúdo; desligue só se for de propósito.
          </p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!canNext}>Próximo</Button>
      </div>
    </div>
  );
}
