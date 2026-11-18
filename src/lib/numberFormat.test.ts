import { describe, it, expect } from "vitest";
import { exactMoney, formatBRL, formatBRLCompact, formatBRLKpi, formatDecimal, formatInt, formatPercent, formatRate } from "./numberFormat";

// O Intl usa espaço não separável entre "R$" e o número
const plain = (s: string) => s.replace(/ /g, " ");

describe("números na tela", () => {
  it("cartão de resumo: sem centavos; de 1 milhão para cima, abreviado (o caso que estourava o layout)", () => {
    expect(plain(formatBRLKpi(123634062.19))).toBe("R$ 123,63 mi");
    expect(plain(formatBRLKpi(895899))).toBe("R$ 895.899");
    expect(plain(formatBRLKpi(999999.99))).toBe("R$ 1.000.000");
    expect(plain(formatBRLKpi(1_000_000))).toBe("R$ 1 mi");
    expect(plain(formatBRLKpi(0))).toBe("R$ 0");
    expect(plain(formatBRLKpi(2_500_000_000))).toBe("R$ 2,5 bi");
  });

  it("valor exato (dica ao passar o mouse) mantém os centavos", () => {
    expect(plain(exactMoney(123634062.19))).toBe("R$ 123.634.062,19");
  });

  it("abreviado de gráfico: 1 casa", () => {
    expect(plain(formatBRLCompact(123634062.19))).toBe("R$ 123,6 mi");
    expect(plain(formatBRLCompact(12500))).toMatch(/^R\$ 12,5 mil$/);
  });

  it("tabela: valor cheio com centavos; opção sem centavos", () => {
    expect(plain(formatBRL(1234.5))).toBe("R$ 1.234,50");
    expect(plain(formatBRL(1234.5, { cents: false }))).toBe("R$ 1.235");
  });

  it("porcentagem e médias: no máximo 1 casa, sem zeros sobrando", () => {
    expect(formatPercent(33.33333333)).toBe("33,3%");
    expect(formatPercent(50)).toBe("50%");
    expect(formatPercent(12.345, 2)).toBe("12,35%");
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
    expect(formatPercent(NaN)).toBe("—");
    expect(formatDecimal(12.3456)).toBe("12,3");
    expect(formatDecimal(3)).toBe("3");
    expect(formatInt(1234567.89)).toBe("1.234.568");
  });

  it("cotação: 4 casas com vírgula (não 5.1234)", () => {
    expect(formatRate(5.12)).toBe("5,1200");
    expect(formatRate(5.123456)).toBe("5,1235");
  });

  it("valores inválidos viram zero, nunca 'NaN'", () => {
    expect(plain(formatBRLKpi(NaN))).toBe("R$ 0");
    expect(plain(formatBRL(undefined))).toBe("R$ 0,00");
    expect(formatInt(null)).toBe("0");
  });
});
