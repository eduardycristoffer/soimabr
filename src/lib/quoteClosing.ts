/**
 * Fechamento de proposta: confirmar que uma proposta FINALIZADA virou negócio fechado.
 * Guardado em quotes.closed_at / closed_by / closing_note (SQL: supabase/manual/2026-11-20_proposal_closing.sql).
 * A situação da proposta continua "finalizada"; "fechada" é a marca de que o cliente aceitou.
 */

const TZ = "America/Sao_Paulo";

export interface ClosingQuoteLike {
  status?: string | null;
  closed_at?: string | null;
}

export const isClosed = (q: ClosingQuoteLike | null | undefined) => !!q?.closed_at;

/** Só proposta finalizada e ainda não fechada pode ter o fechamento confirmado. */
export const canConfirmClosing = (q: ClosingQuoteLike | null | undefined) => q?.status === "finalized" && !q?.closed_at;

/** Só proposta finalizada e já fechada pode ter o fechamento desfeito. */
export const canUndoClosing = (q: ClosingQuoteLike | null | undefined) => q?.status === "finalized" && !!q?.closed_at;

/** Dia (AAAA-MM-DD) no fuso de Brasília — a data digitada nunca "anda" por causa do UTC. */
export function dayInBrasilia(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

export const todayBR = (now: Date = new Date()) => dayInBrasilia(now);

/**
 * Momento gravado para a data do fechamento: meio-dia em Brasília (15:00 UTC).
 * Meio-dia fica longe da virada do dia, então a data é a mesma em qualquer tela.
 */
export const closingTimestamp = (day: string) => `${day}T15:00:00.000Z`;

/** "17/11/2026" para uma data gravada. */
export function closingDateLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = dayInBrasilia(iso).split("-");
  return `${d}/${m}/${y}`;
}

/** Mensagem de erro para a data escolhida, ou null se estiver boa. */
export function validateClosingDate(day: string, proposalCreatedAt: string | null | undefined, now: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return "Informe a data do fechamento.";
  if (Number.isNaN(new Date(`${day}T12:00:00Z`).getTime())) return "Data inválida.";
  if (day > todayBR(now)) return "A data do fechamento não pode ser no futuro.";
  if (proposalCreatedAt && day < dayInBrasilia(proposalCreatedAt)) return "A data do fechamento não pode ser anterior à criação da proposta.";
  return null;
}
