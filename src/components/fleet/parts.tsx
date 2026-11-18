import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { contractLabel, rentalTimeline, UNIT_STATE_LABEL, type ContractInfo, type FleetRental, type FleetUnit, type UnitState } from "@/lib/fleet";
import { rentalStatusLine } from "@/lib/fleetFormat";
import { Label } from "@/components/ui/label";

const STATE_STYLE: Record<UnitState, string> = {
  rented: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  reserved: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  maintenance: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  retired: "bg-muted text-muted-foreground",
};

export function UnitStateBadge({ state, className }: { state: UnitState; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", STATE_STYLE[state], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {UNIT_STATE_LABEL[state]}
    </span>
  );
}

const TONE_STYLE = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warn: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  none: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
} as const;

/** Selo do contrato ligado à locação: assinado, aguardando, em preparo ou sem contrato. */
export function ContractBadge({ info, className }: { info?: ContractInfo | null; className?: string }) {
  const { label, tone } = contractLabel(info);
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TONE_STYLE[tone], className)}>{label}</span>;
}

const LINE_STYLE = {
  ok: "text-muted-foreground",
  soon: "font-medium text-amber-700 dark:text-amber-400",
  late: "font-medium text-red-600 dark:text-red-400",
  muted: "text-muted-foreground",
} as const;

/** Barra de prazo + frase ("Faltam 20 dias · termina em 30/06"). Amarela perto do fim, vermelha se atrasada. */
export function RentalProgress({ rental, today, className }: { rental: FleetRental; today: string; className?: string }) {
  const t = rentalTimeline(rental, today);
  const line = rentalStatusLine(rental, today);
  const color = t.overdueDays > 0 ? "bg-red-500" : t.endingSoon ? "bg-amber-500" : t.phase === "finished" ? "bg-slate-400" : "bg-blue-500";
  return (
    <div className={cn("min-w-0", className)}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, t.pct)}
        aria-label={`Prazo: ${Math.min(100, t.pct)}% decorrido`}
      >
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, t.pct)}%` }} />
      </div>
      <p className={cn("mt-1 text-xs", LINE_STYLE[line.tone])}>{line.text}</p>
    </div>
  );
}

/** "Lança 45 m · Altura 27 m · 2.500 kg" (só o que está cadastrado). */
export function specsLine(u: Pick<FleetUnit, "lanca_m" | "altura_torre_m" | "carga_maxima_kg" | "carga_ponta_kg">): string {
  const f = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return [
    u.lanca_m != null && `Lança ${f(u.lanca_m)} m`,
    u.altura_torre_m != null && `Altura ${f(u.altura_torre_m)} m`,
    u.carga_maxima_kg != null && `Carga ${f(u.carga_maxima_kg)} kg`,
    u.carga_ponta_kg != null && `Ponta ${f(u.carga_ponta_kg)} kg`,
  ].filter(Boolean).join(" · ");
}

export const unitTitle = (u: Pick<FleetUnit, "code" | "model_name">, productName?: string | null) =>
  [u.code, u.model_name || productName].filter(Boolean).join(" — ");

/** Lista suspensa nativa (funciona bem no celular e com leitor de tela). */
export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

/** Rótulo + campo + dica/erro, no padrão dos formulários da frota. */
export function Field({ id, label, hint, error, children, className }: { id: string; label: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
