// Cotação comercial do dólar (USD/BRL) usada nas propostas internacionais.
export const USD_BRL_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL";

export interface UsdBrlQuote {
  rate: number;
  /** Data da cotação como vem da API ("AAAA-MM-DD HH:MM:SS", hora de Brasília). */
  lastUpdatedAt: string;
}

/** Busca a cotação de agora. Lança erro se a API falhar ou devolver valor inválido. */
export async function fetchUsdBrlRate(fetchFn: typeof fetch = fetch): Promise<UsdBrlQuote> {
  const res = await fetchFn(USD_BRL_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar cotação");
  const json = await res.json();
  const rate = parseFloat(json?.USDBRL?.bid);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Cotação inválida");
  return { rate, lastUpdatedAt: String(json?.USDBRL?.create_date || "") };
}

/**
 * Cotação para gravar ao salvar a proposta: busca de novo na hora (o dólar pode ter subido);
 * se a busca falhar, usa a última que a tela leu. Sem nenhuma das duas, devolve null.
 */
export async function rateForSave(
  cached: { rate: number | null; lastUpdatedAt: string | null },
  fetchFn: typeof fetch = fetch,
): Promise<(UsdBrlQuote & { fresh: boolean }) | null> {
  try {
    const q = await fetchUsdBrlRate(fetchFn);
    return { ...q, fresh: true };
  } catch {
    if (cached.rate && cached.rate > 0) return { rate: cached.rate, lastUpdatedAt: cached.lastUpdatedAt || "", fresh: false };
    return null;
  }
}
