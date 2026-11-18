import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { ServiceKV, ServiceSection } from "@/lib/serviceProposal";

/** Move um elemento da lista uma posição (sem mudar a lista original). */
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[to]] = [copy[to], copy[index]];
  return copy;
}

interface BlockHeaderProps {
  title: string;
  hint?: string;
  onReset?: () => void;
  resetLabel?: string;
}

export function BlockHeader({ title, hint, onReset, resetLabel = "Restaurar texto-padrão" }: BlockHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <Label className="text-sm font-semibold">{title}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {onReset && (
        <Button type="button" variant="ghost" size="sm" className="shrink-0 text-xs" onClick={onReset}>
          <RotateCcw className="mr-1 h-3 w-3" />
          {resetLabel}
        </Button>
      )}
    </div>
  );
}

interface StringListProps {
  title: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
  onReset?: () => void;
  addLabel?: string;
  rows?: number;
}

/** Lista de textos (um tópico por linha): editar, trocar a ordem, remover e acrescentar. */
export function StringListEditor({ title, hint, value, onChange, onReset, addLabel = "Adicionar tópico", rows = 2 }: StringListProps) {
  return (
    <div className="space-y-2">
      <BlockHeader title={title} hint={hint} onReset={onReset} />
      <div className="space-y-2">
        {value.map((text, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-2.5 w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
            <Textarea
              rows={rows}
              value={text}
              onChange={(e) => onChange(value.map((t, j) => (j === i ? e.target.value : t)))}
              className="min-h-[44px] text-sm"
            />
            <div className="flex shrink-0 flex-col">
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => onChange(moveItem(value, i, -1))} aria-label="Subir">
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === value.length - 1} onClick={() => onChange(moveItem(value, i, 1))} aria-label="Descer">
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover tópico">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {value.length === 0 && <p className="text-xs italic text-muted-foreground">Nenhum tópico. Esta parte não aparecerá na proposta.</p>}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ""])}>
        <Plus className="mr-1 h-3 w-3" />
        {addLabel}
      </Button>
    </div>
  );
}

interface KVListProps {
  title: string;
  hint?: string;
  value: ServiceKV[];
  onChange: (v: ServiceKV[]) => void;
  onReset?: () => void;
  valuePlaceholder?: string;
}

/** Lista "rótulo: valor" (ex.: Modelo: TORRE ASCENSIONAL). */
export function KVListEditor({ title, hint, value, onChange, onReset, valuePlaceholder }: KVListProps) {
  const set = (i: number, patch: Partial<ServiceKV>) => onChange(value.map((kv, j) => (j === i ? { ...kv, ...patch } : kv)));
  return (
    <div className="space-y-2">
      <BlockHeader title={title} hint={hint} onReset={onReset} resetLabel="Restaurar linhas-padrão" />
      <div className="space-y-2.5 sm:space-y-1.5">
        {value.map((kv, i) => (
          // celular: rótulo em cima, valor embaixo, lixeira ao lado; tela larga: tudo numa linha
          <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-1.5 sm:grid-cols-[200px_1fr_auto]">
            <Input value={kv.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Rótulo" className="col-start-1 row-start-1 h-9 text-sm font-medium" />
            <Input value={kv.value} onChange={(e) => set(i, { value: e.target.value })} placeholder={valuePlaceholder ?? "Valor"} className="col-start-1 row-start-2 h-9 text-sm sm:col-start-2 sm:row-start-1" />
            <Button type="button" variant="ghost" size="icon" className="col-start-2 row-span-2 row-start-1 h-8 w-8 self-center text-destructive sm:col-start-3 sm:row-span-1" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover linha">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { label: "", value: "" }])}>
        <Plus className="mr-1 h-3 w-3" />
        Adicionar linha
      </Button>
    </div>
  );
}

interface SectionListProps {
  value: ServiceSection[];
  onChange: (v: ServiceSection[]) => void;
  onReset?: () => void;
}

/** Considerações finais: seções com título e texto livre (6.1, 6.2...). */
export function SectionListEditor({ value, onChange, onReset }: SectionListProps) {
  const set = (i: number, patch: Partial<ServiceSection>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-3">
      <BlockHeader
        title="Considerações finais"
        hint="Cada seção vira um subitem numerado (6.1, 6.2...) na proposta."
        onReset={onReset}
        resetLabel="Restaurar seções-padrão"
      />
      {value.map((s, i) => (
        <div key={i} className="space-y-1.5 rounded-md border p-3">
          <div className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 text-xs font-semibold text-muted-foreground">6.{i + 1}</span>
            <Input value={s.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Título da seção" className="h-9 text-sm font-medium" />
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={i === 0} onClick={() => onChange(moveItem(value, i, -1))} aria-label="Subir seção">
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={i === value.length - 1} onClick={() => onChange(moveItem(value, i, 1))} aria-label="Descer seção">
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover seção">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea rows={4} value={s.text} onChange={(e) => set(i, { text: e.target.value })} className="text-sm" />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { title: "", text: "" }])}>
        <Plus className="mr-1 h-3 w-3" />
        Adicionar seção
      </Button>
    </div>
  );
}
