import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertOctagon, AlertTriangle, BadgeCheck, CalendarClock, CircleDollarSign, Clock, Construction, Gauge, Hourglass, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { buildPanorama, revenueByMonth, type AlertKind, type ContractInfo } from "@/lib/fleet";
import { brl, brlCompact, pct } from "@/lib/fleetFormat";
import { clientName, type FleetData } from "@/lib/fleetApi";
import { ColumnChart, HBarList, StatTile } from "@/components/reports/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FleetGantt } from "./FleetGantt";
import { cn } from "@/lib/utils";

const ALERT_ICON: Record<AlertKind, typeof AlertTriangle> = {
  overdue: AlertOctagon, waiting: Clock, ending_soon: CalendarClock, unsigned: AlertTriangle, idle: Hourglass,
};
const SEVERITY_STYLE = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
} as const;
const SEVERITY_LABEL = { high: "Urgente", medium: "Atenção", low: "Aviso" } as const;

const axisK = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n));

/** Panorama da frota: números-chave, o que precisa de atenção, linha do tempo e gráficos de receita e rentabilidade. */
export function FleetPanorama({ data, today }: { data: FleetData; today: string }) {
  const panorama = useMemo(() => {
    const contracts: Record<string, ContractInfo> = {};
    const clientNames: Record<string, string> = {};
    for (const r of data.rentals) {
      if (r.contract_id && r.contracts) contracts[r.contract_id] = { status: r.contracts.status, signed_at: r.contracts.signed_at };
      if (r.client_id) clientNames[r.client_id] = clientName(r.clients) || data.clients.find((c) => c.id === r.client_id)?.name || "";
    }
    const catalogMonthly: Record<string, number> = {};
    for (const c of data.catalog) if (c.rental_monthly_price) catalogMonthly[c.id] = c.rental_monthly_price;
    return buildPanorama({ units: data.units, rentals: data.rentals, costs: data.costs, contracts, clientNames, catalogMonthly, today });
  }, [data, today]);

  const past = useMemo(() => revenueByMonth(data.rentals, today, 11, 0), [data.rentals, today]);
  const future = useMemo(() => revenueByMonth(data.rentals, today, -1, 6), [data.rentals, today]);

  const p = panorama;
  const perUnit = [...p.rows].filter((r) => r.finance.revenue > 0).sort((a, b) => b.finance.revenue - a.finance.revenue).slice(0, 8);
  const c = p.counts;

  return (
    <div className="space-y-6">
      <section aria-label="Números da frota" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Gruas na frota" value={p.totalUnits} icon={<Construction className="h-4 w-4" />}
          hint={`${c.rented} em obra · ${c.available} ${c.available === 1 ? "livre" : "livres"}${c.reserved ? ` · ${c.reserved} ${c.reserved === 1 ? "reservada" : "reservadas"}` : ""}${c.maintenance ? ` · ${c.maintenance} em manutenção` : ""}`} />
        <StatTile label="Utilização (12 meses)" value={pct(p.utilization12mPct, 0)} icon={<Gauge className="h-4 w-4" />} hint="dias em obra ÷ dias disponíveis" />
        <StatTile label="Receita mensal recorrente" value={brlCompact(p.recurringMonthly)} icon={<CircleDollarSign className="h-4 w-4" />} hint="mensalidades das locações em andamento" />
        <StatTile label="Receita acumulada" value={brlCompact(p.revenue)} icon={<Wallet className="h-4 w-4" />} hint="aluguel + mobilização + desmobilização" />
        <StatTile label="Valor empregado" value={brlCompact(p.capital)} icon={<PiggyBank className="h-4 w-4" />} hint="compra das gruas + investimentos" />
        <StatTile label="Resultado" value={brlCompact(p.net)} icon={<TrendingUp className="h-4 w-4" />} hint={`receita − custos de operação (${brlCompact(p.opCosts)})`} />
        <StatTile label="Rentabilidade (ROI)" value={pct(p.roiPct)} icon={<BadgeCheck className="h-4 w-4" />} hint="resultado ÷ valor empregado" />
        <StatTile label="Capital parado" value={brlCompact(p.idleCapital)} icon={<Hourglass className="h-4 w-4" />}
          hint={c.available ? `${c.available} ${c.available === 1 ? "grua livre" : "gruas livres"}${p.idlePotentialMonthly ? ` · renderiam ~${brlCompact(p.idlePotentialMonthly)}/mês` : ""}` : "nenhuma grua parada"} />
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Precisa de atenção</CardTitle>
          <CardDescription>Prazos, devoluções, clientes esperando e contratos sem assinatura.</CardDescription>
        </CardHeader>
        <CardContent>
          {p.alerts.length === 0 ? (
            <p className="flex items-center gap-2 py-4 text-sm text-emerald-700 dark:text-emerald-400"><BadgeCheck className="h-4 w-4" /> Tudo em dia: nenhum prazo estourado, nenhum cliente esperando.</p>
          ) : (
            <ul className="divide-y" aria-label="Alertas da frota">
              {p.alerts.map((a) => {
                const Icon = ALERT_ICON[a.kind];
                return (
                  <li key={a.id}>
                    <Link to={`/frota/gruas/${a.unitId}`} className="flex gap-3 py-3 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", SEVERITY_STYLE[a.severity])} aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-medium"><span className="sr-only">{SEVERITY_LABEL[a.severity]}: </span>{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.detail}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Linha do tempo das locações</CardTitle>
          <CardDescription>Onde cada grua esteve e vai estar nos próximos meses. Role para o lado no celular.</CardDescription>
        </CardHeader>
        <CardContent><FleetGantt units={data.units} rentals={data.rentals} today={today} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ColumnChart title="Receita por mês" description="Últimos 12 meses (aluguel, mobilização e desmobilização)" data={past.map((m) => ({ label: m.label, value: m.revenue }))}
          format={brl} axisFormat={axisK} valueHeader="Receita" />
        <ColumnChart title="Receita prevista" description="Próximos 6 meses, pelo prazo dos contratos" data={future.map((m) => ({ label: m.label, value: m.revenue }))}
          format={brl} axisFormat={axisK} valueHeader="Previsto" />
      </div>

      <HBarList
        title="Receita acumulada por grua"
        description="Quanto cada grua já rendeu, com a rentabilidade sobre o valor empregado"
        items={perUnit.map((r) => ({ label: r.unit.code, value: r.finance.revenue, display: brlCompact(r.finance.revenue), hint: r.finance.roiPct == null ? "sem valor empregado" : `ROI ${pct(r.finance.roiPct)}` }))}
        empty="Ainda não há receita registrada. Aloque uma grua a uma obra."
      />
    </div>
  );
}
