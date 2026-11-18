import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Search } from "lucide-react";
import { buildPanorama, UNIT_STATE_LABEL, type UnitRow, type UnitState } from "@/lib/fleet";
import { clientName, type FleetData } from "@/lib/fleetApi";
import { brlCompact, dayMonth, pct } from "@/lib/fleetFormat";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RentalProgress, specsLine, UnitStateBadge } from "./parts";

const FILTERS: Array<{ key: "all" | UnitState; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "rented", label: UNIT_STATE_LABEL.rented },
  { key: "available", label: UNIT_STATE_LABEL.available },
  { key: "reserved", label: UNIT_STATE_LABEL.reserved },
  { key: "maintenance", label: UNIT_STATE_LABEL.maintenance },
  { key: "retired", label: UNIT_STATE_LABEL.retired },
];

function UnitCard({ row, data, today }: { row: UnitRow; data: FleetData; today: string }) {
  const { unit, snapshot: s, finance: f } = row;
  const cur = s.current && data.rentals.find((r) => r.id === s.current!.id);
  const nxt = s.next && data.rentals.find((r) => r.id === s.next!.id);
  const productName = data.catalog.find((c) => c.id === unit.product_id)?.nome;
  return (
    <li>
      <Link to={`/frota/gruas/${unit.id}`} className="block h-full rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-unit-id={unit.id}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{unit.code}</p>
            <p className="truncate text-sm text-muted-foreground">{unit.model_name || productName || "Sem modelo informado"}</p>
          </div>
          <UnitStateBadge state={s.state} />
        </div>
        {specsLine(unit) && <p className="mt-1 text-xs text-muted-foreground">{specsLine(unit)}</p>}

        <div className="mt-3 min-h-[3.25rem] text-sm">
          {cur ? (
            <>
              <p className="mb-1.5 truncate font-medium">{[cur.site_name, clientName(cur.clients)].filter(Boolean).join(" · ") || "Obra sem nome"}</p>
              <RentalProgress rental={cur} today={today} />
            </>
          ) : s.state === "reserved" && nxt ? (
            <p>Reservada para <strong>{[nxt.site_name, clientName(nxt.clients)].filter(Boolean).join(" · ") || "uma obra"}</strong> a partir de {dayMonth(nxt.start_date)}.</p>
          ) : s.state === "available" ? (
            <p className="text-muted-foreground">Livre{s.idleDays != null ? ` há ${s.idleDays} ${s.idleDays === 1 ? "dia" : "dias"}` : ""}{unit.location_note ? ` · ${unit.location_note}` : ""}.</p>
          ) : s.state === "maintenance" ? (
            <p className="text-muted-foreground">Em manutenção{unit.location_note ? ` · ${unit.location_note}` : ""}.</p>
          ) : (
            <p className="text-muted-foreground">Fora da frota.</p>
          )}
          {s.waiting && nxt && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Cliente esperando desde {dayMonth(nxt.start_date)}</p>
          )}
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
          <div><dt className="text-muted-foreground">Valor empregado</dt><dd className="font-medium tabular-nums">{brlCompact(f.capital)}</dd></div>
          <div><dt className="text-muted-foreground">Rentabilidade</dt><dd className={cn("font-medium tabular-nums", f.roiPct != null && f.roiPct < 0 && "text-red-600 dark:text-red-400")}>{pct(f.roiPct)}</dd></div>
          <div><dt className="text-muted-foreground">Utilização</dt><dd className="font-medium tabular-nums">{pct(f.utilization12mPct, 0)}</dd></div>
        </dl>
      </Link>
    </li>
  );
}

export function UnitsTab({ data, today }: { data: FleetData; today: string }) {
  const [filter, setFilter] = useState<"all" | UnitState>("all");
  const [q, setQ] = useState("");
  const panorama = useMemo(() => buildPanorama({ units: data.units, rentals: data.rentals, costs: data.costs, today }), [data, today]);

  const rows = panorama.rows.filter((r) => {
    if (filter !== "all" && r.snapshot.state !== filter) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    const cur = r.snapshot.current && data.rentals.find((x) => x.id === r.snapshot.current!.id);
    return [r.unit.code, r.unit.model_name, r.unit.serial_number, cur?.site_name, clientName(cur?.clients)].filter(Boolean).join(" ").toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por situação">
          {FILTERS.map((f) => {
            const n = f.key === "all" ? panorama.rows.length : panorama.counts[f.key];
            if (f.key !== "all" && n === 0 && f.key !== filter) return null;
            return (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}
                className={cn("rounded-full border px-3 py-1 text-sm transition-colors", filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {f.label} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar grua, obra ou cliente" className="pl-9" aria-label="Buscar grua, obra ou cliente" />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma grua encontrada.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Gruas">
          {rows.map((r) => (<UnitCard key={r.unit.id} row={r} data={data} today={today} />))}
        </ul>
      )}
    </div>
  );
}
