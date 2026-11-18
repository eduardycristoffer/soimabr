import { describe, it, expect } from "vitest";
import type { FleetRental } from "./fleet";
import { rentalStatusLine, brl, brlCompact, dateBR, dayMonth, daysLabel, monthsLabel, moneyInput, parseMoney, pct } from "./fleetFormat";

const nb = (s: string) => s.replace(/ /g, " "); // o formatador usa espaço sem quebra

describe("formatação da frota", () => {
  it("reais", () => {
    expect(nb(brl(1234.5))).toBe("R$ 1.234,50");
    expect(nb(brl(null))).toBe("R$ 0,00");
  });
  it("reais compactos para cartões estreitos", () => {
    expect(nb(brlCompact(1_500_000))).toBe("R$ 1,5 mi");
    expect(nb(brlCompact(350_000))).toBe("R$ 350 mil");
    expect(nb(brlCompact(9_800))).toBe("R$ 9.800,00");
    expect(nb(brlCompact(-2_500_000))).toBe("−R$ 2,5 mi");
  });
  it("percentual", () => {
    expect(pct(17.1667)).toBe("17,2%");
    expect(pct(100, 0)).toBe("100%");
    expect(pct(null)).toBe("—");
    expect(pct(NaN)).toBe("—");
  });
  it("datas", () => {
    expect(dateBR("2026-06-15")).toBe("15/06/2026");
    expect(dateBR("2026-06-15T12:00:00Z")).toBe("15/06/2026");
    expect(dateBR(null)).toBe("—");
    expect(dateBR("lixo")).toBe("—");
    expect(dayMonth("2026-06-15")).toBe("15/06");
  });
  it("meses e dias no singular e plural", () => {
    expect(monthsLabel(12)).toBe("12 meses");
    expect(monthsLabel(1)).toBe("1 mês");
    expect(monthsLabel(5.5)).toBe("5,5 meses");
    expect(monthsLabel(3.0333)).toBe("3 meses");
    expect(daysLabel(1)).toBe("1 dia");
    expect(daysLabel(5)).toBe("5 dias");
  });
  it("lê valores digitados em reais", () => {
    expect(parseMoney("18500")).toBe(18500);
    expect(parseMoney("18.500")).toBe(18500);
    expect(parseMoney("18.500,50")).toBe(18500.5);
    expect(parseMoney("18500,5")).toBe(18500.5);
    expect(parseMoney("R$ 1.234.567,89")).toBe(1234567.89);
    expect(parseMoney("1234.56")).toBe(1234.56);
    expect(parseMoney("0")).toBe(0);
  });
  it("vazio ou ilegível não vira zero escondido", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("   ")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
  it("valor de volta para o campo", () => {
    expect(moneyInput(18500)).toBe("18500");
    expect(moneyInput(18500.5)).toBe("18500,5");
    expect(moneyInput(0)).toBe("");
    expect(parseMoney(moneyInput(18500.5))).toBe(18500.5);
  });
});

describe("frase do prazo da locação", () => {
  const TODAY = "2026-06-15";
  const R = (start: string, end: string, extra: Partial<FleetRental> = {}): FleetRental => ({
    id: "r", unit_id: "u", contract_id: null, quote_id: null, client_id: null, site_name: null, site_location: null,
    start_date: start, planned_end_date: end, actual_end_date: null, cancelled_at: null,
    monthly_value: 0, mobilization_value: 0, demobilization_value: 0, notes: null, ...extra,
  });

  it("em dia, longe do fim: mostra a data completa", () => {
    expect(rentalStatusLine(R("2026-01-01", "2026-12-31"), TODAY)).toEqual({ text: "Faltam 199 dias · termina em 31/12/2026", tone: "ok" });
  });
  it("perto do fim (30 dias ou menos): destaque 'soon'", () => {
    expect(rentalStatusLine(R("2026-01-01", "2026-07-05"), TODAY)).toEqual({ text: "Faltam 20 dias · termina em 05/07", tone: "soon" });
  });
  it("termina hoje", () => {
    expect(rentalStatusLine(R("2026-01-01", TODAY), TODAY)).toEqual({ text: "Termina hoje", tone: "soon" });
  });
  it("atrasada", () => {
    expect(rentalStatusLine(R("2026-01-01", "2026-06-10"), TODAY)).toEqual({ text: "Atrasada 5 dias · previsto para 10/06", tone: "late" });
    expect(rentalStatusLine(R("2026-01-01", "2026-06-14"), TODAY).text).toBe("Atrasada 1 dia · previsto para 14/06");
  });
  it("agendada", () => {
    expect(rentalStatusLine(R("2026-07-01", "2026-12-31"), TODAY)).toEqual({ text: "Começa em 16 dias (01/07)", tone: "muted" });
  });
  it("encerrada antes, no prazo e depois do prazo", () => {
    expect(rentalStatusLine(R("2026-01-01", "2026-06-30", { actual_end_date: "2026-06-10" }), TODAY).text).toBe("Encerrada em 10/06/2026 · 20 dias antes do prazo");
    expect(rentalStatusLine(R("2026-01-01", "2026-06-10", { actual_end_date: "2026-06-10" }), TODAY).text).toBe("Encerrada em 10/06/2026");
    expect(rentalStatusLine(R("2026-01-01", "2026-06-01", { actual_end_date: "2026-06-03" }), TODAY).text).toBe("Encerrada em 03/06/2026 · 2 dias depois do prazo");
  });
  it("cancelada", () => {
    expect(rentalStatusLine(R("2026-01-01", "2026-12-31", { cancelled_at: "2026-02-01T00:00:00Z" }), TODAY)).toEqual({ text: "Cancelada", tone: "muted" });
  });
});
