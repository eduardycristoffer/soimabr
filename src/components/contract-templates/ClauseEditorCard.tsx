import { useRef } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Bold, ChevronRight, List, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clauseKeyLabel, extractFieldKeys, fieldFullLabel, fieldLabel, fieldToken, friendlyBody, insertAtCursor, isKnownField, shortSample, toggleListPrefix, unknownFieldKeys, wrapSelection } from "@/lib/contractFields";
import { clauseMode, displayNumber, type DraftClause } from "@/lib/contractTemplateDraft";
import { FieldPicker } from "./FieldPicker";

interface Props {
  clause: DraftClause;
  index: number;
  total: number;
  active: boolean;
  dirty: boolean;
  /** mensagem de erro de validação (ex.: título vazio) */
  problem?: string;
  sample: Record<string, string>;
  onActivate: () => void;
  onChange: (patch: Partial<DraftClause>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

export function ClauseEditorCard({ clause, index, total, active, dirty, problem, sample, onActivate, onChange, onMove, onRemove }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const sel = useRef({ start: clause.body.length, end: clause.body.length });
  const num = displayNumber(index);
  const mode = clauseMode(clause);
  const unknown = unknownFieldKeys(clause.body);
  const usedFields = extractFieldKeys(clause.body).filter(isKnownField);

  const trackSelection = () => {
    const el = taRef.current;
    if (el) sel.current = { start: el.selectionStart, end: el.selectionEnd };
  };

  const apply = (next: { text: string; selStart: number; selEnd: number }) => {
    onChange({ body: next.text });
    // o cursor volta para onde a pessoa estava (a tela é refeita com o texto novo)
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.selStart, next.selEnd);
      sel.current = { start: next.selStart, end: next.selEnd };
    });
  };

  const insertField = (key: string) => {
    const r = insertAtCursor(clause.body, sel.current.start, sel.current.end, fieldToken(key));
    apply({ text: r.text, selStart: r.cursor, selEnd: r.cursor });
  };

  const header = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums text-muted-foreground" title={index === 0 ? "A primeira cláusula (partes) não recebe número" : `Cláusula ${num}`}>
        {num || "•"}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{clause.title || <em className="text-muted-foreground">(sem título)</em>}</span>
      {!clause.id && <Badge variant="secondary" className="shrink-0 text-[10px]">Nova</Badge>}
      {clause.id && dirty && <Badge variant="outline" className="shrink-0 border-amber-400 text-[10px] text-amber-700 dark:text-amber-400">Alterada</Badge>}
      {mode === "optional" && <Badge variant="outline" className="shrink-0 text-[10px]">Opcional</Badge>}
      {unknown.length > 0 && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-label="Tem campo desconhecido" />}
    </div>
  );

  if (!active) {
    return (
      <div data-editor-uid={clause.uid} className="rounded-lg border bg-card">
        <button type="button" onClick={onActivate} aria-expanded={false} aria-label={`Editar cláusula ${num ? num + ". " : ""}${clause.title}`}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="min-w-0 flex-1">
            {header}
            <p className="mt-1 line-clamp-2 pl-8 text-xs text-muted-foreground">{friendlyBody(clause.body) || "(sem texto)"}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </div>
    );
  }

  const rows = Math.min(18, Math.max(7, clause.body.split("\n").length + 2));

  return (
    <div data-editor-uid={clause.uid} className="rounded-lg border-2 border-primary/60 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        {header}
        <div className="flex shrink-0 items-center">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Subir cláusula" title="Subir">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Descer cláusula" title="Descer">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Remover cláusula" title="Remover">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover esta cláusula?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{clause.title || "sem título"}” sai do modelo, mas só de verdade quando você clicar em “Salvar alterações”. Até lá dá para descartar. Contratos já gerados não mudam.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Manter</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
        <div className="space-y-1.5">
          <Label htmlFor={`t-${clause.uid}`}>Título da cláusula</Label>
          <Input id={`t-${clause.uid}`} value={clause.title} onChange={(e) => onChange({ title: e.target.value })} aria-invalid={!!problem} className={problem ? "border-destructive" : ""} />
          {problem && <p className="text-xs text-destructive">{problem}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={`b-${clause.uid}`}>Texto</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="button" variant="outline" size="sm" aria-label="Negrito" title="Negrito: coloca ** ao redor do trecho selecionado"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(wrapSelection(clause.body, sel.current.start, sel.current.end, "**"))}>
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="outline" size="sm" aria-label="Lista" title="Lista: coloca “- ” no começo das linhas selecionadas"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(toggleListPrefix(clause.body, sel.current.start, sel.current.end))}>
                <List className="h-3.5 w-3.5" />
              </Button>
              <FieldPicker sample={sample} onPick={insertField} />
            </div>
          </div>
          <Textarea
            id={`b-${clause.uid}`}
            ref={taRef}
            value={clause.body}
            rows={rows}
            onChange={(e) => { onChange({ body: e.target.value }); trackSelection(); }}
            onSelect={trackSelection}
            onBlur={trackSelection}
            onKeyUp={trackSelection}
            onClick={trackSelection}
            className="resize-y text-sm leading-relaxed"
            placeholder="Escreva o texto da cláusula. Use “Inserir campo automático” para dados que o sistema preenche sozinho."
          />
          {usedFields.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Campos automáticos usados neste texto">
              <span className="text-muted-foreground">Preenchidos sozinhos:</span>
              {usedFields.map((k) => (
                <span key={k} className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800" title={`${fieldFullLabel(k)} — exemplo: ${shortSample(sample[k], 80)}`}>
                  {fieldLabel(k)}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Linha em branco separa parágrafos. <strong>**negrito**</strong>, <em>_itálico_</em> e “- ” no começo da linha para lista.
          </p>
        </div>

        {unknown.length > 0 && (
          <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              O sistema não preenche {unknown.length === 1 ? "este campo" : "estes campos"}:{" "}
              {unknown.map((k, i) => (<span key={k}>{i > 0 && ", "}<code className="rounded bg-destructive/10 px-1 text-xs">{`{{${k}}}`}</code></span>))}.
              No contrato sairia “—”. Apague ou troque por um campo de “Inserir campo automático”.
            </div>
          </div>
        )}

        {clause.clause_key && (
          <div className="flex items-start justify-between gap-3 rounded-md bg-muted/50 p-3">
            <div className="min-w-0">
              <Label htmlFor={`o-${clause.uid}`} className="cursor-pointer">Cláusula opcional</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ligada: só entra no contrato se marcarem “{clauseKeyLabel(clause.clause_key)}” ao gerar. Desligada: entra sempre.
              </p>
            </div>
            <Switch id={`o-${clause.uid}`} checked={!clause.is_core} onCheckedChange={(v) => onChange({ is_core: !v })} />
          </div>
        )}
      </div>
    </div>
  );
}
