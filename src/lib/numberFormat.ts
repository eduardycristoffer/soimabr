/**
 * Como os números aparecem na tela (pt-BR). Um lugar só, para nenhum cartão estourar o layout:
 *  - cartões e resumos: sem centavos e, de 1 milhão para cima, abreviados ("R$ 123,63 mi");
 *  - tabelas e valores de proposta: valor cheio, com centavos;
 *  - porcentagens e médias: no máximo 1 casa decimal;
 *  - quem vê o número abreviado pode passar o mouse (ou tocar) para ver o valor exato (atributo title).
 */

const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat("pt-BR", opts);
const num = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

/** 1234567 → "1.234.567" */
export const formatInt = (n: number | null | undefined): string => nf({ maximumFractionDigits: 0 }).format(num(n));

/** Até `digits` casas, sem zeros sobrando: 12,5 · 3 · 0,3 */
export const formatDecimal = (n: number | null | undefined, digits = 1): string =>
  nf({ minimumFractionDigits: 0, maximumFractionDigits: digits }).format(num(n));

/** 33,333 → "33,3%"; vazio ou inválido → "—" */
export const formatPercent = (n: number | null | undefined, digits = 1): string =>
  n === null || n === undefined || !Number.isFinite(Number(n)) ? "—" : `${formatDecimal(Number(n), digits)}%`;

/** R$ 1.234,56 (ou R$ 1.235, com `cents: false`) */
export const formatBRL = (n: number | null | undefined, opts: { cents?: boolean } = {}): string => {
  const cents = opts.cents ?? true;
  return nf({ style: "currency", currency: "BRL", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(num(n));
};

/** R$ 123,6 mi · R$ 12 mil · R$ 980 — para eixos de gráfico e listas estreitas */
export const formatBRLCompact = (n: number | null | undefined, digits = 1): string =>
  nf({ style: "currency", currency: "BRL", notation: "compact", compactDisplay: "short", maximumFractionDigits: digits }).format(num(n));

/**
 * Valor em cartão de resumo: sem centavos; de 1 milhão para cima, abreviado com 2 casas.
 *   895899,00 → "R$ 895.899"   ·   123634062,19 → "R$ 123,63 mi"
 * O valor exato fica em `exactMoney` (para o atributo title).
 */
export function formatBRLKpi(n: number | null | undefined): string {
  const v = num(n);
  return Math.abs(v) >= 1_000_000 ? formatBRLCompact(v, 2) : formatBRL(v, { cents: false });
}

/** Valor exato, com centavos, para dica ao passar o mouse. */
export const exactMoney = (n: number | null | undefined): string => formatBRL(n, { cents: true });

/** Cotação: sempre 4 casas, com vírgula (1 US$ = R$ 5,1234). */
export const formatRate = (n: number | null | undefined, digits = 4): string =>
  nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(num(n));
