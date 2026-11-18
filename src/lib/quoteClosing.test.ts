import { describe, it, expect } from "vitest";
import {
  canConfirmClosing, canUndoClosing, closingDateLabel, closingTimestamp, dayInBrasilia, isClosed, todayBR, validateClosingDate,
} from "./quoteClosing";

describe("quem pode confirmar ou desfazer", () => {
  it("só finalizada e em aberto pode ser fechada", () => {
    expect(canConfirmClosing({ status: "finalized", closed_at: null })).toBe(true);
    expect(canConfirmClosing({ status: "finalized", closed_at: "2026-11-01T15:00:00Z" })).toBe(false);
    expect(canConfirmClosing({ status: "draft" })).toBe(false);
    expect(canConfirmClosing({ status: "cancelled" })).toBe(false);
    expect(canConfirmClosing(null)).toBe(false);
  });
  it("só finalizada e já fechada pode ser desfeita", () => {
    expect(canUndoClosing({ status: "finalized", closed_at: "2026-11-01T15:00:00Z" })).toBe(true);
    expect(canUndoClosing({ status: "finalized", closed_at: null })).toBe(false);
    expect(canUndoClosing({ status: "cancelled", closed_at: "2026-11-01T15:00:00Z" })).toBe(false);
  });
  it("isClosed", () => {
    expect(isClosed({ closed_at: "2026-11-01T15:00:00Z" })).toBe(true);
    expect(isClosed({ closed_at: null })).toBe(false);
    expect(isClosed(undefined)).toBe(false);
  });
});

describe("datas no fuso de Brasília", () => {
  it("de madrugada em UTC ainda é o dia anterior em Brasília", () => {
    expect(dayInBrasilia("2026-11-18T02:00:00Z")).toBe("2026-11-17");
    expect(todayBR(new Date("2026-11-18T02:00:00Z"))).toBe("2026-11-17");
    expect(todayBR(new Date("2026-11-18T12:00:00Z"))).toBe("2026-11-18");
  });
  it("o momento gravado é meio-dia de Brasília e volta como o MESMO dia", () => {
    const iso = closingTimestamp("2026-03-05");
    expect(iso).toBe("2026-03-05T15:00:00.000Z");
    expect(closingDateLabel(iso)).toBe("05/03/2026");
    expect(dayInBrasilia(iso)).toBe("2026-03-05");
  });
  it("rótulo vazio quando não há data", () => {
    expect(closingDateLabel(null)).toBe("");
    expect(closingDateLabel(undefined)).toBe("");
  });
});

describe("validação da data do fechamento", () => {
  const now = new Date("2026-11-17T15:00:00Z"); // 17/11/2026 em Brasília
  const created = "2026-11-10T13:00:00Z";

  it("hoje e dias passados depois da criação são aceitos", () => {
    expect(validateClosingDate("2026-11-17", created, now)).toBeNull();
    expect(validateClosingDate("2026-11-10", created, now)).toBeNull();
    expect(validateClosingDate("2026-11-12", created, now)).toBeNull();
  });
  it("futuro é recusado", () => {
    expect(validateClosingDate("2026-11-18", created, now)).toMatch(/futuro/);
  });
  it("antes da criação da proposta é recusado", () => {
    expect(validateClosingDate("2026-11-09", created, now)).toMatch(/anterior/);
  });
  it("vazio ou inválido é recusado", () => {
    expect(validateClosingDate("", created, now)).toMatch(/Informe/);
    expect(validateClosingDate("17/11/2026", created, now)).toMatch(/Informe/);
    expect(validateClosingDate("2026-13-45", created, now)).toMatch(/inválida/i);
  });
  it("sem data de criação só vale a regra do futuro", () => {
    expect(validateClosingDate("2020-01-01", null, now)).toBeNull();
  });
});
