import type { RentalWizardData } from "@/hooks/useRentalWizard";
import { cleanRentalData, legacyColumns, rentalTotals, toQuoteItemRows } from "@/lib/rentalProposal";

/**
 * O que a proposta de locação grava no banco. Fica fora da tela para poder ser testado:
 *  - `quotes`: dados da obra, totais, colunas antigas `rental_*` (contrato, frota e relatórios leem delas) e,
 *    se o banco já tem as colunas das propostas detalhadas, `service_data` com o quadro de preços e os textos;
 *  - `quote_items`: a grua (sem preço, no formato detalhado) e uma linha para cada custo que aparece.
 */
export interface RentalSaveArgs {
  data: RentalWizardData;
  /** o banco já tem quotes.service_data e quote_items.unit / is_optional? */
  detailed: boolean;
  discountApproved: boolean;
}

export function buildRentalQuotePayload({ data: d, detailed, discountApproved }: RentalSaveArgs): Record<string, any> {
  const months = d.rental_duration_months || 0;
  const t = rentalTotals(d.lines, months, d.discount_percent, d.rental_tax_percent);
  const payload: Record<string, any> = {
    client_id: d.client_id,
    quote_type: "locacao",
    project_name: d.project_name || null,
    project_location: d.project_location || null,
    grua_lanca_m: d.grua_lanca_m ?? null,
    grua_altura_torre_m: d.grua_altura_torre_m ?? null,
    grua_carga_maxima_kg: d.grua_carga_maxima_kg ?? null,
    grua_carga_ponta_kg: d.grua_carga_ponta_kg ?? null,
    grua_altura_trabalho_m: d.grua_altura_trabalho_m ?? null,
    currency: d.currency,
    payment_terms: d.payment_terms || null,
    payment_terms_items: d.payment_terms_items,
    freight_terms: d.freight_terms || null,
    validity_days: d.validity_days,
    notes: d.notes || null,
    // a proposta detalhada é sempre em português (o PDF novo não tem versão em inglês)
    language: "pt-BR",
    discount_percent: d.discount_percent,
    discount_value: t.discount,
    discount_approved: discountApproved,
    subtotal: t.subtotal,
    total: t.total,
    hide_discount_value: d.hide_discount_value,
    hide_unit_prices: d.hide_unit_prices,
    rental_duration_months: d.rental_duration_months,
    ...legacyColumns(d.lines, months),
    rental_start_date: d.rental_start_date || null,
    rental_terrain_condition: d.rental_terrain_condition || null,
    rental_special_foundation: d.rental_special_foundation,
    rental_work_type: d.rental_work_type || null,
    rental_height_needed: d.rental_height_needed,
    rental_jib_needed: d.rental_jib_needed,
    rental_max_weight: d.rental_max_weight,
    rental_tax_percent: d.rental_tax_percent,
  };
  if (detailed) payload.service_data = cleanRentalData({ ...d.rental, lines: d.lines });
  return payload;
}

export function buildRentalRows(quoteId: string, { data: d, detailed }: Pick<RentalSaveArgs, "data" | "detailed">): Array<Record<string, any>> {
  const months = d.rental_duration_months || 0;
  const rows: Array<Record<string, any>> = [];
  if (d.selected_crane_id) {
    // No formato detalhado a grua não leva preço (o aluguel é uma linha própria); no simples, leva o valor mensal, como antes
    const monthly = legacyColumns(d.lines, months).rental_monthly_value || 0;
    rows.push({
      quote_id: quoteId,
      product_id: d.selected_crane_id,
      product_code: d.selected_crane_code,
      product_name: d.selected_crane_name,
      product_category: "grua",
      unit_price: detailed ? 0 : monthly,
      quantity: 1,
      total_price: detailed ? 0 : monthly,
      order_index: 0,
      grua_lanca_m: d.grua_lanca_m,
      grua_altura_torre_m: d.grua_altura_torre_m,
      grua_carga_maxima_kg: d.grua_carga_maxima_kg,
      grua_carga_ponta_kg: d.grua_carga_ponta_kg,
      grua_altura_trabalho_m: d.grua_altura_trabalho_m,
      ...(detailed ? { unit: "Un", is_optional: false } : {}),
    });
  }
  if (detailed) rows.push(...toQuoteItemRows(quoteId, d.lines, months));
  return rows;
}
