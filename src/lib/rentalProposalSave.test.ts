import { describe, it, expect } from "vitest";
import { initialRentalData, type RentalWizardData } from "@/hooks/useRentalWizard";
import { rentalTotals, type RentalLine } from "@/lib/rentalProposal";
import { buildRentalQuotePayload, buildRentalRows } from "./rentalProposalSave";

const set = (lines: RentalLine[], key: string, unit_price: number, extra: Partial<RentalLine> = {}) => {
  Object.assign(lines.find((l) => l.key === key)!, { unit_price, enabled: true, ...extra });
};

function wizardData(over: Partial<RentalWizardData> = {}): RentalWizardData {
  const d = initialRentalData();
  set(d.lines, "rent", 22666);
  set(d.lines, "assembly", 17000);
  set(d.lines, "disassembly", 27000);
  set(d.lines, "mobilization", 54600);
  set(d.lines, "demobilization", 54600);
  return {
    ...d, client_id: "c1", project_name: "Obra X", rental_duration_months: 8, selected_crane_id: "p1",
    selected_crane_code: "MC85", selected_crane_name: "POTAIN MC85AS", grua_lanca_m: 50, ...over,
  };
}

describe("o que a locação grava na proposta", () => {
  it("totais da proposta saem do quadro de preços", () => {
    const d = wizardData({ discount_percent: 10, rental_tax_percent: 5 });
    const p = buildRentalQuotePayload({ data: d, detailed: true, discountApproved: true });
    const t = rentalTotals(d.lines, 8, 10, 5);
    expect(p).toMatchObject({ quote_type: "locacao", subtotal: t.subtotal, discount_value: t.discount, total: t.total, language: "pt-BR", discount_approved: true });
  });

  it("colunas antigas continuam preenchidas (contrato, frota e relatórios dependem delas)", () => {
    const p = buildRentalQuotePayload({ data: wizardData(), detailed: true, discountApproved: true });
    expect(p).toMatchObject({
      rental_monthly_value: 22666, rental_mobilization: 54600, rental_demobilization: 54600,
      rental_assembly: 17000, rental_disassembly: 27000, rental_freight: 0, rental_duration_months: 8,
      rental_operator_included: false, rental_insurance_included: false,
    });
  });

  it("operador, seguro, manutenção e assistência viram 'sim' nas colunas antigas só quando têm valor", () => {
    const d = wizardData();
    set(d.lines, "operator", 12000);
    set(d.lines, "insurance", 1500);
    set(d.lines, "maintenance_monthly", 0); // ligada mas sem valor: não aparece e não conta
    const p = buildRentalQuotePayload({ data: d, detailed: true, discountApproved: true });
    expect(p).toMatchObject({ rental_operator_included: true, rental_insurance_included: true, rental_maintenance_included: false });
  });

  it("textos e quadro vão em service_data (kind locacao), sem linhas livres vazias", () => {
    const d = wizardData();
    d.rental = { ...d.rental, subject: "Locação de grua", attention: "Eng. Fulano" };
    const p = buildRentalQuotePayload({ data: d, detailed: true, discountApproved: true });
    expect(p.service_data.kind).toBe("locacao");
    expect(p.service_data).toMatchObject({ subject: "Locação de grua", attention: "Eng. Fulano" });
    expect(p.service_data.lines.find((l: RentalLine) => l.key === "rent").unit_price).toBe(22666);
  });

  it("banco sem as colunas novas: nada de service_data, e a grua leva o valor mensal como antes", () => {
    const d = wizardData();
    const p = buildRentalQuotePayload({ data: d, detailed: false, discountApproved: true });
    expect("service_data" in p).toBe(false);
    const rows = buildRentalRows("q1", { data: d, detailed: false });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ product_category: "grua", unit_price: 22666, total_price: 22666, order_index: 0 });
    expect("unit" in rows[0]).toBe(false);
  });

  it("formato detalhado: a grua vai sem preço e cada custo que aparece vira uma linha, na ordem do quadro", () => {
    const d = wizardData();
    set(d.lines, "operator", 12000);
    const rows = buildRentalRows("q1", { data: d, detailed: true });
    expect(rows[0]).toMatchObject({ product_category: "grua", unit_price: 0, total_price: 0, order_index: 0, unit: "Un", is_optional: false });
    const priced = rows.slice(1);
    expect(priced.map((r) => r.product_name)).toEqual([
      expect.stringContaining("Locação mensal"),
      expect.stringContaining("Montagem"),
      expect.stringContaining("Desmontagem"),
      expect.stringContaining("mobilização (entrega)"),
      expect.stringContaining("desmobilização"),
      expect.stringContaining("Operador mensal"),
    ]);
    expect(priced.map((r) => r.order_index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(priced.every((r) => r.quote_id === "q1")).toBe(true);
    // a soma das linhas é o subtotal gravado na proposta
    const p = buildRentalQuotePayload({ data: d, detailed: true, discountApproved: true });
    expect(priced.reduce((s, r) => s + r.total_price, 0)).toBe(p.subtotal);
  });

  it("sem grua escolhida (rascunho) não cria linha da grua", () => {
    const d = wizardData({ selected_crane_id: "" });
    expect(buildRentalRows("q1", { data: d, detailed: true }).some((r) => r.product_category === "grua")).toBe(false);
    expect(buildRentalRows("q1", { data: d, detailed: false })).toEqual([]);
  });
});
