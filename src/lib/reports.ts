/**
 * Cálculos do relatório (funções puras, testáveis).
 *
 * Regras que valem para tudo aqui:
 *  - meses e datas são contados no fuso de Brasília (o servidor/navegador pode estar em UTC);
 *  - valores em R$: propostas internacionais em USD têm os números gravados em reais
 *    (ver quoteMoney.ts). Propostas em outra moeda (EUR, USD antigo) NÃO entram na soma
 *    em R$ e são contadas à parte, para o total nunca misturar moedas.
 */
import { amountCurrency } from "@/lib/quoteMoney";

export const TZ_BR = "America/Sao_Paulo";

export type QuoteStatus = "draft" | "finalized" | "cancelled";

export interface ReportContract {
  id: string;
  contract_number?: string | null;
  status: string;
  signed_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface ReportQuote {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  quote_type?: string | null;
  total: number;
  currency: string;
  usd_brl_rate_used?: number | null;
  created_at: string;
  created_by: string;
  clients: { razao_social: string | null; nome_fantasia: string | null } | null;
  contracts: ReportContract[];
}

export interface ReportFilters {
  status: string; // "all" | QuoteStatus
  seller: string; // "all" | user_id
  type: string;   // "all" | "venda" | "locacao" | "servico"
  start: string;  // YYYY-MM-DD ou ""
  end: string;    // YYYY-MM-DD ou ""
}

export const QUOTE_TYPE_LABEL: Record<string, string> = {
  venda: "Venda",
  locacao: "Locação",
  servico: "Serviço",
};

// ───────────── datas (sempre em Brasília) ─────────────

/** "2026-11" para um instante, no fuso de Brasília. */
export function monthKeyBR(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ_BR, year: "numeric", month: "2-digit" }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

/** Os últimos `n` meses (do mais antigo ao atual), como "YYYY-MM". */
export function lastMonthKeys(n: number, now: Date = new Date()): string[] {
  const [y, m] = monthKeyBR(now).split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i;
    const yy = Math.floor(idx / 12);
    const mm = (idx % 12) + 1;
    out.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return out;
}

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-11" → "nov/26" */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`;
}

/** Hoje (YYYY-MM-DD) em Brasília. */
export function todayBR(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ_BR, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type PeriodPreset = "all" | "month" | "30d" | "year";

/** Intervalo (YYYY-MM-DD) de um atalho de período, em Brasília. "all" = sem limite. */
export function presetRange(preset: PeriodPreset, now: Date = new Date()): { start: string; end: string } {
  if (preset === "all") return { start: "", end: "" };
  const end = todayBR(now);
  const [y, m, d] = end.split("-").map(Number);
  if (preset === "month") return { start: `${y}-${String(m).padStart(2, "0")}-01`, end };
  if (preset === "year") return { start: `${y}-01-01`, end };
  // últimos 30 dias, contando hoje
  const t = Date.UTC(y, m - 1, d) - 29 * 86_400_000;
  return { start: new Date(t).toISOString().slice(0, 10), end };
}

/** Início do dia (00:00) em Brasília, em milissegundos. Brasília não tem horário de verão desde 2019. */
export const brDayStart = (ymd: string) => new Date(`${ymd}T00:00:00-03:00`).getTime();
export const brDayEnd = (ymd: string) => new Date(`${ymd}T23:59:59.999-03:00`).getTime();

// ───────────── filtros ─────────────

export function filterQuotes(quotes: ReportQuote[], f: ReportFilters): ReportQuote[] {
  const start = f.start ? brDayStart(f.start) : null;
  const end = f.end ? brDayEnd(f.end) : null;
  return quotes.filter((q) => {
    if (f.status !== "all" && q.status !== f.status) return false;
    if (f.seller !== "all" && q.created_by !== f.seller) return false;
    if (f.type !== "all" && (q.quote_type || "venda") !== f.type) return false;
    const t = new Date(q.created_at).getTime();
    if (start !== null && t < start) return false;
    if (end !== null && t > end) return false;
    return true;
  });
}

/** Mesmos filtros, SEM o período: usado nos gráficos de série mensal (janela fixa de 12 meses). */
export function filterWithoutDates(quotes: ReportQuote[], f: ReportFilters): ReportQuote[] {
  return filterQuotes(quotes, { ...f, start: "", end: "" });
}

// ───────────── números ─────────────

export interface Stats {
  total: number;
  finalizadas: number;
  canceladas: number;
  comContrato: number;
  assinados: number; // propostas com ao menos um contrato assinado
  /** assinados ÷ finalizadas (%); null quando não há finalizadas */
  conversao: number | null;
  /** soma em R$ das propostas não canceladas */
  valorBRL: number;
  /** quantas propostas entraram na soma em R$ */
  qtdNaSoma: number;
  ticketMedio: number | null;
  /** propostas não canceladas em outra moeda, fora da soma */
  outraMoeda: number;
}

export function computeStats(quotes: ReportQuote[]): Stats {
  const ativas = quotes.filter((q) => q.status !== "cancelled");
  const emReais = ativas.filter((q) => amountCurrency(q) === "BRL");
  const valorBRL = emReais.reduce((s, q) => s + (Number(q.total) || 0), 0);
  const finalizadas = quotes.filter((q) => q.status === "finalized").length;
  const assinados = quotes.filter((q) => q.contracts.some((c) => c.status === "signed")).length;
  return {
    total: quotes.length,
    finalizadas,
    canceladas: quotes.length - ativas.length,
    comContrato: quotes.filter((q) => q.contracts.length > 0).length,
    assinados,
    conversao: finalizadas > 0 ? Math.round((assinados / finalizadas) * 100) : null,
    valorBRL,
    qtdNaSoma: emReais.length,
    ticketMedio: emReais.length > 0 ? valorBRL / emReais.length : null,
    outraMoeda: ativas.length - emReais.length,
  };
}

export interface MonthPoint { key: string; label: string; count: number; value: number }

/** Contratos assinados por mês (a estrela-guia). Conta CONTRATOS, pela data de assinatura. */
export function signedByMonth(quotes: ReportQuote[], months: string[]): MonthPoint[] {
  const map = new Map(months.map((k) => [k, 0]));
  for (const q of quotes) {
    for (const c of q.contracts) {
      if (c.status !== "signed") continue;
      const k = monthKeyBR(c.signed_at || c.created_at);
      if (map.has(k)) map.set(k, (map.get(k) || 0) + 1);
    }
  }
  return months.map((k) => ({ key: k, label: monthLabel(k), count: map.get(k) || 0, value: 0 }));
}

/** Propostas criadas por mês: quantidade e valor em R$ (não canceladas, só moeda R$). */
export function quotesByMonth(quotes: ReportQuote[], months: string[]): MonthPoint[] {
  const count = new Map(months.map((k) => [k, 0]));
  const value = new Map(months.map((k) => [k, 0]));
  for (const q of quotes) {
    const k = monthKeyBR(q.created_at);
    if (!count.has(k)) continue;
    count.set(k, (count.get(k) || 0) + 1);
    if (q.status !== "cancelled" && amountCurrency(q) === "BRL") value.set(k, (value.get(k) || 0) + (Number(q.total) || 0));
  }
  return months.map((k) => ({ key: k, label: monthLabel(k), count: count.get(k) || 0, value: value.get(k) || 0 }));
}

export interface Group { key: string; label: string; propostas: number; finalizadas: number; assinados: number; valorBRL: number; conversao: number | null }

function groupBy(quotes: ReportQuote[], keyOf: (q: ReportQuote) => string, labelOf: (k: string) => string): Group[] {
  const map = new Map<string, ReportQuote[]>();
  for (const q of quotes) {
    const k = keyOf(q);
    map.set(k, [...(map.get(k) || []), q]);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const s = computeStats(list);
      return { key, label: labelOf(key), propostas: s.total, finalizadas: s.finalizadas, assinados: s.assinados, valorBRL: s.valorBRL, conversao: s.conversao };
    })
    .sort((a, b) => b.valorBRL - a.valorBRL || b.propostas - a.propostas);
}

export const byType = (quotes: ReportQuote[]) =>
  groupBy(quotes, (q) => q.quote_type || "venda", (k) => QUOTE_TYPE_LABEL[k] || k);

export const bySeller = (quotes: ReportQuote[], names: Map<string, string>) =>
  groupBy(quotes, (q) => q.created_by, (k) => names.get(k) || "—");

export interface ContractRow {
  id: string;
  contract_number: string;
  quote_number: string;
  client: string;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  daysToSign: number | null;
}

export function contractRows(quotes: ReportQuote[]): ContractRow[] {
  const rows: ContractRow[] = [];
  for (const q of quotes) {
    for (const c of q.contracts) {
      const sent = c.sent_at ? new Date(c.sent_at).getTime() : null;
      const signed = c.signed_at ? new Date(c.signed_at).getTime() : null;
      rows.push({
        id: c.id,
        contract_number: c.contract_number || "—",
        quote_number: q.quote_number,
        client: q.clients?.nome_fantasia || q.clients?.razao_social || "—",
        status: c.status,
        sent_at: c.sent_at || null,
        signed_at: c.signed_at || null,
        daysToSign: sent !== null && signed !== null && signed >= sent ? Math.round(((signed - sent) / 86_400_000) * 10) / 10 : null,
      });
    }
  }
  return rows.sort((a, b) => (b.signed_at || b.sent_at || "").localeCompare(a.signed_at || a.sent_at || ""));
}

/** Média de dias entre o envio e a assinatura (só contratos com as duas datas). */
export function avgDaysToSign(rows: ContractRow[]): number | null {
  const v = rows.map((r) => r.daysToSign).filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null;
}

// ───────────── exportação ─────────────

/** CSV para o Excel em português: separador ";" e aspas escapadas. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}

export function downloadCsv(fileName: string, csv: string) {
  // BOM para o Excel reconhecer acentos
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
