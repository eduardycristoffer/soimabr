import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useFleetStatus } from "@/hooks/useFleetEnabled";
import { useFleetData, useRefreshFleet } from "@/hooks/useFleet";
import { COST_KIND_LABEL, unitFinance, unitSnapshot, todayISO } from "@/lib/fleet";
import { deleteCost, fleetErrorMessage } from "@/lib/fleetApi";
import { brl, brlCompact, dateBR, monthsLabel, pct } from "@/lib/fleetFormat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/reports/charts";
import { CostFormDialog } from "@/components/fleet/CostFormDialog";
import { FleetGantt } from "@/components/fleet/FleetGantt";
import { RentalFormDialog } from "@/components/fleet/RentalFormDialog";
import { RentalList } from "@/components/fleet/RentalList";
import { UnitFormDialog } from "@/components/fleet/UnitFormDialog";
import { RentalProgress, specsLine, UnitStateBadge } from "@/components/fleet/parts";
import { cn } from "@/lib/utils";

export default function FrotaGrua() {
  const { id } = useParams();
  const { isAdmin, isLoading } = useAuth();
  const status = useFleetStatus(isAdmin);
  const q = useFleetData(status === "ready" && isAdmin);
  const refresh = useRefreshFleet();
  const [edit, setEdit] = useState(false);
  const [rent, setRent] = useState(false);
  const [cost, setCost] = useState(false);
  const today = todayISO();
  const data = q.data;

  const unit = data?.units.find((u) => u.id === id);
  const rentals = useMemo(() => (data ? data.rentals.filter((r) => r.unit_id === id) : []), [data, id]);
  const costs = useMemo(() => (data ? data.costs.filter((c) => c.unit_id === id) : []), [data, id]);
  const snap = unit ? unitSnapshot(unit, rentals, today) : null;
  const fin = unit ? unitFinance(unit, costs, rentals, today) : null;

  const removeCost = useMutation({
    mutationFn: (costId: string) => deleteCost(costId),
    onSuccess: () => { refresh(); toast({ title: "Lançamento removido" }); },
    onError: (e) => toast({ title: "Não foi possível remover", description: fleetErrorMessage(e), variant: "destructive" }),
  });

  if (isLoading) return null;
  if (!isAdmin || status === "missing") return <Navigate to={isAdmin ? "/frota" : "/dashboard"} replace />;
  if (status === "loading" || q.isLoading) return <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (q.error || !data) return <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar a frota.</div>;
  if (!unit || !snap || !fin) {
    return (
      <div className="space-y-3">
        <Link to="/frota" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Frota</Link>
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Grua não encontrada.</p>
      </div>
    );
  }

  const productName = data.catalog.find((c) => c.id === unit.product_id)?.nome;
  const sortedCosts = [...costs].sort((a, b) => b.incurred_on.localeCompare(a.incurred_on));
  const cur = snap.current && rentals.find((r) => r.id === snap.current!.id);

  return (
    <div className="space-y-6">
      <Link to="/frota" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Frota</Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{unit.code}</h1>
            <UnitStateBadge state={snap.state} />
          </div>
          <p className="text-muted-foreground">{[unit.model_name || productName, unit.serial_number && `nº de série ${unit.serial_number}`, unit.year_manufactured && `ano ${unit.year_manufactured}`].filter(Boolean).join(" · ") || "Sem modelo informado"}</p>
          {specsLine(unit) && <p className="mt-1 text-sm">{specsLine(unit)}</p>}
          {unit.location_note && snap.state !== "rented" && <p className="mt-1 text-sm text-muted-foreground">Onde está: {unit.location_note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="mr-1.5 h-4 w-4" /> Editar</Button>
          <Button variant="outline" onClick={() => setCost(true)}><Receipt className="mr-1.5 h-4 w-4" /> Lançar custo</Button>
          <Button onClick={() => setRent(true)} disabled={unit.status === "retired"}><Plus className="mr-1.5 h-4 w-4" /> Alocar a uma obra</Button>
        </div>
      </div>

      {cur && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Em obra agora</CardTitle>
            <CardDescription>{[cur.site_name, cur.clients?.nome_fantasia || cur.clients?.razao_social].filter(Boolean).join(" · ") || "Obra sem nome"}{cur.site_location ? ` — ${cur.site_location}` : ""}</CardDescription>
          </CardHeader>
          <CardContent><RentalProgress rental={cur} today={today} /></CardContent>
        </Card>
      )}

      <section aria-label="Números da grua" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Valor empregado" value={brlCompact(fin.capital)} hint={`compra ${brlCompact(unit.acquisition_cost)}${fin.capital > unit.acquisition_cost ? ` + ${brlCompact(fin.capital - unit.acquisition_cost)} investidos` : ""}`} />
        <StatTile label="Receita acumulada" value={brlCompact(fin.revenue)} hint="aluguel + mobilização + desmobilização" />
        <StatTile label="Custos de operação" value={brlCompact(fin.opCosts)} hint="manutenção, frete, montagem, seguro..." />
        <StatTile label="Resultado" value={<span className={cn(fin.net < 0 && "text-red-600 dark:text-red-400")}>{brlCompact(fin.net)}</span>} hint="receita − custos de operação" />
        <StatTile label="Rentabilidade (ROI)" value={pct(fin.roiPct)} hint="resultado ÷ valor empregado" />
        <StatTile label="Rendimento mensal" value={pct(fin.monthlyYieldPct, 2)} hint="mensalidade atual ÷ valor empregado" />
        <StatTile label="Retorno do investimento" value={fin.paybackMonths == null ? "—" : fin.paybackMonths === 0 ? "Recuperado" : monthsLabel(fin.paybackMonths)}
          hint={fin.paybackMonths == null ? "faltam dados para estimar" : fin.paybackMonths === 0 ? "o resultado já cobre o valor empregado" : "que faltam, no ritmo atual"} />
        <StatTile label="Utilização (12 meses)" value={pct(fin.utilization12mPct, 0)} hint={`${fin.rentedDays12m} dias em obra`} />
      </section>

      <Card className="min-w-0">
        <CardHeader className="pb-2"><CardTitle className="text-base">Linha do tempo</CardTitle></CardHeader>
        <CardContent><FleetGantt units={[unit]} rentals={rentals} today={today} backMonths={6} totalMonths={15} linkUnits={false} /></CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Locações ({rentals.length})</h2>
        <RentalList rentals={rentals} data={data} today={today} showUnit={false} empty="Esta grua ainda não foi alocada a nenhuma obra." />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Custos e investimentos ({costs.length})</h2>
          <Button size="sm" variant="outline" onClick={() => setCost(true)}><Plus className="mr-1.5 h-4 w-4" /> Lançar</Button>
        </div>
        {sortedCosts.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum lançamento. Registre manutenção, frete e investimentos para ver o resultado real.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card" aria-label="Custos e investimentos">
            {sortedCosts.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{COST_KIND_LABEL[c.kind]}{c.description ? <span className="font-normal text-muted-foreground"> — {c.description}</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{dateBR(c.incurred_on)}</p>
                </div>
                <p className={cn("text-sm font-medium tabular-nums", c.kind === "investimento" && "text-blue-700 dark:text-blue-300")}>{brl(c.amount)}</p>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={`Remover lançamento de ${brl(c.amount)}`} onClick={() => removeCost.mutate(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <UnitFormDialog open={edit} onClose={() => setEdit(false)} unit={unit} catalog={data.catalog} existingCodes={data.units.map((u) => u.code)} />
      <RentalFormDialog open={rent} onClose={() => setRent(false)} data={data} presetUnitId={unit.id} />
      <CostFormDialog open={cost} onClose={() => setCost(false)} unitId={unit.id} unitCode={unit.code} />
    </div>
  );
}
