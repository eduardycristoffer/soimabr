import { describe, it, expect } from "vitest";
import {
  addDays, addMonths, buildPanorama, compatibility, contractLabel, diffDays, dayNum, endDateForMonths, findOverlap, ganttModel,
  monthsBetween, plannedMonths, plannedTotal, rentalDraftFromQuote, rentalPhase, rentalRevenue, rentalTimeline, rentedDaysInWindow,
  revenueByMonth, todayISO, unitFinance, unitSnapshot, validateRental,
  type FleetCost, type FleetRental, type FleetUnit, type QuoteForRental,
} from "./fleet";

const TODAY = "2026-06-15";

const U = (id: string, extra: Partial<FleetUnit> = {}): FleetUnit => ({
  id, code: id.toUpperCase(), product_id: null, model_name: null, serial_number: null, year_manufactured: null,
  lanca_m: 50, altura_torre_m: 40, carga_maxima_kg: 2500, carga_ponta_kg: 1000,
  acquisition_cost: 0, acquisition_date: null, status: "active", location_note: null, notes: null, ...extra,
});
let seq = 0;
const R = (unit_id: string, start_date: string, planned_end_date: string, extra: Partial<FleetRental> = {}): FleetRental => ({
  id: `r${++seq}`, unit_id, contract_id: null, quote_id: null, client_id: null, site_name: null, site_location: null,
  start_date, planned_end_date, actual_end_date: null, cancelled_at: null,
  monthly_value: 10000, mobilization_value: 0, demobilization_value: 0, notes: null, ...extra,
});
const C = (unit_id: string, kind: FleetCost["kind"], amount: number, incurred_on: string): FleetCost => ({
  id: `c${++seq}`, unit_id, rental_id: null, kind, amount, incurred_on, description: null,
});

describe("datas", () => {
  it("soma e subtrai dias, inclusive virada de mês e ano bissexto", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-01-01", "2026-12-31")).toBe(364);
    expect(diffDays("2026-06-15", "2026-06-10")).toBe(-5);
    expect(dayNum("2026-06-15") - dayNum("2026-06-14")).toBe(1);
  });

  it("hoje em Brasília, não no fuso do computador (23h30 em Brasília ainda é o mesmo dia)", () => {
    expect(todayISO(new Date("2026-06-16T02:30:00Z"))).toBe("2026-06-15");
    expect(todayISO(new Date("2026-06-16T03:30:00Z"))).toBe("2026-06-16");
  });

  it("soma meses mantendo o dia, com fim de mês e ano bissexto", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonths("2026-03-01", 12)).toBe("2027-03-01");
  });

  it("meses entre datas: cheios do calendário + dias que sobram ÷ 30", () => {
    expect(monthsBetween("2026-03-01", "2027-03-01")).toBe(12);
    expect(monthsBetween("2026-03-01", "2026-03-16")).toBe(0.5);
    expect(monthsBetween("2026-01-31", "2026-03-01")).toBeCloseTo(1 + 1 / 30, 6);
    expect(monthsBetween("2026-03-01", "2026-03-01")).toBe(0);
    expect(monthsBetween("2026-03-10", "2026-03-01")).toBe(0);
  });

  it("último dia de uma locação por duração: 12 meses a partir de 01/03 terminam em 28/02", () => {
    expect(endDateForMonths("2026-03-01", 12)).toBe("2027-02-28");
    expect(endDateForMonths("2026-03-01", 1)).toBe("2026-03-31");
    expect(endDateForMonths("2026-03-01", 1.5)).toBe("2026-04-15");
    // ida e volta: a duração calculada a partir do fim volta aos mesmos meses
    expect(monthsBetween("2026-03-01", addDays(endDateForMonths("2026-03-01", 12), 1))).toBe(12);
    expect(monthsBetween("2026-05-17", addDays(endDateForMonths("2026-05-17", 6), 1))).toBe(6);
  });
});

describe("fase e prazo da locação", () => {
  const r = R("u1", "2026-03-01", "2026-08-31");

  it("agendada, em obra, encerrada e cancelada", () => {
    expect(rentalPhase(r, "2026-02-01")).toBe("scheduled");
    expect(rentalPhase(r, TODAY)).toBe("active");
    expect(rentalPhase({ ...r, actual_end_date: "2026-06-10" }, TODAY)).toBe("finished");
    expect(rentalPhase({ ...r, actual_end_date: "2026-06-20" }, TODAY)).toBe("active"); // devolução marcada para o futuro
    expect(rentalPhase({ ...r, cancelled_at: "2026-02-01T10:00:00Z" }, TODAY)).toBe("cancelled");
  });

  it("devolvida hoje já está encerrada (é o caso de quem registra a devolução no próprio dia)", () => {
    expect(rentalPhase({ ...r, actual_end_date: TODAY }, TODAY)).toBe("finished");
    expect(unitSnapshot(U("u1"), [{ ...r, actual_end_date: TODAY }], TODAY).state).toBe("available");
    expect(unitSnapshot(U("u1"), [{ ...r, actual_end_date: TODAY }], TODAY).idleDays).toBe(0);
  });

  it("em andamento: dias corridos, dias que faltam e percentual", () => {
    const t = rentalTimeline(R("u1", "2026-06-01", "2026-06-30"), "2026-06-10");
    expect(t).toMatchObject({ phase: "active", totalDays: 30, elapsedDays: 10, remainingDays: 20, overdueDays: 0, pct: 33, endingSoon: true });
  });

  it("contrato longe do fim não é 'terminando'", () => {
    expect(rentalTimeline(R("u1", "2026-01-01", "2026-12-31"), TODAY).endingSoon).toBe(false);
  });

  it("limite de 30 dias: faltando 30 já avisa, faltando 31 ainda não", () => {
    expect(rentalTimeline(R("u1", "2026-01-01", "2026-07-15"), TODAY).endingSoon).toBe(true); // 30 dias
    expect(rentalTimeline(R("u1", "2026-01-01", "2026-07-16"), TODAY).endingSoon).toBe(false); // 31 dias
  });

  it("passou do prazo sem devolver: dias de atraso, nada 'terminando', 100% do prazo", () => {
    const t = rentalTimeline(R("u1", "2026-06-01", "2026-06-30"), "2026-07-05");
    expect(t).toMatchObject({ phase: "active", overdueDays: 5, remainingDays: 0, elapsedDays: 30, pct: 100, endingSoon: false });
  });

  it("agendada: quantos dias faltam para começar", () => {
    expect(rentalTimeline(R("u1", "2026-07-01", "2026-12-31"), TODAY)).toMatchObject({ phase: "scheduled", daysToStart: 16, elapsedDays: 0, pct: 0 });
  });

  it("devolvida antes do prazo: 100% e só os dias em obra", () => {
    const t = rentalTimeline(R("u1", "2026-06-01", "2026-08-31", { actual_end_date: "2026-06-20" }), "2026-06-30");
    expect(t).toMatchObject({ phase: "finished", pct: 100, elapsedDays: 20, overdueDays: 0 });
  });
});

describe("receita da locação", () => {
  const r = R("u1", "2026-01-01", "2026-12-31", { monthly_value: 10000, mobilization_value: 3000, demobilization_value: 2000 });

  it("total previsto: mensalidade × meses + mobilização + desmobilização", () => {
    const y = R("u1", "2026-03-01", "2027-02-28", { monthly_value: 18500, mobilization_value: 6000, demobilization_value: 6000 });
    expect(plannedMonths(y)).toBe(12);
    expect(plannedTotal(y)).toBe(234000);
    expect(plannedTotal(R("u1", "2026-06-01", "2026-06-15", { monthly_value: 10000 }))).toBe(5000); // meio mês
  });

  it("até hoje: pro rata dos dias + mobilização; desmobilização só ao devolver", () => {
    const x = rentalRevenue(r, TODAY, TODAY);
    expect(x.accruedMonths).toBe(5.5);
    expect(x.accrued).toBe(58000); // 5,5 × 10.000 + 3.000
    expect(x.planned).toBe(125000);
    expect(x.extraDays).toBe(0);
  });

  it("antes de começar não há receita nem mobilização", () => {
    expect(rentalRevenue(r, "2025-12-31", TODAY).accrued).toBe(0);
  });

  it("projeção futura só conta o prazo contratual e a desmobilização no fim previsto", () => {
    expect(rentalRevenue(r, "2026-06-30", TODAY).accrued).toBe(63000);
    expect(rentalRevenue(r, "2026-12-31", TODAY).accrued).toBe(125000); // = total previsto
    expect(rentalRevenue(r, "2027-06-30", TODAY).accrued).toBe(125000); // não passa do contrato
  });

  it("grua que passou do prazo e não voltou segue rendendo até hoje, sem desmobilização", () => {
    const late = R("u1", "2026-01-01", "2026-05-31", { monthly_value: 10000, demobilization_value: 2000 });
    const x = rentalRevenue(late, TODAY, TODAY);
    expect(x.accrued).toBe(55000);
    expect(x.extraDays).toBe(15);
  });

  it("o atraso não é projetado para o futuro (o valor congela em hoje)", () => {
    const late = R("u1", "2026-01-01", "2026-05-31", { monthly_value: 10000 });
    expect(rentalRevenue(late, "2026-07-31", TODAY).accrued).toBe(rentalRevenue(late, TODAY, TODAY).accrued);
  });

  it("devolvida antes do prazo: só os meses em obra + desmobilização", () => {
    const fin = R("u1", "2026-01-01", "2026-12-31", { monthly_value: 10000, mobilization_value: 3000, demobilization_value: 2000, actual_end_date: "2026-03-31" });
    expect(rentalRevenue(fin, TODAY, TODAY).accrued).toBe(35000); // 3 meses + 3.000 + 2.000
  });

  it("devolvida depois do prazo: mostra os dias a mais", () => {
    const fin = R("u1", "2026-01-01", "2026-05-31", { actual_end_date: "2026-06-10" });
    expect(rentalRevenue(fin, TODAY, TODAY).extraDays).toBe(10);
  });

  it("cancelada não rende nada", () => {
    expect(rentalRevenue({ ...r, cancelled_at: "2026-01-02T00:00:00Z" }, TODAY, TODAY)).toEqual({ planned: 0, accrued: 0, accruedMonths: 0, extraDays: 0 });
  });
});

describe("situação da grua", () => {
  it("livre: há quantos dias está parada (desde a última devolução)", () => {
    const u = U("u1");
    const s = unitSnapshot(u, [R("u1", "2026-03-01", "2026-05-10", { actual_end_date: "2026-05-10" })], TODAY);
    expect(s).toMatchObject({ state: "available", idleDays: 36, freeFrom: TODAY, waiting: false, current: null, next: null });
  });

  it("sem nenhuma locação, conta desde a compra", () => {
    expect(unitSnapshot(U("u1", { acquisition_date: "2026-06-01" }), [], TODAY).idleDays).toBe(14);
    expect(unitSnapshot(U("u1"), [], TODAY).idleDays).toBeNull();
  });

  it("em obra: livre a partir do dia seguinte ao fim previsto", () => {
    const s = unitSnapshot(U("u1"), [R("u1", "2026-01-01", "2026-08-31")], TODAY);
    expect(s).toMatchObject({ state: "rented", freeFrom: "2026-09-01", idleDays: null, waiting: false });
  });

  it("só tem locação agendada: reservada", () => {
    const s = unitSnapshot(U("u1"), [R("u1", "2026-07-01", "2026-12-31")], TODAY);
    expect(s.state).toBe("reserved");
    expect(s.next?.start_date).toBe("2026-07-01");
  });

  it("cliente esperando: a grua passou do prazo e já há outra locação agendada", () => {
    const s = unitSnapshot(U("u1"), [R("u1", "2026-01-01", "2026-06-10"), R("u1", "2026-06-20", "2026-12-20")], TODAY);
    expect(s.waiting).toBe(true);
    expect(s.freeFrom).toBe(TODAY);
  });

  it("cliente esperando também quando o prazo previsto invade a próxima locação", () => {
    const s = unitSnapshot(U("u1"), [R("u1", "2026-01-01", "2026-08-31"), R("u1", "2026-08-20", "2026-12-20")], TODAY);
    expect(s.waiting).toBe(true);
  });

  it("próxima locação depois do fim previsto: ninguém esperando", () => {
    const s = unitSnapshot(U("u1"), [R("u1", "2026-01-01", "2026-08-31"), R("u1", "2026-09-15", "2026-12-20")], TODAY);
    expect(s.waiting).toBe(false);
  });

  it("manutenção e baixada têm prioridade sobre a ocupação", () => {
    expect(unitSnapshot(U("u1", { status: "maintenance" }), [], TODAY).state).toBe("maintenance");
    expect(unitSnapshot(U("u1", { status: "retired" }), [R("u1", "2026-01-01", "2026-12-31")], TODAY).state).toBe("retired");
  });

  it("locação cancelada ou já encerrada não ocupa a grua", () => {
    const s = unitSnapshot(U("u1"), [R("u1", "2026-01-01", "2026-12-31", { cancelled_at: "2026-01-02T00:00:00Z" }), R("u1", "2026-01-01", "2026-05-31", { actual_end_date: "2026-05-31" })], TODAY);
    expect(s.state).toBe("available");
  });
});

describe("conflito de datas", () => {
  const existing = R("u1", "2026-06-01", "2026-08-31", { site_name: "Obra X" });

  it("o fim conta: começar no último dia de outra locação é conflito", () => {
    expect(findOverlap([existing], { unit_id: "u1", start_date: "2026-08-31", planned_end_date: "2026-09-30" })).toBe(existing);
  });
  it("começar no dia seguinte é livre", () => {
    expect(findOverlap([existing], { unit_id: "u1", start_date: "2026-09-01", planned_end_date: "2026-09-30" })).toBeUndefined();
  });
  it("terminar antes de a outra começar é livre; invadir o começo é conflito", () => {
    expect(findOverlap([existing], { unit_id: "u1", start_date: "2026-05-01", planned_end_date: "2026-05-31" })).toBeUndefined();
    expect(findOverlap([existing], { unit_id: "u1", start_date: "2026-05-15", planned_end_date: "2026-06-01" })).toBe(existing);
  });
  it("outra grua, locação cancelada e a própria locação (edição) não contam", () => {
    const cand = { unit_id: "u1", start_date: "2026-06-10", planned_end_date: "2026-06-20" };
    expect(findOverlap([existing], { ...cand, unit_id: "u2" })).toBeUndefined();
    expect(findOverlap([{ ...existing, cancelled_at: "2026-06-02T00:00:00Z" }], cand)).toBeUndefined();
    expect(findOverlap([existing], { ...cand, ignoreId: existing.id })).toBeUndefined();
  });
  it("devolvida antes do prazo libera os dias restantes", () => {
    const early = R("u1", "2026-06-01", "2026-08-31", { actual_end_date: "2026-07-10" });
    expect(findOverlap([early], { unit_id: "u1", start_date: "2026-07-11", planned_end_date: "2026-09-01" })).toBeUndefined();
    expect(findOverlap([early], { unit_id: "u1", start_date: "2026-07-10", planned_end_date: "2026-09-01" })).toBe(early);
  });
});

describe("compatibilidade da grua com a obra", () => {
  const u = { altura_torre_m: 40, lanca_m: 50, carga_maxima_kg: 2500 };

  it("atende a tudo", () => {
    expect(compatibility(u, { height_m: 30, jib_m: 50, weight_kg: 2500 })).toEqual({ ok: true, reasons: [] });
  });
  it("sem exigência (vazio ou zero) não reprova", () => {
    expect(compatibility(u, {}).ok).toBe(true);
    expect(compatibility(u, { height_m: 0, jib_m: null, weight_kg: undefined }).ok).toBe(true);
  });
  it("explica cada medida que não atende", () => {
    const c = compatibility(u, { height_m: 60, jib_m: 45, weight_kg: 3000 });
    expect(c.ok).toBe(false);
    expect(c.reasons).toEqual([
      "Altura: a grua tem 40 m, a obra pede 60 m",
      "Carga: a grua tem 2.500 kg, a obra pede 3.000 kg",
    ]);
  });
  it("medida não cadastrada na grua não vira aprovação: avisa", () => {
    const c = compatibility({ altura_torre_m: null, lanca_m: 50, carga_maxima_kg: 2500 }, { height_m: 30 });
    expect(c.ok).toBe(false);
    expect(c.reasons[0]).toContain("medida da grua não cadastrada");
  });
});

describe("financeiro da grua", () => {
  const unit = U("u1", { acquisition_cost: 1_000_000, acquisition_date: "2025-06-15" });
  const r1 = R("u1", "2025-09-01", "2026-02-28", { monthly_value: 20000, mobilization_value: 5000, demobilization_value: 5000, actual_end_date: "2026-02-28" });
  const r2 = R("u1", "2026-03-15", "2027-03-14", { monthly_value: 25000, mobilization_value: 8000 });
  const costs = [C("u1", "investimento", 100_000, "2025-08-01"), C("u1", "manutencao", 20_000, "2026-02-01"), C("u1", "frete", 5_000, "2026-03-01"), C("u1", "manutencao", 99_999, "2026-12-01")];
  const f = unitFinance(unit, costs, [r1, r2], TODAY);

  it("valor empregado = compra + investimentos; custos de operação à parte; custo futuro fica de fora", () => {
    expect(f.capital).toBe(1_100_000);
    expect(f.opCosts).toBe(25_000);
  });

  it("receita = soma das locações até hoje; resultado = receita − custos", () => {
    // r1: 6 meses × 20.000 + 5.000 + 5.000 = 130.000 | r2: (3 + 1/30) × 25.000 + 8.000
    expect(f.revenue).toBeCloseTo(130_000 + 25_000 * (3 + 1 / 30) + 8_000, 1);
    expect(f.net).toBeCloseTo(f.revenue - 25_000, 1);
  });

  it("rentabilidade = resultado ÷ valor empregado; rendimento mensal pela mensalidade atual", () => {
    expect(f.roiPct).toBeCloseTo((f.net / 1_100_000) * 100, 4);
    expect(f.monthlyYieldPct).toBeCloseTo((25_000 / 1_100_000) * 100, 4);
  });

  it("prazo para recuperar o valor empregado, no ritmo médio de resultado por mês", () => {
    const avg = f.net / 9.5; // 01/09/2025 até hoje: 9,5 meses
    expect(f.paybackMonths).toBeCloseTo((1_100_000 - f.net) / avg, 1);
  });

  it("utilização dos últimos 12 meses (união dos dias em obra ÷ dias da janela)", () => {
    expect(f.rentedDays12m).toBe(181 + 93);
    expect(f.utilization12mPct).toBeCloseTo((274 / 365) * 100, 4);
  });

  it("sem valor empregado não existe rentabilidade; já recuperou: prazo 0", () => {
    const free = unitFinance(U("u1"), [], [r2], TODAY);
    expect(free.roiPct).toBeNull();
    expect(free.monthlyYieldPct).toBeNull();
    const paid = unitFinance(U("u1", { acquisition_cost: 50_000 }), [], [r2], TODAY);
    expect(paid.paybackMonths).toBe(0);
  });

  it("sem locações: receita zero e rentabilidade negativa pelos custos", () => {
    const g = unitFinance(U("u1", { acquisition_cost: 100_000 }), [C("u1", "manutencao", 10_000, "2026-01-10")], [], TODAY);
    expect(g.revenue).toBe(0);
    expect(g.roiPct).toBe(-10);
    expect(g.paybackMonths).toBeNull();
    expect(g.utilization12mPct).toBe(0);
  });

  it("locação cancelada não entra na receita", () => {
    const g = unitFinance(U("u1", { acquisition_cost: 100_000 }), [], [{ ...r2, cancelled_at: "2026-03-16T00:00:00Z" }], TODAY);
    expect(g.revenue).toBe(0);
  });
});

describe("dias em obra", () => {
  it("sobreposição conta uma vez só; agendada e cancelada ficam de fora", () => {
    const a = R("u1", "2026-05-20", "2026-06-10", { actual_end_date: "2026-06-10" });
    const b = R("u1", "2026-06-05", "2026-06-20", { actual_end_date: "2026-06-20" });
    const sched = R("u1", "2026-06-25", "2026-07-30");
    const canc = R("u1", "2026-06-01", "2026-06-30", { cancelled_at: "2026-06-01T00:00:00Z" });
    expect(rentedDaysInWindow([a, b, sched, canc], "2026-06-01", "2026-06-30", TODAY)).toBe(20); // 01/06 a 20/06
  });
  it("locação em aberto conta até hoje", () => {
    expect(rentedDaysInWindow([R("u1", "2026-06-01", "2026-12-31")], "2026-06-01", "2026-06-30", TODAY)).toBe(15);
  });
});

describe("panorama da frota", () => {
  const units = [
    U("g1", { acquisition_cost: 500_000 }),
    U("g2", { acquisition_cost: 600_000 }),
    U("g3", { acquisition_cost: 400_000, acquisition_date: "2025-01-01", product_id: "p3" }),
    U("g4", { status: "retired", acquisition_cost: 300_000 }),
  ];
  const rentals = [
    R("g1", "2026-01-01", "2026-12-31", { id: "R1", monthly_value: 20000, contract_id: "c1", client_id: "k1", site_name: "Obra Alfa" }),
    R("g2", "2026-01-01", "2026-06-10", { id: "R2", monthly_value: 30000, contract_id: "c2", client_id: "k2", site_name: "Obra Beta" }),
    R("g2", "2026-06-20", "2026-12-20", { id: "R3", monthly_value: 28000, client_id: "k3", site_name: "Obra Gama" }),
    R("g3", "2026-01-01", "2026-04-20", { id: "R4", monthly_value: 15000, contract_id: "c4", actual_end_date: "2026-04-20" }),
  ];
  const p = buildPanorama({
    units, rentals, costs: [],
    contracts: { c1: { status: "signed", signed_at: "2026-01-02" }, c2: { status: "sent", signed_at: null }, c4: { status: "signed", signed_at: "2026-01-02" } },
    clientNames: { k1: "Alfa SA", k2: "Beta Ltda", k3: "Gama Ltda" },
    catalogMonthly: { p3: 22000 },
    today: TODAY,
  });

  it("conta as gruas por situação (baixadas fora do total)", () => {
    expect(p.counts).toEqual({ rented: 2, reserved: 0, available: 1, maintenance: 0, retired: 1 });
    expect(p.totalUnits).toBe(3);
  });

  it("receita mensal recorrente = soma das mensalidades das locações em andamento", () => {
    expect(p.recurringMonthly).toBe(50000);
  });

  it("valor empregado total não inclui grua baixada", () => {
    expect(p.capital).toBe(1_500_000);
  });

  it("capital parado e quanto renderia pelo preço de tabela", () => {
    expect(p.idleCapital).toBe(400_000);
    expect(p.idlePotentialMonthly).toBe(22000);
  });

  it("alertas na ordem: urgentes primeiro, depois médios e baixos", () => {
    expect(p.alerts.map((a) => `${a.severity}:${a.kind}:${a.unitId}`)).toEqual([
      "high:waiting:g2", "high:overdue:g2", "high:unsigned:g2", "medium:unsigned:g2", "low:idle:g3",
    ]);
  });

  it("textos dos alertas dizem o que fazer, com obra e cliente", () => {
    const by = (k: string) => p.alerts.find((a) => a.id === k)!;
    expect(by("overdue-R2").title).toBe("G2: devolução atrasada 5 dias");
    expect(by("overdue-R2").detail).toContain("Obra Beta — Beta Ltda");
    expect(by("overdue-R2").detail).toContain("10/06");
    expect(by("waiting-R3").detail).toBe("Gama Ltda espera desde 20/06, mas a grua ainda está em Obra Beta — Beta Ltda (previsto até 10/06).");
    expect(by("unsigned-R2").detail).toContain("ainda não foi assinado");
    expect(by("unsigned-R3").detail).toContain("Nenhum contrato");
    expect(by("idle-g3").title).toBe("G3: parada há 56 dias");
  });

  it("contadores do painel batem com os alertas", () => {
    expect([p.overdue, p.waiting, p.unsigned, p.endingSoon]).toEqual([1, 1, 2, 0]);
  });

  it("locação assinada e longe do fim não gera alerta", () => {
    expect(p.alerts.some((a) => a.id.includes("R1"))).toBe(false);
  });

  it("contrato terminando em até 30 dias gera alerta (urgente se faltar 7 dias ou menos)", () => {
    const q = buildPanorama({
      units: [U("a"), U("b")],
      rentals: [R("a", "2026-01-01", "2026-07-10", { id: "A", contract_id: "c" }), R("b", "2026-01-01", "2026-06-20", { id: "B", contract_id: "c" })],
      costs: [], contracts: { c: { status: "signed", signed_at: "2026-01-01" } }, today: TODAY,
    });
    expect(q.endingSoon).toBe(2);
    expect(q.alerts.map((a) => `${a.severity}:${a.id}`)).toEqual(["high:ending-B", "medium:ending-A"]);
    expect(q.alerts[0].title).toBe("B: contrato termina em 5 dias");
  });

  it("grua parada há pouco tempo não gera alerta de ociosidade", () => {
    const q = buildPanorama({ units: [U("a", { acquisition_date: "2026-06-01" })], rentals: [], costs: [], today: TODAY });
    expect(q.alerts).toEqual([]);
  });

  it("frota vazia não quebra", () => {
    const q = buildPanorama({ units: [], rentals: [], costs: [], today: TODAY });
    expect(q).toMatchObject({ totalUnits: 0, recurringMonthly: 0, capital: 0, roiPct: null, utilization12mPct: 0, alerts: [] });
  });

  it("resultado e rentabilidade da frota somam as gruas", () => {
    const withCost = buildPanorama({ units, rentals, costs: [C("g1", "manutencao", 10_000, "2026-02-01")], today: TODAY });
    expect(withCost.opCosts).toBe(10_000);
    expect(withCost.net).toBeCloseTo(withCost.revenue - 10_000, 2);
    expect(withCost.roiPct).toBeCloseTo((withCost.net / (500_000 + 600_000 + 400_000 + 300_000)) * 100, 4);
  });
});

describe("receita por mês", () => {
  const r = R("u1", "2026-01-01", "2026-12-31", { monthly_value: 10000, mobilization_value: 3000, demobilization_value: 2000 });

  it("cada mês recebe a mensalidade; mobilização no primeiro; desmobilização no último", () => {
    const m = revenueByMonth([r], TODAY, 5, 6);
    expect(m.map((x) => x.key)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
    expect(m.map((x) => x.revenue)).toEqual([13000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 12000]);
    expect(m.reduce((s, x) => s + x.revenue, 0)).toBe(125000); // = total previsto do contrato
  });

  it("meses depois de hoje são projeção; o mês de hoje não", () => {
    const m = revenueByMonth([r], TODAY, 1, 2);
    expect(m.map((x) => [x.label, x.projected])).toEqual([["mai/26", false], ["jun/26", false], ["jul/26", true], ["ago/26", true]]);
  });

  it("locação cancelada não entra; atrasada não é projetada além de hoje", () => {
    const late = R("u1", "2026-01-01", "2026-05-31", { monthly_value: 10000 });
    const m = revenueByMonth([late, { ...r, cancelled_at: "2026-01-02T00:00:00Z" }], TODAY, 1, 1);
    expect(m.map((x) => x.revenue)).toEqual([10000, 5000, 0]); // maio, junho (15 dias), julho
  });
});

describe("linha do tempo (Gantt)", () => {
  const units = [U("g1"), U("g2"), U("g3", { status: "retired" })];

  it("janela de 12 meses começando 3 meses antes de hoje, com a posição de hoje", () => {
    const g = ganttModel(units, [], TODAY);
    expect(g.start).toBe("2026-03-01");
    expect(g.end).toBe("2027-02-28");
    expect(g.months).toHaveLength(12);
    expect(g.months[0].label).toBe("mar/26");
    expect(g.months[11].label).toBe("fev/27");
    expect(g.todayPct).toBeCloseTo((106 / 365) * 100, 4);
    expect(g.rows.map((r) => r.unit.id)).toEqual(["g1", "g2"]); // baixada não aparece
  });

  it("barra que começou antes da janela é cortada e avisa", () => {
    const g = ganttModel(units, [R("g1", "2026-01-01", "2026-04-30", { actual_end_date: "2026-04-30" })], TODAY);
    const b = g.rows[0].bars[0];
    expect(b).toMatchObject({ left: 0, clippedLeft: true, clippedRight: false, phase: "finished", overdue: false });
    expect(b.width).toBeCloseTo((61 / 365) * 100, 4);
  });

  it("fora da janela, cancelada e de outra grua não aparecem", () => {
    const g = ganttModel(units, [R("g1", "2025-01-01", "2025-12-31", { actual_end_date: "2025-12-31" }), R("g1", "2027-06-01", "2027-12-31"), R("g1", "2026-06-01", "2026-08-01", { cancelled_at: "2026-06-01T00:00:00Z" })], TODAY);
    expect(g.rows[0].bars).toEqual([]);
  });

  it("atrasada vai até hoje e fica marcada", () => {
    const g = ganttModel(units, [R("g1", "2026-04-01", "2026-05-31")], TODAY);
    const b = g.rows[0].bars[0];
    expect(b.overdue).toBe(true);
    expect(b.left + b.width).toBeCloseTo(((diffDays("2026-03-01", TODAY) + 1) / 365) * 100, 4);
  });

  it("locação antiga sem devolução registrada aparece como atrasada (pede para fechar o cadastro)", () => {
    const g = ganttModel(units, [R("g1", "2025-01-01", "2025-12-31")], TODAY);
    expect(g.rows[0].bars[0]).toMatchObject({ overdue: true, clippedLeft: true });
  });

  it("barras da mesma grua ficam em ordem", () => {
    const g = ganttModel(units, [R("g1", "2026-09-01", "2026-10-31"), R("g1", "2026-04-01", "2026-05-31", { actual_end_date: "2026-05-31" })], TODAY);
    expect(g.rows[0].bars.map((b) => b.rental.start_date)).toEqual(["2026-04-01", "2026-09-01"]);
  });
});

describe("formulário de locação", () => {
  const taken = R("g1", "2026-06-01", "2026-08-31", { site_name: "Obra X" });
  const ok = { unit_id: "g1", start_date: "2026-09-01", planned_end_date: "2026-12-31", monthly_value: 1, mobilization_value: 0, demobilization_value: 0 };

  it("campos obrigatórios", () => {
    expect(validateRental({}, []).map((p) => p.field)).toEqual(["unit_id", "start_date", "planned_end_date"]);
  });
  it("término antes do início", () => {
    expect(validateRental({ ...ok, planned_end_date: "2026-08-01" }, [])).toEqual([{ field: "planned_end_date", message: "O término não pode ser antes do início." }]);
  });
  it("valores negativos", () => {
    expect(validateRental({ ...ok, monthly_value: -1 }, []).map((p) => p.field)).toEqual(["monthly_value"]);
  });
  it("grua ocupada no período: diz até quando e em qual obra", () => {
    const p = validateRental({ ...ok, start_date: "2026-08-15" }, [taken]);
    expect(p).toEqual([{ field: "unit_id", message: "Esta grua já está ocupada de 01/06 até 31/08 (Obra X)." }]);
  });
  it("período livre, e editar a própria locação, passam", () => {
    expect(validateRental(ok, [taken])).toEqual([]);
    expect(validateRental({ ...ok, start_date: "2026-06-10", planned_end_date: "2026-06-20" }, [taken], taken.id)).toEqual([]);
  });
});

describe("locação a partir da proposta", () => {
  const q: QuoteForRental = {
    id: "q1", client_id: "k1", project_name: "Edifício Aurora", project_location: "Goiânia-GO", currency: "BRL", usd_brl_rate_used: null,
    rental_start_date: "2026-03-01", rental_duration_months: 12, rental_monthly_value: 18500, rental_mobilization: 6000, rental_demobilization: 6000,
    rental_height_needed: 60, rental_jib_needed: 45, rental_max_weight: 2500,
  };

  it("preenche cliente, obra, datas, valores e as exigências da obra", () => {
    expect(rentalDraftFromQuote(q)).toEqual({
      client_id: "k1", quote_id: "q1", site_name: "Edifício Aurora", site_location: "Goiânia-GO",
      start_date: "2026-03-01", planned_end_date: "2027-02-28",
      monthly_value: 18500, mobilization_value: 6000, demobilization_value: 6000,
      requirements: { height_m: 60, jib_m: 45, weight_kg: 2500 }, notes: [],
    });
  });

  it("proposta em dólar: converte pela cotação usada e avisa", () => {
    const d = rentalDraftFromQuote({ ...q, currency: "USD", usd_brl_rate_used: 5, rental_monthly_value: 3000, rental_mobilization: 1000, rental_demobilization: 0 });
    expect([d.monthly_value, d.mobilization_value, d.demobilization_value]).toEqual([15000, 5000, 0]);
    expect(d.notes[0]).toContain("convertidos de dólar para real");
  });

  it("outra moeda sem cotação: valores em branco e aviso (nunca mistura moedas)", () => {
    const d = rentalDraftFromQuote({ ...q, currency: "EUR" });
    expect([d.monthly_value, d.mobilization_value]).toEqual([0, 0]);
    expect(d.notes[0]).toContain("EUR");
  });

  it("sem data na proposta usa a data de apoio (ex.: assinatura); sem prazo, deixa o término vazio", () => {
    const d = rentalDraftFromQuote({ ...q, rental_start_date: null, rental_duration_months: null }, "2026-04-10");
    expect(d.start_date).toBe("2026-04-10");
    expect(d.planned_end_date).toBe("");
    expect(rentalDraftFromQuote({ ...q, rental_start_date: null }).planned_end_date).toBe("");
  });
});

describe("selo do contrato", () => {
  it("assinado, aguardando, em preparo, cancelado e sem contrato", () => {
    expect(contractLabel({ status: "signed", signed_at: "2026-01-02" })).toEqual({ label: "Contrato assinado", tone: "ok" });
    expect(contractLabel({ status: "sent", signed_at: null })).toEqual({ label: "Aguardando assinatura", tone: "warn" });
    expect(contractLabel({ status: "draft", signed_at: null })).toEqual({ label: "Contrato em preparo", tone: "warn" });
    expect(contractLabel({ status: "cancelled", signed_at: null })).toEqual({ label: "Contrato cancelado", tone: "warn" });
    expect(contractLabel(undefined)).toEqual({ label: "Sem contrato", tone: "none" });
  });
});
