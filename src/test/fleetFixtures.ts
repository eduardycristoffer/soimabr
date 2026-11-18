import type { FleetCost, FleetUnit } from "@/lib/fleet";
import type { CatalogCrane, FleetData, RentalRow } from "@/lib/fleetApi";

/** Hoje fixo dos testes da frota. */
export const TODAY = "2026-06-15";

export const unit = (id: string, extra: Partial<FleetUnit> = {}): FleetUnit => ({
  id, code: id.toUpperCase(), product_id: null, model_name: null, serial_number: null, year_manufactured: null,
  lanca_m: 50, altura_torre_m: 40, carga_maxima_kg: 2500, carga_ponta_kg: 1000,
  acquisition_cost: 0, acquisition_date: null, status: "active", location_note: null, notes: null, ...extra,
});

let seq = 0;
export const rental = (unit_id: string, start_date: string, planned_end_date: string, extra: Partial<RentalRow> = {}): RentalRow => ({
  id: `r${++seq}`, unit_id, contract_id: null, quote_id: null, client_id: null, site_name: null, site_location: null,
  start_date, planned_end_date, actual_end_date: null, cancelled_at: null,
  monthly_value: 10000, mobilization_value: 0, demobilization_value: 0, notes: null,
  clients: null, contracts: null, quotes: null, ...extra,
});

export const cost = (unit_id: string, kind: FleetCost["kind"], amount: number, incurred_on: string): FleetCost => ({
  id: `c${++seq}`, unit_id, rental_id: null, kind, amount, incurred_on, description: null,
});

export const crane = (id: string, extra: Partial<CatalogCrane> = {}): CatalogCrane => ({
  id, codigo: id.toUpperCase(), nome: `Grua ${id}`, default_lanca_m: 45, default_altura_torre_m: 27,
  default_carga_maxima_kg: 2500, default_carga_ponta_kg: 1000, rental_monthly_price: 18500, ...extra,
});

export const fleetData = (over: Partial<FleetData> = {}): FleetData => ({
  units: [], rentals: [], costs: [], catalog: [], clients: [{ id: "k1", name: "Alfa SA" }, { id: "k2", name: "Beta Ltda" }], ...over,
});
