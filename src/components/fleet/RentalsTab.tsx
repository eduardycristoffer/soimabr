import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { dayNum, rentalPhase, type RentalPhase } from "@/lib/fleet";
import { clientName, type FleetData, type RentalRow } from "@/lib/fleetApi";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RentalList } from "./RentalList";

type Filter = "active" | "scheduled" | "finished" | "all";
const LABEL: Record<Filter, string> = { active: "Em andamento", scheduled: "Agendadas", finished: "Encerradas", all: "Todas" };

export function RentalsTab({ data, today }: { data: FleetData; today: string }) {
  const [filter, setFilter] = useState<Filter>("active");
  const [q, setQ] = useState("");

  const phaseOf = (r: RentalRow): RentalPhase => rentalPhase(r, today);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { active: 0, scheduled: 0, finished: 0, all: data.rentals.length };
    for (const r of data.rentals) {
      const p = phaseOf(r);
      if (p === "active" || p === "scheduled" || p === "finished") c[p] += 1;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rentals, today]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = data.rentals.filter((r) => {
      const p = phaseOf(r);
      if (filter !== "all" && p !== filter) return false;
      if (!term) return true;
      const u = data.units.find((x) => x.id === r.unit_id);
      return [u?.code, u?.model_name, r.site_name, r.site_location, clientName(r.clients), r.contracts?.contract_number].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
    // em andamento: quem termina primeiro (ou está atrasado) vem no topo; agendadas pelo começo; encerradas pelas mais recentes
    return list.sort((a, b) => {
      const pa = phaseOf(a), pb = phaseOf(b);
      if (pa !== pb) return ["active", "scheduled", "finished", "cancelled"].indexOf(pa) - ["active", "scheduled", "finished", "cancelled"].indexOf(pb);
      if (pa === "active") return dayNum(a.planned_end_date) - dayNum(b.planned_end_date);
      if (pa === "scheduled") return dayNum(a.start_date) - dayNum(b.start_date);
      return dayNum(b.actual_end_date ?? b.planned_end_date) - dayNum(a.actual_end_date ?? a.planned_end_date);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter, q, today]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar locações">
          {(Object.keys(LABEL) as Filter[]).map((k) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
              className={cn("rounded-full border px-3 py-1 text-sm transition-colors", filter === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {LABEL[k]} <span className="opacity-70">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar obra, cliente ou grua" className="pl-9" aria-label="Buscar obra, cliente ou grua" />
        </div>
      </div>
      <RentalList rentals={shown} data={data} today={today} empty={q ? "Nenhuma locação encontrada." : filter === "active" ? "Nenhuma grua em obra no momento." : "Nada por aqui."} />
    </div>
  );
}
