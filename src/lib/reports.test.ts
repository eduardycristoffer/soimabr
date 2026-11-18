import { describe, it, expect } from "vitest";
import {
  avgDaysToSign,
  brDayEnd,
  brDayStart,
  byType,
  computeStats,
  contractRows,
  filterQuotes,
  lastMonthKeys,
  monthKeyBR,
  monthLabel,
  presetRange,
  todayBR,
  quotesByMonth,
  signedByMonth,
  toCsv,
  type ReportQuote,
} from "@/lib/reports";

const q = (over: Partial<ReportQuote> = {}): ReportQuote => ({
  id: Math.random().toString(36).slice(2),
  quote_number: "PRO1",
  status: "finalized",
  quote_type: "venda",
  total: 1000,
  currency: "BRL",
  created_at: "2026-11-10T15:00:00Z",
  created_by: "u1",
  clients: { razao_social: "Cliente", nome_fantasia: null },
  contracts: [],
  ...over,
});

describe("datas em Brasília", () => {
  it("1º de dezembro 02:00 UTC ainda é novembro em Brasília", () => {
    expect(monthKeyBR("2026-12-01T02:00:00Z")).toBe("2026-11");
    expect(monthKeyBR("2026-12-01T03:00:00Z")).toBe("2026-12");
  });

  it("últimos meses viram o ano corretamente", () => {
    expect(lastMonthKeys(4, new Date("2026-02-15T12:00:00Z"))).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(lastMonthKeys(12, new Date("2026-11-17T12:00:00Z"))).toHaveLength(12);
    expect(lastMonthKeys(12, new Date("2026-11-17T12:00:00Z"))[11]).toBe("2026-11");
  });

  it("rótulo de mês", () => {
    expect(monthLabel("2026-11")).toBe("nov/26");
    expect(monthLabel("2027-01")).toBe("jan/27");
  });

  it("início e fim do dia", () => {
    expect(brDayStart("2026-11-10")).toBe(new Date("2026-11-10T03:00:00Z").getTime());
    expect(brDayEnd("2026-11-10")).toBe(new Date("2026-11-11T02:59:59.999Z").getTime());
  });
});

describe("atalhos de período", () => {
  it("hoje em Brasília (01:00 UTC ainda é o dia anterior)", () => {
    expect(todayBR(new Date("2026-11-17T01:00:00Z"))).toBe("2026-11-16");
    expect(todayBR(new Date("2026-11-17T12:00:00Z"))).toBe("2026-11-17");
  });
  it("este mês, este ano, 30 dias e tudo", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(presetRange("month", now)).toEqual({ start: "2026-11-01", end: "2026-11-17" });
    expect(presetRange("year", now)).toEqual({ start: "2026-01-01", end: "2026-11-17" });
    expect(presetRange("30d", now)).toEqual({ start: "2026-10-19", end: "2026-11-17" });
    expect(presetRange("all", now)).toEqual({ start: "", end: "" });
  });
});

describe("filtros", () => {
  const base = { status: "all", seller: "all", type: "all", start: "", end: "" };
  it("período inclui o dia inteiro em Brasília", () => {
    const noite = q({ created_at: "2026-11-11T01:30:00Z" }); // 10/11 22:30 em Brasília
    expect(filterQuotes([noite], { ...base, start: "2026-11-10", end: "2026-11-10" })).toHaveLength(1);
    expect(filterQuotes([noite], { ...base, start: "2026-11-11", end: "2026-11-11" })).toHaveLength(0);
  });
  it("tipo, vendedor e status", () => {
    const list = [q({ quote_type: "locacao" }), q({ created_by: "u2" }), q({ status: "cancelled" })];
    expect(filterQuotes(list, { ...base, type: "locacao" })).toHaveLength(1);
    expect(filterQuotes(list, { ...base, seller: "u2" })).toHaveLength(1);
    expect(filterQuotes(list, { ...base, status: "cancelled" })).toHaveLength(1);
  });
  it("proposta sem tipo conta como venda", () => {
    expect(filterQuotes([q({ quote_type: null })], { ...base, type: "venda" })).toHaveLength(1);
  });
});

describe("computeStats", () => {
  it("soma em R$ ignora canceladas e não mistura moeda", () => {
    const list = [
      q({ total: 1000 }),
      q({ total: 500, status: "draft" }),
      q({ total: 9999, status: "cancelled" }),
      q({ total: 2000, currency: "EUR" }),
      q({ total: 570120, currency: "USD", usd_brl_rate_used: 5.2123 }), // internacional: valor em R$
    ];
    const s = computeStats(list);
    expect(s.total).toBe(5);
    expect(s.canceladas).toBe(1);
    expect(s.valorBRL).toBe(1000 + 500 + 570120);
    expect(s.qtdNaSoma).toBe(3);
    expect(s.outraMoeda).toBe(1);
    expect(s.ticketMedio).toBeCloseTo((1000 + 500 + 570120) / 3, 5);
  });

  it("conversão é assinados ÷ finalizadas", () => {
    const signed = { id: "c", status: "signed", created_at: "2026-11-12T00:00:00Z", signed_at: "2026-11-15T00:00:00Z" };
    const list = [q({ contracts: [signed] }), q(), q(), q({ status: "draft" })];
    const s = computeStats(list);
    expect(s.finalizadas).toBe(3);
    expect(s.assinados).toBe(1);
    expect(s.conversao).toBe(33);
  });

  it("sem finalizadas não inventa percentual", () => {
    expect(computeStats([q({ status: "draft" })]).conversao).toBeNull();
    expect(computeStats([]).ticketMedio).toBeNull();
  });
});

describe("estrela-guia: contratos assinados por mês", () => {
  const months = ["2026-09", "2026-10", "2026-11"];
  it("conta contratos pela data de assinatura (não pela da proposta)", () => {
    const a = q({
      created_at: "2026-08-01T12:00:00Z",
      contracts: [
        { id: "1", status: "signed", created_at: "2026-09-02T12:00:00Z", signed_at: "2026-10-05T12:00:00Z" },
        { id: "2", status: "sent", created_at: "2026-09-02T12:00:00Z" },
      ],
    });
    const b = q({
      contracts: [
        { id: "3", status: "signed", created_at: "2026-10-30T12:00:00Z", signed_at: "2026-12-01T01:00:00Z" }, // ainda 30/11 em Brasília
        { id: "4", status: "signed", created_at: "2026-10-01T12:00:00Z", signed_at: "2026-11-02T12:00:00Z" },
      ],
    });
    expect(signedByMonth([a, b], months).map((m) => m.count)).toEqual([0, 1, 2]);
  });

  it("assinado sem data usa a criação do contrato", () => {
    const x = q({ contracts: [{ id: "1", status: "signed", created_at: "2026-09-10T12:00:00Z" }] });
    expect(signedByMonth([x], months)[0].count).toBe(1);
  });
});

describe("propostas por mês e por tipo", () => {
  it("quantidade e valor em R$ por mês", () => {
    const list = [q({ created_at: "2026-10-05T12:00:00Z", total: 100 }), q({ created_at: "2026-10-20T12:00:00Z", total: 50, status: "cancelled" })];
    const r = quotesByMonth(list, ["2026-10"]);
    expect(r[0].count).toBe(2);
    expect(r[0].value).toBe(100);
  });
  it("agrupa por tipo ordenando por valor", () => {
    const g = byType([q({ quote_type: "venda", total: 10 }), q({ quote_type: "locacao", total: 99 })]);
    expect(g.map((x) => x.label)).toEqual(["Locação", "Venda"]);
  });
});

describe("contratos", () => {
  it("dias até assinar e média", () => {
    const list = [
      q({ contracts: [{ id: "1", contract_number: "CTR1", status: "signed", created_at: "x", sent_at: "2026-11-01T12:00:00Z", signed_at: "2026-11-04T12:00:00Z" }] }),
      q({ contracts: [{ id: "2", contract_number: "CTR2", status: "signed", created_at: "x", sent_at: "2026-11-01T12:00:00Z", signed_at: "2026-11-06T12:00:00Z" }] }),
      q({ contracts: [{ id: "3", contract_number: "CTR3", status: "sent", created_at: "x", sent_at: "2026-11-01T12:00:00Z" }] }),
    ];
    const rows = contractRows(list);
    expect(rows).toHaveLength(3);
    expect(avgDaysToSign(rows)).toBe(4);
    expect(rows.find((r) => r.contract_number === "CTR3")!.daysToSign).toBeNull();
  });
});

describe("toCsv", () => {
  it("usa ; e escapa aspas, ; e quebra de linha", () => {
    const csv = toCsv(["A", "B"], [["x;y", 'diz "oi"'], [1, null]]);
    expect(csv).toBe('A;B\r\n"x;y";"diz ""oi"""\r\n1;');
  });
});
