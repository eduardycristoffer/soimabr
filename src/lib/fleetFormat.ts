import { formatMoney } from "@/lib/quoteMoney";
import { diffDays, rentalTimeline, type FleetRental } from "@/lib/fleet";

/** R$ 1.234,56 */
export const brl = (v: number | null | undefined): string => formatMoney(v ?? 0, "BRL");

/** R$ 1,2 mi / R$ 350 mil / R$ 980: para cartões estreitos. */
export function brlCompact(v: number | null | undefined): string {
  const x = Number(v) || 0;
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `${x < 0 ? "−" : ""}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (abs >= 10_000) return `${x < 0 ? "−" : ""}R$ ${Math.round(abs / 1000).toLocaleString("pt-BR")} mil`;
  return brl(x);
}

export const pct = (v: number | null | undefined, digits = 1): string =>
  v == null || !isFinite(v) ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;

/** 2026-06-15 → 15/06/2026 */
export const dateBR = (iso: string | null | undefined): string =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—";

export const dayMonth = (iso: string | null | undefined): string => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

/** 12 → "12 meses"; 1 → "1 mês"; 5,5 → "5,5 meses" */
export function monthsLabel(m: number): string {
  const v = Math.round(m * 10) / 10;
  return `${v.toLocaleString("pt-BR")} ${v === 1 ? "mês" : "meses"}`;
}

export const daysLabel = (d: number): string => `${d} ${d === 1 ? "dia" : "dias"}`;

/**
 * Lê um valor digitado em reais: aceita "18500", "18.500", "18.500,50", "18500,5" e "R$ 18.500,00".
 * Vazio ou ilegível vira null (o formulário decide se isso é erro).
 */
export function parseMoney(text: string): number | null {
  const t = String(text ?? "").replace(/R\$|\s/g, "");
  if (!t) return null;
  let s = t;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // 18.500 = dezoito mil e quinhentos
  const v = Number(s);
  return isFinite(v) ? v : null;
}

/** Número para o campo de edição: 18500 → "18500", 18500.5 → "18500,5", 0 → "". */
export const moneyInput = (v: number | null | undefined): string => (v ? String(v).replace(".", ",") : "");

export interface StatusLine {
  text: string;
  tone: "ok" | "soon" | "late" | "muted";
}

/** Frase curta sobre o prazo de uma locação: "Faltam 20 dias · termina em 30/06", "Atrasada 5 dias"... */
export function rentalStatusLine(r: FleetRental, today: string): StatusLine {
  const t = rentalTimeline(r, today);
  if (t.phase === "cancelled") return { text: "Cancelada", tone: "muted" };
  if (t.phase === "scheduled") return { text: `Começa em ${daysLabel(t.daysToStart)} (${dayMonth(r.start_date)})`, tone: "muted" };
  if (t.phase === "finished") {
    const end = r.actual_end_date as string;
    const delta = diffDays(r.planned_end_date, end);
    const extra = delta < 0 ? ` · ${daysLabel(-delta)} antes do prazo` : delta > 0 ? ` · ${daysLabel(delta)} depois do prazo` : "";
    return { text: `Encerrada em ${dateBR(end)}${extra}`, tone: "muted" };
  }
  if (t.overdueDays > 0) return { text: `Atrasada ${daysLabel(t.overdueDays)} · previsto para ${dayMonth(r.planned_end_date)}`, tone: "late" };
  if (t.remainingDays === 0) return { text: "Termina hoje", tone: "soon" };
  return {
    text: `Faltam ${daysLabel(t.remainingDays)} · termina em ${t.endingSoon ? dayMonth(r.planned_end_date) : dateBR(r.planned_end_date)}`,
    tone: t.endingSoon ? "soon" : "ok",
  };
}
