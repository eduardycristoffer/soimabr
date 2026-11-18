import { useState } from "react";
import { AlertTriangle, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { describeActivation, multipleActiveWarning, templateInUse } from "@/lib/contractTemplateDraft";

export interface TemplateRow { id: string; name: string; version: number; is_active: boolean; company_id: string | null }
export interface CompanyRow { id: string; razao_social: string | null; company_name: string | null }

interface Props {
  typeLabel: string;
  templates: TemplateRow[];
  activeId: string;
  companies: CompanyRow[];
  busy: boolean;
  /** há alterações não salvas: criar nova versão fica bloqueado (ela copiaria só o que já está salvo) */
  dirty: boolean;
  onSelect: (id: string) => void;
  onNewVersion: () => void;
  onToggleActive: (next: boolean) => void;
  onChangeCompany: (companyId: string | null) => void;
}

const companyName = (c: CompanyRow) => c.razao_social || c.company_name || "(sem nome)";

export function VersionBar({ typeLabel, templates, activeId, companies, busy, dirty, onSelect, onNewVersion, onToggleActive, onChangeCompany }: Props) {
  const active = templates.find((t) => t.id === activeId);
  const inUse = templateInUse(templates);
  const warning = multipleActiveWarning(templates);
  const [pending, setPending] = useState<boolean | null>(null);
  const impact = pending === null || !active ? null : describeActivation(templates, active.id, pending, typeLabel);
  if (!active) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3 sm:p-4">
      <div>
        <div className="mb-1.5 text-sm font-medium">Versões do modelo de {typeLabel.toLowerCase()}</div>
        <div className="flex flex-wrap items-center gap-2">
          {templates.map((t) => {
            const isSel = t.id === activeId;
            const isUse = inUse?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isSel}
                onClick={() => onSelect(t.id)}
                className={[
                  "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSel ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                ].join(" ")}
              >
                v{t.version}
                {isUse ? (
                  <Badge className={`px-1.5 py-0 text-[10px] ${isSel ? "bg-primary-foreground text-primary hover:bg-primary-foreground" : ""}`}>Em uso</Badge>
                ) : t.is_active ? (
                  <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${isSel ? "border-primary-foreground/60 text-primary-foreground" : ""}`}>Reserva</Badge>
                ) : (
                  <span className={`text-[10px] ${isSel ? "text-primary-foreground/80" : "text-muted-foreground"}`}>inativa</span>
                )}
              </button>
            );
          })}
          <Button type="button" size="sm" variant="outline" onClick={onNewVersion} disabled={busy || dirty}
            title={dirty ? "Salve ou descarte as alterações antes de criar uma nova versão" : "Cria uma cópia desta versão, desativada, para você editar com calma"}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Nova versão
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Os contratos novos usam a versão <strong>em uso</strong> (a mais nova entre as ativas).
          {dirty && " Para criar uma nova versão, salve ou descarte as alterações."}
        </p>
      </div>

      {warning && (
        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {warning}
        </div>
      )}

      <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
        <div className="flex items-start justify-between gap-3 rounded-md bg-muted/50 p-3">
          <div className="min-w-0">
            <Label htmlFor="tpl-active" className="cursor-pointer">Esta versão (v{active.version}) está ativa</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {active.is_active
                ? inUse?.id === active.id ? "É a que os contratos novos estão usando." : "Ativa, mas há uma versão mais nova em uso."
                : "Inativa: não é usada em contratos novos. Pode editar sem risco."}
            </p>
          </div>
          <Switch id="tpl-active" checked={active.is_active} disabled={busy} onCheckedChange={(v) => setPending(v)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tpl-company">Empresa que assina o contrato</Label>
          <select
            id="tpl-company"
            value={active.company_id ?? ""}
            disabled={busy}
            onChange={(e) => onChangeCompany(e.target.value || null)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— nenhuma —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{companyName(c)}</option>
            ))}
          </select>
          {!active.company_id ? (
            <p className="text-xs text-destructive">Sem empresa, os dados da vendedora (CNPJ, endereço, representante) saem como “—” no contrato.</p>
          ) : (
            <p className="text-xs text-muted-foreground">De onde vêm os dados da vendedora (CNPJ, endereço, representante).</p>
          )}
        </div>
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{impact?.title}</AlertDialogTitle>
            <AlertDialogDescription className={impact?.danger ? "font-medium text-destructive" : ""}>{impact?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending !== null) onToggleActive(pending);
                setPending(null);
              }}
            >
              {pending ? "Ativar" : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
