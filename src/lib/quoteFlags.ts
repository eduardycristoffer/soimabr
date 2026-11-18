/**
 * Sinalizações de uma proposta na lista.
 *
 * Proposta INTERNACIONAL = o cliente é estrangeiro (cadastro "internacional") OU a proposta está em
 * outra moeda (US$ ou €). Qualquer um dos dois já pede atenção: câmbio, documentação de exportação,
 * proforma, idioma.
 */
export interface QuoteFlagsInput {
  currency?: string | null;
  client_type?: string | null;
  clients?: { client_type?: string | null } | null;
}

export function isInternationalQuote(q: QuoteFlagsInput | null | undefined): boolean {
  if (!q) return false;
  const clientType = q.clients?.client_type ?? q.client_type;
  if (clientType === "internacional") return true;
  const currency = (q.currency || "").toUpperCase();
  return currency === "USD" || currency === "EUR";
}

/** Texto curto para explicar o motivo (dica ao passar o mouse). */
export function internationalReason(q: QuoteFlagsInput | null | undefined): string {
  if (!isInternationalQuote(q)) return "";
  const clientType = q?.clients?.client_type ?? q?.client_type;
  const currency = (q?.currency || "").toUpperCase();
  const parts: string[] = [];
  if (clientType === "internacional") parts.push("cliente internacional");
  if (currency === "USD" || currency === "EUR") parts.push(`proposta em ${currency === "USD" ? "dólar" : "euro"}`);
  return parts.join(" e ");
}
