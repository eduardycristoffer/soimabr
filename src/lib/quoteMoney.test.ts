import { describe, it, expect } from "vitest";
import {
  amountCurrency,
  brlToUsdEstimate,
  formatQuoteAmount,
  isUsdEstimateQuote,
  pickEstimateRate,
} from "@/lib/quoteMoney";

// Caso real: proforma Syty = US$ 109.379,74; a lista mostrava US$ 570.120,00 (valor em R$)
const sytyQuote = { currency: "USD", usd_brl_rate_used: 5.2123 };

describe("propostas internacionais em USD", () => {
  it("o total gravado é em reais e deve ser formatado como R$", () => {
    expect(isUsdEstimateQuote(sytyQuote)).toBe(true);
    expect(amountCurrency(sytyQuote)).toBe("BRL");
    const out = formatQuoteAmount(570120, sytyQuote);
    expect(out).toContain("R$");
    expect(out).not.toContain("US$");
    expect(out).toContain("570.120,00");
  });

  it("estimativa em dólar volta ao valor da proforma", () => {
    expect(brlToUsdEstimate(570120, 5.2123)!).toBeCloseTo(109379.74, 0);
  });

  it("usa a cotação de hoje quando existe e a gravada como reserva", () => {
    expect(pickEstimateRate(sytyQuote, 5.4)).toBe(5.4);
    expect(pickEstimateRate(sytyQuote, null)).toBe(5.2123);
    expect(pickEstimateRate({ currency: "USD" }, null)).toBeNull();
  });
});

describe("propostas comuns não mudam", () => {
  it("BRL continua BRL", () => {
    expect(isUsdEstimateQuote({ currency: "BRL" })).toBe(false);
    expect(amountCurrency({ currency: "BRL" })).toBe("BRL");
    expect(formatQuoteAmount(645000, { currency: "BRL" })).toContain("R$");
  });

  it("USD antigo sem cotação gravada mantém o comportamento atual (valor em US$)", () => {
    expect(isUsdEstimateQuote({ currency: "USD", usd_brl_rate_used: null })).toBe(false);
    expect(amountCurrency({ currency: "USD", usd_brl_rate_used: null })).toBe("USD");
  });

  it("EUR continua EUR", () => {
    expect(amountCurrency({ currency: "EUR", usd_brl_rate_used: 5 })).toBe("EUR");
  });

  it("estimativa sem cotação é nula", () => {
    expect(brlToUsdEstimate(1000, null)).toBeNull();
    expect(brlToUsdEstimate(1000, 0)).toBeNull();
  });
});
