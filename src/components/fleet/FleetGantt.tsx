import { Link } from "react-router-dom";
import { ganttModel, type FleetRental, type FleetUnit } from "@/lib/fleet";
import { brl, dateBR } from "@/lib/fleetFormat";
import { clientName, type RentalRow } from "@/lib/fleetApi";
import { cn } from "@/lib/utils";

interface Props {
  units: FleetUnit[];
  rentals: RentalRow[];
  today: string;
  /** meses antes de hoje na janela (padrão 3) e total de meses (padrão 12) */
  backMonths?: number;
  totalMonths?: number;
  /** o código da grua vira link para a página dela */
  linkUnits?: boolean;
}

const BAR: Record<string, string> = {
  active: "bg-blue-500 text-white",
  scheduled: "border border-dashed border-violet-500 bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  finished: "bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
  overdue: "bg-red-500 text-white",
};

/** Linha do tempo: uma linha por grua, uma barra por locação, com a linha de "hoje". Rola para o lado no celular. */
export function FleetGantt({ units, rentals, today, backMonths = 3, totalMonths = 12, linkUnits = true }: Props) {
  const g = ganttModel(units, rentals as FleetRental[], today, backMonths, totalMonths);
  const byId = new Map(rentals.map((r) => [r.id, r]));

  if (g.rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma grua para mostrar.</p>;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border" role="region" aria-label="Linha do tempo das locações" tabIndex={0}>
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[96px_1fr] border-b bg-muted/40 text-[11px] text-muted-foreground">
            <div className="sticky left-0 z-20 bg-muted px-2 py-1.5 font-medium">Grua</div>
            <div className="relative h-7">
              {g.months.map((m) => (
                <div key={m.key} className="absolute top-0 h-full border-l px-1 py-1.5" style={{ left: `${m.left}%`, width: `${m.width}%` }}>{m.label}</div>
              ))}
            </div>
          </div>

          {g.rows.map(({ unit, bars }) => (
            <div key={unit.id} className="grid grid-cols-[96px_1fr] border-b last:border-b-0" data-gantt-unit={unit.id}>
              <div className="sticky left-0 z-10 flex items-center bg-card px-2 py-2 text-xs font-medium">
                {linkUnits ? <Link to={`/frota/gruas/${unit.id}`} className="truncate hover:underline">{unit.code}</Link> : <span className="truncate">{unit.code}</span>}
              </div>
              <div className="relative h-11">
                {g.months.map((m) => (
                  <div key={m.key} className="absolute top-0 h-full border-l border-border/60" style={{ left: `${m.left}%` }} aria-hidden />
                ))}
                {g.todayPct != null && <div className="absolute top-0 z-10 h-full w-px bg-red-500" style={{ left: `${g.todayPct}%` }} aria-hidden />}
                {bars.map((b) => {
                  const r = byId.get(b.rental.id);
                  const key = b.overdue ? "overdue" : b.phase;
                  const label = [b.rental.site_name, clientName(r?.clients)].filter(Boolean).join(" · ") || "Obra";
                  const tip = `${label}\n${dateBR(b.rental.start_date)} a ${dateBR(b.rental.actual_end_date ?? b.rental.planned_end_date)}${b.overdue ? " (atrasada)" : ""}\n${brl(b.rental.monthly_value)}/mês`;
                  return (
                    <div
                      key={b.rental.id}
                      title={tip}
                      data-bar={key}
                      className={cn("absolute top-1.5 flex h-8 items-center overflow-hidden px-2 text-[11px] font-medium", BAR[key],
                        b.clippedLeft ? "rounded-l-none" : "rounded-l-md", b.clippedRight ? "rounded-r-none" : "rounded-r-md")}
                      style={{ left: `${b.left}%`, width: `${b.width}%` }}
                    >
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-blue-500" aria-hidden /> Em obra</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border border-dashed border-violet-500 bg-violet-100 dark:bg-violet-950" aria-hidden /> Agendada</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-red-500" aria-hidden /> Atrasada (ainda na obra)</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-slate-300 dark:bg-slate-600" aria-hidden /> Encerrada</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-px bg-red-500" aria-hidden /> Hoje</li>
      </ul>
    </div>
  );
}
