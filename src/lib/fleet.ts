/**
 * Gestão da frota de gruas locadas em obras: regras de prazo, ocupação, receita e rentabilidade.
 *
 * Tudo aqui é cálculo puro (sem tela e sem banco), para ser testado de ponta a ponta.
 * Datas são texto "AAAA-MM-DD" (dia civil, sem horário), contadas no fuso de Brasília.
 *
 * Conceitos:
 *  - Grua (unidade): o equipamento físico, com número/patrimônio, medidas e o valor investido.
 *  - Locação: a grua numa obra, de uma data a outra, ligada ao contrato e ao cliente.
 *  - Valor empregado (capital): preço de compra + investimentos feitos depois (reforma, upgrade...).
 *  - Receita: aluguel mensal pro rata dos dias em obra + mobilização (ao iniciar) + desmobilização (ao encerrar).
 *  - Resultado: receita − custos de operação (manutenção, frete, montagem, seguro, impostos...).
 *  - Rentabilidade (ROI): resultado ÷ valor empregado.
 */

// ───────────────────────── tipos ─────────────────────────

export type UnitStatus = "active" | "maintenance" | "retired";

export interface FleetUnit {
  id: string;
  code: string;
  product_id: string | null;
  model_name: string | null;
  serial_number: string | null;
  year_manufactured: number | null;
  lanca_m: number | null;
  altura_torre_m: number | null;
  carga_maxima_kg: number | null;
  carga_ponta_kg: number | null;
  acquisition_cost: number;
  acquisition_date: string | null;
  status: UnitStatus;
  location_note: string | null;
  notes: string | null;
}

export interface FleetRental {
  id: string;
  unit_id: string;
  contract_id: string | null;
  quote_id: string | null;
  client_id: string | null;
  site_name: string | null;
  site_location: string | null;
  start_date: string;
  planned_end_date: string;
  actual_end_date: string | null;
  cancelled_at: string | null;
  monthly_value: number;
  mobilization_value: number;
  demobilization_value: number;
  notes: string | null;
}

export type CostKind = "investimento" | "manutencao" | "frete" | "montagem" | "seguro" | "impostos" | "outros";

export const COST_KIND_LABEL: Record<CostKind, string> = {
  investimento: "Investimento (reforma, upgrade)",
  manutencao: "Manutenção",
  frete: "Frete",
  montagem: "Montagem / desmontagem",
  seguro: "Seguro",
  impostos: "Impostos",
  outros: "Outros",
};

export interface FleetCost {
  id: string;
  unit_id: string;
  rental_id: string | null;
  kind: CostKind;
  amount: number;
  incurred_on: string;
  description: string | null;
}

// ───────────────────────── datas ─────────────────────────

const MS_DAY = 86_400_000;

const parts = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
};

/** Número do dia (dias desde 1970), para somar e subtrair datas sem problema de fuso/horário de verão. */
export const dayNum = (iso: string): number => {
  const [y, m, d] = parts(iso);
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
};
export const isoFromDayNum = (n: number): string => new Date(n * MS_DAY).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => isoFromDayNum(dayNum(iso) + n);
/** Quantos dias de `a` até `b` (positivo se b é depois). */
export const diffDays = (a: string, b: string): number => dayNum(b) - dayNum(a);
export const minDate = (a: string, b: string) => (dayNum(a) <= dayNum(b) ? a : b);
export const maxDate = (a: string, b: string) => (dayNum(a) >= dayNum(b) ? a : b);

/** Hoje em Brasília (a virada do dia não pode depender do fuso do computador). */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Soma meses mantendo o dia (31/01 + 1 mês = 28/02). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12 + 12) % 12 + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/**
 * Meses entre duas datas (fim exclusivo): meses cheios do calendário + dias que sobram ÷ 30.
 * 01/03 até 01/03 do ano seguinte = 12; 15 dias soltos = 0,5.
 */
export function monthsBetween(start: string, endExclusive: string): number {
  if (dayNum(endExclusive) <= dayNum(start)) return 0;
  const [sy, sm] = parts(start);
  const [ey, em] = parts(endExclusive);
  let whole = (ey - sy) * 12 + (em - sm);
  let anchor = addMonths(start, whole);
  if (dayNum(anchor) > dayNum(endExclusive)) {
    whole -= 1;
    anchor = addMonths(start, whole);
  }
  return whole + diffDays(anchor, endExclusive) / 30;
}

/** Último dia de uma locação que começa em `start` e dura `months` meses (12 meses a partir de 01/03 terminam em 28/02). */
export const endDateForMonths = (start: string, months: number): string => {
  const whole = Math.floor(months);
  const frac = months - whole;
  let end = addMonths(start, whole);
  if (frac > 0) end = addDays(end, Math.round(frac * 30));
  return addDays(end, -1);
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);

// ───────────────────────── locação: fase, prazo e receita ─────────────────────────

export type RentalPhase = "scheduled" | "active" | "finished" | "cancelled";

export function rentalPhase(r: FleetRental, today: string): RentalPhase {
  if (r.cancelled_at) return "cancelled";
  if (r.actual_end_date && dayNum(r.actual_end_date) <= dayNum(today)) return "finished";
  if (dayNum(r.start_date) > dayNum(today)) return "scheduled";
  return "active";
}

export interface RentalTimeline {
  phase: RentalPhase;
  /** dias do prazo contratual (início e fim contam) */
  totalDays: number;
  elapsedDays: number;
  /** dias que faltam para o fim previsto (0 se já passou) */
  remainingDays: number;
  /** dias além do prazo sem devolução (só em locação ativa) */
  overdueDays: number;
  /** dias até começar (só agendada) */
  daysToStart: number;
  pct: number;
  endingSoon: boolean;
}

export const ENDING_SOON_DAYS = 30;

export function rentalTimeline(r: FleetRental, today: string, soonDays = ENDING_SOON_DAYS): RentalTimeline {
  const phase = rentalPhase(r, today);
  const totalDays = Math.max(1, diffDays(r.start_date, r.planned_end_date) + 1);
  const stop = r.actual_end_date ? minDate(r.actual_end_date, today) : today;
  const elapsedDays = phase === "scheduled" || phase === "cancelled" ? 0 : Math.max(0, Math.min(totalDays, diffDays(r.start_date, stop) + 1));
  const open = phase === "active";
  const overdueDays = open ? Math.max(0, diffDays(r.planned_end_date, today)) : 0;
  const remainingDays = open ? Math.max(0, diffDays(today, r.planned_end_date)) : 0;
  return {
    phase,
    totalDays,
    elapsedDays,
    remainingDays,
    overdueDays,
    daysToStart: phase === "scheduled" ? diffDays(today, r.start_date) : 0,
    pct: phase === "finished" ? 100 : Math.round((elapsedDays / totalDays) * 100),
    endingSoon: open && overdueDays === 0 && remainingDays <= soonDays,
  };
}

/** Meses previstos no contrato. */
export const plannedMonths = (r: FleetRental): number => monthsBetween(r.start_date, addDays(r.planned_end_date, 1));

/** Valor total previsto no contrato: mensalidade × meses + mobilização + desmobilização. */
export const plannedTotal = (r: FleetRental): number =>
  round2(num(r.monthly_value) * plannedMonths(r) + num(r.mobilization_value) + num(r.demobilization_value));

export interface RentalRevenue {
  planned: number;
  /** receita reconhecida até a data */
  accrued: number;
  accruedMonths: number;
  /** dias cobrados além do prazo do contrato (grua ainda na obra) */
  extraDays: number;
}

/**
 * Receita da locação até `asOf`. Regras:
 *  - aluguel: mensalidade × meses (pro rata) do início até a data (ou até a devolução);
 *  - locação em aberto continua rendendo além do prazo enquanto a grua não voltar;
 *  - para datas futuras (projeção) só conta o prazo contratual;
 *  - mobilização entra ao iniciar; desmobilização só ao encerrar (ou, na projeção, no fim previsto).
 */
export function rentalRevenue(r: FleetRental, asOf: string, today: string = todayISO()): RentalRevenue {
  const planned = plannedTotal(r);
  if (r.cancelled_at) return { planned: 0, accrued: 0, accruedMonths: 0, extraDays: 0 };

  const started = dayNum(asOf) >= dayNum(r.start_date);
  let limit: string;
  if (r.actual_end_date) limit = minDate(asOf, r.actual_end_date);
  else limit = minDate(asOf, maxDate(r.planned_end_date, today));

  const accruedMonths = started ? monthsBetween(r.start_date, addDays(limit, 1)) : 0;
  const mob = started ? num(r.mobilization_value) : 0;
  const demob = r.actual_end_date
    ? dayNum(asOf) >= dayNum(r.actual_end_date) ? num(r.demobilization_value) : 0
    : dayNum(asOf) > dayNum(today) && dayNum(r.planned_end_date) > dayNum(today) && dayNum(asOf) >= dayNum(r.planned_end_date)
      ? num(r.demobilization_value)
      : 0;

  const end = r.actual_end_date ?? today;
  const extraDays = Math.max(0, diffDays(r.planned_end_date, minDate(end, maxDate(asOf, r.planned_end_date))));
  return { planned, accrued: round2(num(r.monthly_value) * accruedMonths + mob + demob), accruedMonths, extraDays: started ? extraDays : 0 };
}

// ───────────────────────── grua: situação, conflitos e compatibilidade ─────────────────────────

export type UnitState = "rented" | "reserved" | "available" | "maintenance" | "retired";

export const UNIT_STATE_LABEL: Record<UnitState, string> = {
  rented: "Em obra",
  reserved: "Reservada",
  available: "Disponível",
  maintenance: "Em manutenção",
  retired: "Baixada",
};

export interface UnitSnapshot {
  state: UnitState;
  /** locação em andamento */
  current: FleetRental | null;
  /** próxima locação agendada */
  next: FleetRental | null;
  /** a partir de quando a grua fica livre (hoje, se já está livre) */
  freeFrom: string | null;
  /** há quantos dias está parada (sem locação em andamento) */
  idleDays: number | null;
  /** a grua ainda está na obra, mas já há cliente esperando */
  waiting: boolean;
}

export function unitSnapshot(unit: FleetUnit, unitRentals: FleetRental[], today: string): UnitSnapshot {
  const live = unitRentals.filter((r) => {
    const p = rentalPhase(r, today);
    return p === "active" || p === "scheduled";
  });
  const current = live.filter((r) => rentalPhase(r, today) === "active").sort((a, b) => dayNum(a.start_date) - dayNum(b.start_date))[0] ?? null;
  const next = live.filter((r) => rentalPhase(r, today) === "scheduled").sort((a, b) => dayNum(a.start_date) - dayNum(b.start_date))[0] ?? null;

  const lastEnd = unitRentals
    .filter((r) => !r.cancelled_at && r.actual_end_date && dayNum(r.actual_end_date) <= dayNum(today))
    .map((r) => r.actual_end_date as string)
    .sort((a, b) => dayNum(b) - dayNum(a))[0];
  const since = lastEnd ?? unit.acquisition_date ?? null;

  let state: UnitState;
  if (unit.status === "retired") state = "retired";
  else if (unit.status === "maintenance") state = "maintenance";
  else if (current) state = "rented";
  else if (next) state = "reserved";
  else state = "available";

  const overdue = !!current && dayNum(current.planned_end_date) < dayNum(today);
  const waiting = !!current && !!next && (overdue || dayNum(current.planned_end_date) >= dayNum(next.start_date));

  return {
    state,
    current,
    next,
    freeFrom: current ? (overdue ? today : addDays(current.planned_end_date, 1)) : today,
    idleDays: current || !since ? null : Math.max(0, diffDays(since, today)),
    waiting,
  };
}

/** Janela em que a locação ocupa a grua: do início até a devolução (ou o fim previsto). */
const occupiedUntil = (r: FleetRental) => r.actual_end_date ?? r.planned_end_date;

/** Outra locação da mesma grua que bate com o período pedido (fim inclusive). */
export function findOverlap(
  rentals: FleetRental[],
  candidate: { unit_id: string; start_date: string; planned_end_date: string; ignoreId?: string },
): FleetRental | undefined {
  return rentals.find(
    (r) =>
      r.unit_id === candidate.unit_id &&
      r.id !== candidate.ignoreId &&
      !r.cancelled_at &&
      dayNum(candidate.start_date) <= dayNum(occupiedUntil(r)) &&
      dayNum(candidate.planned_end_date) >= dayNum(r.start_date),
  );
}

export interface Requirements {
  height_m?: number | null;
  jib_m?: number | null;
  weight_kg?: number | null;
}

export interface Compatibility {
  ok: boolean;
  /** o que não atende ou não dá para conferir */
  reasons: string[];
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** A grua atende às exigências da obra (altura, lança, carga)? Medidas não cadastradas viram aviso, não aprovação. */
export function compatibility(unit: Pick<FleetUnit, "altura_torre_m" | "lanca_m" | "carga_maxima_kg">, req: Requirements): Compatibility {
  const reasons: string[] = [];
  const check = (label: string, have: number | null, need: number | null | undefined, unitSuffix: string) => {
    const n = num(need);
    if (n <= 0) return;
    if (have == null) reasons.push(`${label}: medida da grua não cadastrada (a obra pede ${fmt(n)} ${unitSuffix})`);
    else if (have < n) reasons.push(`${label}: a grua tem ${fmt(have)} ${unitSuffix}, a obra pede ${fmt(n)} ${unitSuffix}`);
  };
  check("Altura", unit.altura_torre_m, req.height_m, "m");
  check("Lança", unit.lanca_m, req.jib_m, "m");
  check("Carga", unit.carga_maxima_kg, req.weight_kg, "kg");
  return { ok: reasons.length === 0, reasons };
}

// ───────────────────────── financeiro por grua ─────────────────────────

export interface UnitFinance {
  /** valor empregado: compra + investimentos */
  capital: number;
  revenue: number;
  opCosts: number;
  net: number;
  /** resultado ÷ valor empregado, em % (null sem valor empregado) */
  roiPct: number | null;
  /** mensalidade atual ÷ valor empregado, em % ao mês */
  monthlyYieldPct: number | null;
  /** meses que faltam para recuperar o valor empregado, no ritmo médio atual (0 = já recuperou; null = sem como estimar) */
  paybackMonths: number | null;
  /** % dos últimos 12 meses em que a grua esteve em obra */
  utilization12mPct: number;
  rentedDays12m: number;
}

/** Dias do período [from, to] cobertos por locações (sobreposição conta uma vez só). */
export function rentedDaysInWindow(rentals: FleetRental[], from: string, to: string, today: string): number {
  const spans: Array<[number, number]> = [];
  for (const r of rentals) {
    const phase = rentalPhase(r, today);
    if (phase === "cancelled" || phase === "scheduled") continue;
    const end = r.actual_end_date ?? today;
    const s = Math.max(dayNum(r.start_date), dayNum(from));
    const e = Math.min(dayNum(end), dayNum(to));
    if (e >= s) spans.push([s, e]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curS = -Infinity;
  let curE = -Infinity;
  for (const [s, e] of spans) {
    if (s > curE) {
      if (curE >= curS && isFinite(curE)) total += curE - curS + 1;
      curS = s;
      curE = e;
    } else curE = Math.max(curE, e);
  }
  if (isFinite(curE)) total += curE - curS + 1;
  return total;
}

export function unitFinance(unit: FleetUnit, costs: FleetCost[], unitRentals: FleetRental[], asOf: string): UnitFinance {
  const mine = costs.filter((c) => c.unit_id === unit.id && dayNum(c.incurred_on) <= dayNum(asOf));
  const capital = round2(num(unit.acquisition_cost) + mine.filter((c) => c.kind === "investimento").reduce((s, c) => s + num(c.amount), 0));
  const opCosts = round2(mine.filter((c) => c.kind !== "investimento").reduce((s, c) => s + num(c.amount), 0));
  const live = unitRentals.filter((r) => !r.cancelled_at);
  const revenue = round2(live.reduce((s, r) => s + rentalRevenue(r, asOf, asOf).accrued, 0));
  const net = round2(revenue - opCosts);

  const current = live.find((r) => rentalPhase(r, asOf) === "active");
  const monthlyYieldPct = capital > 0 && current && num(current.monthly_value) > 0 ? (num(current.monthly_value) / capital) * 100 : null;

  const firstStart = live.filter((r) => dayNum(r.start_date) <= dayNum(asOf)).map((r) => r.start_date).sort((a, b) => dayNum(a) - dayNum(b))[0];
  const opMonths = firstStart ? monthsBetween(firstStart, addDays(asOf, 1)) : 0;
  const avgMonthlyNet = opMonths > 0 ? net / opMonths : null;
  let paybackMonths: number | null = null;
  if (capital > 0) {
    if (net >= capital) paybackMonths = 0;
    else if (avgMonthlyNet && avgMonthlyNet > 0) paybackMonths = round2((capital - net) / avgMonthlyNet);
  }

  const windowStart0 = addDays(asOf, -364);
  const windowStart = unit.acquisition_date ? maxDate(windowStart0, unit.acquisition_date) : windowStart0;
  const windowDays = Math.max(1, diffDays(windowStart, asOf) + 1);
  const rentedDays12m = rentedDaysInWindow(live, windowStart, asOf, asOf);

  return {
    capital,
    revenue,
    opCosts,
    net,
    roiPct: capital > 0 ? (net / capital) * 100 : null,
    monthlyYieldPct,
    paybackMonths,
    utilization12mPct: Math.min(100, (rentedDays12m / windowDays) * 100),
    rentedDays12m,
  };
}

// ───────────────────────── panorama da frota ─────────────────────────

export interface ContractInfo {
  status: string | null;
  signed_at: string | null;
}

export type AlertKind = "overdue" | "waiting" | "ending_soon" | "unsigned" | "idle";
export interface FleetAlert {
  id: string;
  kind: AlertKind;
  severity: "high" | "medium" | "low";
  unitId: string;
  rentalId?: string;
  title: string;
  detail: string;
}

export interface UnitRow {
  unit: FleetUnit;
  snapshot: UnitSnapshot;
  finance: UnitFinance;
  rentals: FleetRental[];
}

export interface Panorama {
  rows: UnitRow[];
  counts: Record<UnitState, number>;
  /** gruas ativas no cadastro (sem as baixadas) */
  totalUnits: number;
  recurringMonthly: number;
  capital: number;
  revenue: number;
  opCosts: number;
  net: number;
  roiPct: number | null;
  utilization12mPct: number;
  /** valor empregado em gruas paradas, sem locação */
  idleCapital: number;
  /** quanto as gruas paradas renderiam por mês pelo preço de tabela de locação */
  idlePotentialMonthly: number;
  alerts: FleetAlert[];
  endingSoon: number;
  overdue: number;
  waiting: number;
  unsigned: number;
}

const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const siteLabel = (r: FleetRental, clientName?: string) => [r.site_name, clientName].filter(Boolean).join(" — ") || "obra sem nome";

export interface PanoramaInput {
  units: FleetUnit[];
  rentals: FleetRental[];
  costs: FleetCost[];
  /** contratos ligados às locações, por id */
  contracts?: Record<string, ContractInfo>;
  /** nome do cliente por id (para os textos dos alertas) */
  clientNames?: Record<string, string>;
  /** preço de tabela de locação por produto (para estimar o que as gruas paradas renderiam) */
  catalogMonthly?: Record<string, number>;
  today: string;
  idleAlertDays?: number;
}

export function buildPanorama(input: PanoramaInput): Panorama {
  const { units, rentals, costs, today } = input;
  const contracts = input.contracts ?? {};
  const names = input.clientNames ?? {};
  const idleLimit = input.idleAlertDays ?? 30;
  const byUnit = new Map<string, FleetRental[]>();
  for (const r of rentals) byUnit.set(r.unit_id, [...(byUnit.get(r.unit_id) ?? []), r]);

  const rows: UnitRow[] = units.map((unit) => {
    const mine = byUnit.get(unit.id) ?? [];
    return { unit, snapshot: unitSnapshot(unit, mine, today), finance: unitFinance(unit, costs, mine, today), rentals: mine };
  });

  const counts: Record<UnitState, number> = { rented: 0, reserved: 0, available: 0, maintenance: 0, retired: 0 };
  rows.forEach((r) => (counts[r.snapshot.state] += 1));
  const inFleet = rows.filter((r) => r.snapshot.state !== "retired");

  const alerts: FleetAlert[] = [];
  let endingSoon = 0;
  let overdue = 0;
  let waiting = 0;
  let unsigned = 0;

  for (const row of inFleet) {
    const { unit, snapshot } = row;
    const cur = snapshot.current;
    if (cur) {
      const tl = rentalTimeline(cur, today);
      const where = siteLabel(cur, cur.client_id ? names[cur.client_id] : undefined);
      if (tl.overdueDays > 0) {
        overdue += 1;
        alerts.push({
          id: `overdue-${cur.id}`, kind: "overdue", severity: "high", unitId: unit.id, rentalId: cur.id,
          title: `${unit.code}: devolução atrasada ${tl.overdueDays} ${plural(tl.overdueDays, "dia", "dias")}`,
          detail: `${where}. O prazo terminou em ${fmtDate(cur.planned_end_date)}. Registre a devolução ou prorrogue o contrato.`,
        });
      } else if (tl.endingSoon) {
        endingSoon += 1;
        alerts.push({
          id: `ending-${cur.id}`, kind: "ending_soon", severity: tl.remainingDays <= 7 ? "high" : "medium", unitId: unit.id, rentalId: cur.id,
          title: `${unit.code}: contrato termina em ${tl.remainingDays} ${plural(tl.remainingDays, "dia", "dias")}`,
          detail: `${where}. Fim previsto em ${fmtDate(cur.planned_end_date)}: prorrogar ou programar a desmontagem.`,
        });
      }
      if (snapshot.waiting && snapshot.next) {
        waiting += 1;
        const nx = snapshot.next;
        const nxName = nx.client_id ? names[nx.client_id] : undefined;
        alerts.push({
          id: `waiting-${nx.id}`, kind: "waiting", severity: "high", unitId: unit.id, rentalId: nx.id,
          title: `${unit.code}: cliente esperando a grua`,
          detail: `${nxName ?? "Próximo cliente"} espera desde ${fmtDate(nx.start_date)}, mas a grua ainda está em ${where} (previsto até ${fmtDate(cur.planned_end_date)}).`,
        });
      }
    }
    for (const r of row.rentals) {
      const ph = rentalPhase(r, today);
      if (ph !== "active" && !(ph === "scheduled" && diffDays(today, r.start_date) <= 7)) continue;
      const c = r.contract_id ? contracts[r.contract_id] : undefined;
      if (c?.status === "signed") continue;
      unsigned += 1;
      const where = siteLabel(r, r.client_id ? names[r.client_id] : undefined);
      alerts.push({
        id: `unsigned-${r.id}`, kind: "unsigned", severity: ph === "active" ? "high" : "medium", unitId: unit.id, rentalId: r.id,
        title: `${unit.code}: ${ph === "active" ? "grua em obra sem contrato assinado" : "locação perto de começar sem contrato assinado"}`,
        detail: r.contract_id ? `${where}. O contrato ainda não foi assinado.` : `${where}. Nenhum contrato está ligado a esta locação.`,
      });
    }
    if (snapshot.state === "available" && snapshot.idleDays != null && snapshot.idleDays >= idleLimit) {
      alerts.push({
        id: `idle-${unit.id}`, kind: "idle", severity: "low", unitId: unit.id,
        title: `${unit.code}: parada há ${snapshot.idleDays} dias`,
        detail: "Sem locação em andamento nem agendada. Capital parado.",
      });
    }
  }

  const sevOrder = { high: 0, medium: 1, low: 2 } as const;
  alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || a.title.localeCompare(b.title, "pt-BR"));

  const capital = round2(inFleet.reduce((s, r) => s + r.finance.capital, 0));
  const revenue = round2(rows.reduce((s, r) => s + r.finance.revenue, 0));
  const opCosts = round2(rows.reduce((s, r) => s + r.finance.opCosts, 0));
  const net = round2(revenue - opCosts);
  const capAll = round2(rows.reduce((s, r) => s + r.finance.capital, 0));
  const availableRows = rows.filter((r) => r.snapshot.state === "available");

  const wDays = inFleet.reduce((s, r) => s + r.finance.rentedDays12m, 0);
  const wTotal = inFleet.reduce((s, r) => {
    const start0 = addDays(today, -364);
    const start = r.unit.acquisition_date ? maxDate(start0, r.unit.acquisition_date) : start0;
    return s + Math.max(1, diffDays(start, today) + 1);
  }, 0);

  return {
    rows,
    counts,
    totalUnits: inFleet.length,
    recurringMonthly: round2(inFleet.reduce((s, r) => s + (r.snapshot.current ? num(r.snapshot.current.monthly_value) : 0), 0)),
    capital,
    revenue,
    opCosts,
    net,
    roiPct: capAll > 0 ? (net / capAll) * 100 : null,
    utilization12mPct: wTotal > 0 ? Math.min(100, (wDays / wTotal) * 100) : 0,
    idleCapital: round2(availableRows.reduce((s, r) => s + r.finance.capital, 0)),
    idlePotentialMonthly: round2(availableRows.reduce((s, r) => s + (r.unit.product_id ? num(input.catalogMonthly?.[r.unit.product_id]) : 0), 0)),
    alerts,
    endingSoon,
    overdue,
    waiting,
    unsigned,
  };
}

// ───────────────────────── receita por mês e linha do tempo ─────────────────────────

export interface MonthPoint {
  /** "AAAA-MM" */
  key: string;
  /** "nov/26" */
  label: string;
  revenue: number;
  /** mês depois de hoje: valor é projeção do prazo contratual */
  projected: boolean;
}

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const monthKey = (iso: string) => iso.slice(0, 7);
export const monthLabel = (key: string) => `${MONTHS_PT[Number(key.slice(5, 7)) - 1]}/${key.slice(2, 4)}`;
const firstOfMonth = (key: string) => `${key}-01`;
const lastOfMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${key}-${String(daysInMonth(y, m)).padStart(2, "0")}`;
};

/** Receita reconhecida em cada mês (de `back` meses atrás até `ahead` meses à frente, que são projeção). */
export function revenueByMonth(rentals: FleetRental[], today: string, back = 11, ahead = 0): MonthPoint[] {
  const cur = monthKey(today);
  const out: MonthPoint[] = [];
  for (let i = -back; i <= ahead; i++) {
    const key = monthKey(addMonths(firstOfMonth(cur), i));
    const from = firstOfMonth(key);
    const to = lastOfMonth(key);
    const before = addDays(from, -1);
    const revenue = round2(
      rentals.reduce((s, r) => {
        if (r.cancelled_at) return s;
        return s + rentalRevenue(r, to, today).accrued - rentalRevenue(r, before, today).accrued;
      }, 0),
    );
    out.push({ key, label: monthLabel(key), revenue, projected: dayNum(from) > dayNum(today) });
  }
  return out;
}

export interface GanttBar {
  rental: FleetRental;
  /** posição e largura em % da janela */
  left: number;
  width: number;
  phase: RentalPhase;
  /** ainda na obra depois do prazo */
  overdue: boolean;
  /** a barra continua para fora da janela */
  clippedLeft: boolean;
  clippedRight: boolean;
}

export interface GanttModel {
  start: string;
  end: string;
  months: Array<{ key: string; label: string; left: number; width: number }>;
  rows: Array<{ unit: FleetUnit; bars: GanttBar[] }>;
  /** posição de "hoje" em % (null se fora da janela) */
  todayPct: number | null;
}

/** Linha do tempo: uma linha por grua, uma barra por locação, numa janela de meses. */
export function ganttModel(units: FleetUnit[], rentals: FleetRental[], today: string, backMonths = 3, totalMonths = 12): GanttModel {
  const startKey = monthKey(addMonths(firstOfMonth(monthKey(today)), -backMonths));
  const endKey = monthKey(addMonths(firstOfMonth(startKey), totalMonths - 1));
  const start = firstOfMonth(startKey);
  const end = lastOfMonth(endKey);
  const span = diffDays(start, end) + 1;
  const pct = (d: string) => (diffDays(start, d) / span) * 100;

  const months = Array.from({ length: totalMonths }, (_, i) => {
    const key = monthKey(addMonths(firstOfMonth(startKey), i));
    const s = firstOfMonth(key);
    const e = lastOfMonth(key);
    return { key, label: monthLabel(key), left: pct(s), width: ((diffDays(s, e) + 1) / span) * 100 };
  });

  const rows = units
    .filter((u) => u.status !== "retired")
    .map((unit) => {
      const bars: GanttBar[] = [];
      for (const r of rentals) {
        if (r.unit_id !== unit.id || r.cancelled_at) continue;
        const phase = rentalPhase(r, today);
        const overdue = phase === "active" && dayNum(r.planned_end_date) < dayNum(today);
        const rawEnd = r.actual_end_date ?? (overdue ? today : r.planned_end_date);
        if (dayNum(rawEnd) < dayNum(start) || dayNum(r.start_date) > dayNum(end)) continue;
        const s = maxDate(r.start_date, start);
        const e = minDate(rawEnd, end);
        bars.push({
          rental: r,
          left: pct(s),
          width: Math.max(0.6, ((diffDays(s, e) + 1) / span) * 100),
          phase,
          overdue,
          clippedLeft: dayNum(r.start_date) < dayNum(start),
          clippedRight: dayNum(rawEnd) > dayNum(end),
        });
      }
      bars.sort((a, b) => a.left - b.left);
      return { unit, bars };
    });

  const t = dayNum(today) >= dayNum(start) && dayNum(today) <= dayNum(end) ? pct(today) : null;
  return { start, end, months, rows, todayPct: t };
}

// ───────────────────────── formulário de locação ─────────────────────────

export interface RentalInput {
  unit_id: string;
  start_date: string;
  planned_end_date: string;
  monthly_value: number;
  mobilization_value: number;
  demobilization_value: number;
}

export interface RentalProblem {
  field: "unit_id" | "start_date" | "planned_end_date" | "monthly_value" | "mobilization_value" | "demobilization_value";
  message: string;
}

/** Confere o formulário antes de gravar (a mesma regra vale para criar e para editar). */
export function validateRental(input: Partial<RentalInput>, rentals: FleetRental[], ignoreId?: string): RentalProblem[] {
  const out: RentalProblem[] = [];
  if (!input.unit_id) out.push({ field: "unit_id", message: "Escolha a grua." });
  if (!input.start_date) out.push({ field: "start_date", message: "Informe a data de início." });
  if (!input.planned_end_date) out.push({ field: "planned_end_date", message: "Informe o término previsto." });
  if (input.start_date && input.planned_end_date && dayNum(input.planned_end_date) < dayNum(input.start_date)) {
    out.push({ field: "planned_end_date", message: "O término não pode ser antes do início." });
  }
  for (const f of ["monthly_value", "mobilization_value", "demobilization_value"] as const) {
    const v = input[f];
    if (v != null && (!isFinite(v) || v < 0)) out.push({ field: f, message: "O valor não pode ser negativo." });
  }
  if (!out.length && input.unit_id && input.start_date && input.planned_end_date) {
    const clash = findOverlap(rentals, { unit_id: input.unit_id, start_date: input.start_date, planned_end_date: input.planned_end_date, ignoreId });
    if (clash) {
      out.push({
        field: "unit_id",
        message: `Esta grua já está ocupada de ${fmtDate(clash.start_date)} até ${fmtDate(occupiedUntil(clash))}${clash.site_name ? ` (${clash.site_name})` : ""}.`,
      });
    }
  }
  return out;
}

/** Dados da proposta de locação (e do contrato) que já preenchem a locação. */
export interface QuoteForRental {
  id: string;
  client_id: string | null;
  project_name: string | null;
  project_location: string | null;
  currency: "BRL" | "USD" | "EUR" | string;
  usd_brl_rate_used: number | null;
  rental_start_date: string | null;
  rental_duration_months: number | null;
  rental_monthly_value: number | null;
  rental_mobilization: number | null;
  rental_demobilization: number | null;
  rental_height_needed: number | null;
  rental_jib_needed: number | null;
  rental_max_weight: number | null;
}

export interface RentalDraft {
  client_id: string | null;
  quote_id: string;
  site_name: string;
  site_location: string;
  start_date: string;
  planned_end_date: string;
  monthly_value: number;
  mobilization_value: number;
  demobilization_value: number;
  requirements: Requirements;
  /** avisos para a pessoa conferir (ex.: valores em dólar convertidos) */
  notes: string[];
}

/**
 * Pré-preenche a locação a partir da proposta de locação: cliente, obra, início, prazo e valores.
 * Valores em dólar são convertidos pela cotação usada na proposta; em outra moeda sem cotação ficam em branco.
 */
export function rentalDraftFromQuote(q: QuoteForRental, fallbackStart?: string | null): RentalDraft {
  const notes: string[] = [];
  let rate = 1;
  if (q.currency === "USD" && q.usd_brl_rate_used) {
    rate = q.usd_brl_rate_used;
    notes.push(`Valores convertidos de dólar para real pela cotação da proposta (${rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}).`);
  }
  const unconvertible = q.currency !== "BRL" && !(q.currency === "USD" && q.usd_brl_rate_used);
  if (unconvertible) notes.push(`A proposta está em ${q.currency} sem cotação: preencha os valores em reais.`);
  const money = (v: number | null) => (unconvertible || v == null ? 0 : round2(num(v) * rate));

  const start = q.rental_start_date || fallbackStart || "";
  const months = num(q.rental_duration_months);
  return {
    client_id: q.client_id,
    quote_id: q.id,
    site_name: q.project_name ?? "",
    site_location: q.project_location ?? "",
    start_date: start,
    planned_end_date: start && months > 0 ? endDateForMonths(start, months) : "",
    monthly_value: money(q.rental_monthly_value),
    mobilization_value: money(q.rental_mobilization),
    demobilization_value: money(q.rental_demobilization),
    requirements: { height_m: q.rental_height_needed, jib_m: q.rental_jib_needed, weight_kg: q.rental_max_weight },
    notes,
  };
}

/** Situação do contrato em texto curto, para o selo na lista de locações. */
export function contractLabel(c: ContractInfo | undefined | null): { label: string; tone: "ok" | "warn" | "none" } {
  if (!c) return { label: "Sem contrato", tone: "none" };
  if (c.status === "signed") return { label: "Contrato assinado", tone: "ok" };
  if (c.status === "cancelled") return { label: "Contrato cancelado", tone: "warn" };
  if (c.status === "sent") return { label: "Aguardando assinatura", tone: "warn" };
  return { label: "Contrato em preparo", tone: "warn" };
}
