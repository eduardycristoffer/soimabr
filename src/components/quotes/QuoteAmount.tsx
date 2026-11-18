import { formatRate } from "@/lib/numberFormat";
import {
  USD_ESTIMATE_NOTE,
  brlToUsdEstimate,
  formatMoney,
  formatQuoteAmount,
  isUsdEstimateQuote,
  pickEstimateRate,
  type QuoteMoneyLike,
} from "@/lib/quoteMoney";

interface Props {
  value: number | null | undefined;
  quote: QuoteMoneyLike | null | undefined;
  /** Cotação de hoje (useUsdBrlRate). Sem ela, usa a cotação gravada na proposta. */
  liveRate?: number | null;
  className?: string;
  /** Linha de estimativa em dólar abaixo do valor (padrão: sim) */
  showEstimate?: boolean;
}

/**
 * Valor de proposta pronto para exibir.
 * Propostas internacionais em USD: R$ em destaque + "≈ US$ … (estimativa)" claramente marcada.
 */
export function QuoteAmount({ value, quote, liveRate, className, showEstimate = true }: Props) {
  const main = formatQuoteAmount(value, quote);

  if (!showEstimate || !isUsdEstimateQuote(quote)) {
    return <span className={className}>{main}</span>;
  }

  const rate = pickEstimateRate(quote, liveRate);
  const usd = brlToUsdEstimate(value, rate);
  const note = rate
    ? `${USD_ESTIMATE_NOTE} (1 US$ = R$ ${formatRate(rate)})`
    : USD_ESTIMATE_NOTE;

  return (
    <span className={className}>
      {main}
      {usd != null && (
        <span className="block text-xs font-normal text-muted-foreground" title={note}>
          ≈ {formatMoney(usd, "USD")} <span className="italic">(estimativa)</span>
        </span>
      )}
    </span>
  );
}
