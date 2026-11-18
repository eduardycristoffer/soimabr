/**
 * Valores de propostas internacionais em dólar.
 *
 * Regra do negócio: a proposta é feita em REAIS (R$) para não sofrer com a variação do
 * dólar. O valor em dólar aparece apenas como ESTIMATIVA, pela cotação do dia.
 * Por isso, em propostas com moeda USD os números gravados (subtotal, desconto, total,
 * preço dos itens) são em reais, e a cotação usada fica em `usd_brl_rate_used`.
 *
 * O erro que isso resolve: a lista mostrava o total em reais com o símbolo "US$"
 * (ex.: R$ 570.120,00 aparecia como US$ 570.120,00).
 */

export interface QuoteMoneyLike {
  currency?: string | null;
  usd_brl_rate_used?: number | string | null;
}

/** Proposta internacional em USD cujos valores gravados estão em reais. */
export function isUsdEstimateQuote(q: QuoteMoneyLike | null | undefined): boolean {
  return q?.currency === "USD" && Number(q?.usd_brl_rate_used) > 0;
}

/** Moeda em que os números gravados da proposta realmente estão. */
export function amountCurrency(q: QuoteMoneyLike | null | undefined): string {
  return isUsdEstimateQuote(q) ? "BRL" : q?.currency || "BRL";
}

export function formatMoney(value: number | null | undefined, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(value) || 0);
}

/** Formata um valor gravado da proposta na moeda correta (R$ para propostas USD). */
export function formatQuoteAmount(value: number | null | undefined, q: QuoteMoneyLike | null | undefined): string {
  return formatMoney(value, amountCurrency(q));
}

/**
 * Cotação para a estimativa: a de hoje, quando disponível; senão a gravada na proposta.
 */
export function pickEstimateRate(q: QuoteMoneyLike | null | undefined, liveRate?: number | null): number | null {
  if (liveRate && liveRate > 0) return liveRate;
  const saved = Number(q?.usd_brl_rate_used);
  return saved > 0 ? saved : null;
}

/** Converte um valor em reais para a estimativa em dólar. */
export function brlToUsdEstimate(valueBrl: number | null | undefined, rate: number | null | undefined): number | null {
  if (!rate || rate <= 0) return null;
  return (Number(valueBrl) || 0) / rate;
}

export const USD_ESTIMATE_NOTE =
  "Estimativa pela cotação de hoje. Não corresponde ao valor da proposta: a proposta é em reais (R$) e o valor em dólar varia com o câmbio.";
