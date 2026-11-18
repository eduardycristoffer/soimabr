import { describe, it, expect } from "vitest";
import { internationalReason, isInternationalQuote } from "./quoteFlags";

describe("proposta internacional", () => {
  it("cliente internacional (vem junto da proposta na lista)", () => {
    expect(isInternationalQuote({ currency: "BRL", clients: { client_type: "internacional" } })).toBe(true);
  });
  it("cliente internacional informado direto", () => {
    expect(isInternationalQuote({ client_type: "internacional" })).toBe(true);
  });
  it("proposta em dólar ou euro, mesmo com cliente nacional", () => {
    expect(isInternationalQuote({ currency: "USD", clients: { client_type: "nacional" } })).toBe(true);
    expect(isInternationalQuote({ currency: "eur" })).toBe(true);
  });
  it("nacional em reais não é sinalizada", () => {
    expect(isInternationalQuote({ currency: "BRL", clients: { client_type: "nacional" } })).toBe(false);
    expect(isInternationalQuote({ currency: "BRL" })).toBe(false);
  });
  it("dados ausentes não quebram", () => {
    expect(isInternationalQuote(null)).toBe(false);
    expect(isInternationalQuote(undefined)).toBe(false);
    expect(isInternationalQuote({})).toBe(false);
    expect(isInternationalQuote({ clients: null, currency: null })).toBe(false);
  });
  it("explica o motivo", () => {
    expect(internationalReason({ currency: "USD", clients: { client_type: "internacional" } })).toBe("cliente internacional e proposta em dólar");
    expect(internationalReason({ currency: "BRL", clients: { client_type: "internacional" } })).toBe("cliente internacional");
    expect(internationalReason({ currency: "EUR" })).toBe("proposta em euro");
    expect(internationalReason({ currency: "BRL" })).toBe("");
  });
});
