import { supabase } from "@/integrations/supabase/client";
import type { CostKind, FleetCost, FleetRental, FleetUnit, QuoteForRental, UnitStatus } from "@/lib/fleet";

/**
 * Leitura e gravação da frota. As tabelas são novas (criadas por SQL manual) e ainda não constam nos
 * tipos gerados do Supabase, por isso o acesso passa por `db()`; os tipos de verdade estão em `fleet.ts`.
 */
const db = (table: string) => supabase.from(table as any) as any;

const n = (v: unknown): number => {
  const x = typeof v === "number" ? v : Number(v);
  return isFinite(x) ? x : 0;
};
const nn = (v: unknown): number | null => (v == null || v === "" ? null : n(v));

export interface RentalRow extends FleetRental {
  clients?: { razao_social: string | null; nome_fantasia: string | null } | null;
  contracts?: { contract_number: string; status: string; signed_at: string | null; signed_pdf_url: string | null } | null;
  quotes?: { quote_number: string } | null;
}

/** Grua de catálogo (produto da categoria "grua"): serve de modelo ao cadastrar uma grua da frota. */
export interface CatalogCrane {
  id: string;
  codigo: string;
  nome: string;
  default_lanca_m: number | null;
  default_altura_torre_m: number | null;
  default_carga_maxima_kg: number | null;
  default_carga_ponta_kg: number | null;
  rental_monthly_price: number | null;
}

export interface ClientOption {
  id: string;
  name: string;
}

export interface FleetData {
  units: FleetUnit[];
  rentals: RentalRow[];
  costs: FleetCost[];
  catalog: CatalogCrane[];
  clients: ClientOption[];
}

export const clientName = (c: { razao_social: string | null; nome_fantasia: string | null } | null | undefined) =>
  c?.nome_fantasia || c?.razao_social || "";

const unitFrom = (r: any): FleetUnit => ({
  id: r.id, code: r.code, product_id: r.product_id ?? null, model_name: r.model_name ?? null, serial_number: r.serial_number ?? null,
  year_manufactured: nn(r.year_manufactured),
  lanca_m: nn(r.lanca_m), altura_torre_m: nn(r.altura_torre_m), carga_maxima_kg: nn(r.carga_maxima_kg), carga_ponta_kg: nn(r.carga_ponta_kg),
  acquisition_cost: n(r.acquisition_cost), acquisition_date: r.acquisition_date ?? null,
  status: (r.status as UnitStatus) ?? "active", location_note: r.location_note ?? null, notes: r.notes ?? null,
});

const rentalFrom = (r: any): RentalRow => ({
  id: r.id, unit_id: r.unit_id, contract_id: r.contract_id ?? null, quote_id: r.quote_id ?? null, client_id: r.client_id ?? null,
  site_name: r.site_name ?? null, site_location: r.site_location ?? null,
  start_date: r.start_date, planned_end_date: r.planned_end_date, actual_end_date: r.actual_end_date ?? null, cancelled_at: r.cancelled_at ?? null,
  monthly_value: n(r.monthly_value), mobilization_value: n(r.mobilization_value), demobilization_value: n(r.demobilization_value),
  notes: r.notes ?? null,
  clients: r.clients ?? null, contracts: r.contracts ?? null, quotes: r.quotes ?? null,
});

const costFrom = (r: any): FleetCost => ({
  id: r.id, unit_id: r.unit_id, rental_id: r.rental_id ?? null, kind: r.kind as CostKind, amount: n(r.amount),
  incurred_on: r.incurred_on, description: r.description ?? null,
});

const RENTAL_SELECT =
  "*, clients(razao_social, nome_fantasia), contracts(contract_number, status, signed_at, signed_pdf_url), quotes(quote_number)";

function orThrow<T>(res: { data: T; error: any }): T {
  if (res.error) throw res.error;
  return res.data;
}

export async function fetchFleet(): Promise<FleetData> {
  const [units, rentals, costs, catalog, clients] = await Promise.all([
    db("fleet_units").select("*").order("code"),
    db("fleet_rentals").select(RENTAL_SELECT).order("start_date", { ascending: false }),
    db("fleet_costs").select("*").order("incurred_on", { ascending: false }),
    db("products")
      .select("id, codigo, nome, default_lanca_m, default_altura_torre_m, default_carga_maxima_kg, default_carga_ponta_kg, rental_monthly_price")
      .eq("categoria", "grua").eq("is_active", true).order("codigo"),
    db("clients").select("id, razao_social, nome_fantasia").eq("is_active", true).order("razao_social").limit(2000),
  ]);
  return {
    units: (orThrow(units) as any[]).map(unitFrom),
    rentals: (orThrow(rentals) as any[]).map(rentalFrom),
    costs: (orThrow(costs) as any[]).map(costFrom),
    catalog: (orThrow(catalog) as any[]).map((p) => ({
      id: p.id, codigo: p.codigo, nome: p.nome,
      default_lanca_m: nn(p.default_lanca_m), default_altura_torre_m: nn(p.default_altura_torre_m),
      default_carga_maxima_kg: nn(p.default_carga_maxima_kg), default_carga_ponta_kg: nn(p.default_carga_ponta_kg),
      rental_monthly_price: nn(p.rental_monthly_price),
    })),
    clients: (orThrow(clients) as any[]).map((c) => ({ id: c.id, name: clientName(c) || "(sem nome)" })),
  };
}

/** Locações ligadas a um contrato (para o cartão dentro da tela do contrato). */
export async function fetchContractRentals(contractId: string): Promise<{ rentals: RentalRow[]; units: FleetUnit[] }> {
  const rentals = (orThrow(await db("fleet_rentals").select(RENTAL_SELECT).eq("contract_id", contractId).order("start_date")) as any[]).map(rentalFrom);
  const ids = [...new Set(rentals.map((r) => r.unit_id))];
  const units = ids.length ? (orThrow(await db("fleet_units").select("*").in("id", ids)) as any[]).map(unitFrom) : [];
  return { rentals, units };
}

const currentUserId = async (): Promise<string | null> => (await supabase.auth.getUser()).data.user?.id ?? null;

/** Traduz erros do banco para uma frase que a pessoa entende. */
export function fleetErrorMessage(e: any): string {
  const msg = String(e?.message || "");
  if (e?.code === "23505" || /duplicate key/i.test(msg)) return "Já existe uma grua com esse código.";
  if (e?.code === "23503" || /foreign key/i.test(msg)) return "Não dá para apagar: há locações ou registros ligados a este item.";
  if (e?.code === "42501" || /row-level security|permission denied/i.test(msg)) return "Sem permissão: só administradores gerenciam a frota.";
  if (e?.code === "23514" || /check constraint/i.test(msg)) return "Algum valor ou data não é válido. Confira os campos.";
  return msg || "Tente novamente em instantes.";
}

// ───────────────────────── gruas ─────────────────────────
export type UnitInput = Omit<FleetUnit, "id"> & { id?: string };

export async function saveUnit(input: UnitInput): Promise<FleetUnit> {
  const { id, ...row } = input;
  if (id) return unitFrom(orThrow(await db("fleet_units").update(row).eq("id", id).select().single()));
  return unitFrom(orThrow(await db("fleet_units").insert({ ...row, created_by: await currentUserId() }).select().single()));
}

export async function deleteUnit(id: string): Promise<void> {
  orThrow(await db("fleet_units").delete().eq("id", id));
}

// ───────────────────────── locações ─────────────────────────
export type RentalInputRow = Omit<FleetRental, "id" | "actual_end_date" | "cancelled_at"> & { id?: string };

export async function saveRental(input: RentalInputRow): Promise<void> {
  const { id, ...row } = input;
  if (id) orThrow(await db("fleet_rentals").update(row).eq("id", id));
  else orThrow(await db("fleet_rentals").insert({ ...row, created_by: await currentUserId() }));
}

/** Registra a devolução da grua (e, se mudou, o valor da desmobilização). */
export async function finishRental(id: string, actualEnd: string, demobilization?: number): Promise<void> {
  const patch: Record<string, unknown> = { actual_end_date: actualEnd };
  if (demobilization != null) patch.demobilization_value = demobilization;
  orThrow(await db("fleet_rentals").update(patch).eq("id", id));
}

/** Desfaz uma devolução registrada por engano. */
export async function reopenRental(id: string): Promise<void> {
  orThrow(await db("fleet_rentals").update({ actual_end_date: null }).eq("id", id));
}

export async function extendRental(id: string, newPlannedEnd: string): Promise<void> {
  orThrow(await db("fleet_rentals").update({ planned_end_date: newPlannedEnd }).eq("id", id));
}

export async function cancelRental(id: string): Promise<void> {
  orThrow(await db("fleet_rentals").update({ cancelled_at: new Date().toISOString() }).eq("id", id));
}

// ───────────────────────── custos ─────────────────────────
export type CostInput = Omit<FleetCost, "id"> & { id?: string };

export async function saveCost(input: CostInput): Promise<void> {
  const { id, ...row } = input;
  if (id) orThrow(await db("fleet_costs").update(row).eq("id", id));
  else orThrow(await db("fleet_costs").insert({ ...row, created_by: await currentUserId() }));
}

export async function deleteCost(id: string): Promise<void> {
  orThrow(await db("fleet_costs").delete().eq("id", id));
}

// ───────────────────────── propostas e contratos de locação ─────────────────────────
export interface ContractOption {
  id: string;
  contract_number: string;
  status: string;
  signed_at: string | null;
  quote_id: string;
  client_id: string | null;
  client_name: string;
  quote_number: string | null;
}

/** Contratos de propostas de LOCAÇÃO (menos os cancelados): são os que podem ganhar uma grua. */
export async function fetchRentalContracts(): Promise<ContractOption[]> {
  const rows = orThrow(
    await db("contracts")
      .select("id, contract_number, status, signed_at, quote_id, quotes(quote_number, quote_type, client_id, clients(razao_social, nome_fantasia))")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(500),
  ) as any[];
  return rows
    .filter((c) => c.quotes?.quote_type === "locacao")
    .map((c) => ({
      id: c.id, contract_number: c.contract_number, status: c.status, signed_at: c.signed_at ?? null, quote_id: c.quote_id,
      client_id: c.quotes?.client_id ?? null, client_name: clientName(c.quotes?.clients), quote_number: c.quotes?.quote_number ?? null,
    }));
}

const QUOTE_COLS =
  "id, client_id, project_name, project_location, currency, usd_brl_rate_used, rental_start_date, rental_duration_months, rental_monthly_value, rental_mobilization, rental_demobilization, rental_height_needed, rental_jib_needed, rental_max_weight";

export async function fetchQuoteForRental(quoteId: string): Promise<QuoteForRental> {
  const q = orThrow(await db("quotes").select(QUOTE_COLS).eq("id", quoteId).single()) as any;
  return {
    id: q.id, client_id: q.client_id ?? null, project_name: q.project_name ?? null, project_location: q.project_location ?? null,
    currency: q.currency, usd_brl_rate_used: nn(q.usd_brl_rate_used),
    rental_start_date: q.rental_start_date ?? null, rental_duration_months: nn(q.rental_duration_months),
    rental_monthly_value: nn(q.rental_monthly_value), rental_mobilization: nn(q.rental_mobilization), rental_demobilization: nn(q.rental_demobilization),
    rental_height_needed: nn(q.rental_height_needed), rental_jib_needed: nn(q.rental_jib_needed), rental_max_weight: nn(q.rental_max_weight),
  };
}
