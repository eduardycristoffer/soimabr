import { useState, useCallback, useMemo } from "react";
import { ClientType, Currency } from "@/types";
import { PaymentTermItem } from "@/hooks/useQuoteWizard";
import { RentalData, RentalLine, defaultRentalData, rentalTotals } from "@/lib/rentalProposal";

export interface RentalWizardData {
  // Etapa 1 - Cliente
  client_id: string;
  client_name: string;
  client_type: ClientType;

  // Etapa 2 - Obra
  project_name: string;
  project_location: string;
  rental_work_type: string; // residencial, comercial, industrial (opcional)
  rental_height_needed: number | null;
  rental_jib_needed: number | null;
  rental_max_weight: number | null;
  rental_duration_months: number | null;
  rental_start_date: string;
  rental_terrain_condition: string; // opcional
  rental_special_foundation: boolean; // opcional

  // Etapa 3 - Grua
  selected_crane_id: string;
  selected_crane_name: string;
  selected_crane_code: string;
  grua_lanca_m: number | null;
  grua_altura_torre_m: number | null;
  grua_carga_maxima_kg: number | null;
  grua_carga_ponta_kg: number | null;
  grua_altura_trabalho_m: number | null;

  // Etapa 4 - Quadro de preços (cada custo é uma linha própria)
  lines: RentalLine[];

  // Etapa 5 - Condições (textos da proposta)
  rental: RentalData;

  // Etapa 6 - Comercial
  currency: Currency;
  discount_percent: number;
  discount_justification: string;
  rental_tax_percent: number;
  payment_terms: string;
  payment_terms_items: PaymentTermItem[];
  freight_terms: string;
  validity_days: number;
  notes: string;
  language: "pt-BR" | "en";
  hide_discount_value: boolean;
  hide_unit_prices: boolean;

  // Revisão
  /** a pessoa confirmou que revisou os textos-padrão (percentuais, prazos, reajustes...) */
  texts_reviewed: boolean;
}

export function initialRentalData(): RentalWizardData {
  const rental = defaultRentalData();
  return {
    client_id: "",
    client_name: "",
    client_type: "nacional",
    project_name: "",
    project_location: "",
    rental_work_type: "",
    rental_height_needed: null,
    rental_jib_needed: null,
    rental_max_weight: null,
    rental_duration_months: null,
    rental_start_date: "",
    rental_terrain_condition: "",
    rental_special_foundation: false,
    selected_crane_id: "",
    selected_crane_name: "",
    selected_crane_code: "",
    grua_lanca_m: null,
    grua_altura_torre_m: null,
    grua_carga_maxima_kg: null,
    grua_carga_ponta_kg: null,
    grua_altura_trabalho_m: null,
    lines: rental.lines,
    rental,
    currency: "BRL",
    discount_percent: 0,
    discount_justification: "",
    rental_tax_percent: 0,
    payment_terms: "",
    payment_terms_items: [],
    freight_terms: "",
    validity_days: 30,
    notes: "",
    language: "pt-BR",
    hide_discount_value: true,
    // No quadro de preços da locação os valores SÃO a proposta; quem quiser esconder, desmarca na etapa Comercial.
    hide_unit_prices: false,
    texts_reviewed: false,
  };
}

export const RENTAL_WIZARD_STEPS = [
  { id: 1, title: "Cliente", description: "Selecione o cliente" },
  { id: 2, title: "Obra", description: "Dados da obra" },
  { id: 3, title: "Grua", description: "Seleção do equipamento" },
  { id: 4, title: "Preços", description: "Quadro de preços e custos" },
  { id: 5, title: "Condições", description: "Textos e condições da proposta" },
  { id: 6, title: "Comercial", description: "Desconto, impostos e pagamento" },
  { id: 7, title: "Resumo", description: "Resumo financeiro" },
  { id: 8, title: "Revisão", description: "Confirmar e salvar" },
];

const LAST_STEP = RENTAL_WIZARD_STEPS.length;

export function useRentalWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RentalWizardData>(initialRentalData);

  const updateData = useCallback((partial: Partial<RentalWizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateRental = useCallback((partial: Partial<RentalData>) => {
    setData((prev) => ({ ...prev, rental: { ...prev.rental, ...partial } }));
  }, []);

  /** As linhas vivem em um só lugar (data.lines) e são copiadas para os dados gravados ao salvar. */
  const updateLines = useCallback((lines: RentalLine[]) => {
    setData((prev) => ({ ...prev, lines }));
  }, []);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, LAST_STEP)), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  const goToStep = useCallback((s: number) => setStep(Math.max(1, Math.min(s, LAST_STEP))), []);

  const reset = useCallback(() => {
    setStep(1);
    setData(initialRentalData());
  }, []);

  const months = data.rental_duration_months || 0;
  const totals = useMemo(
    () => rentalTotals(data.lines, months, data.discount_percent, data.rental_tax_percent),
    [data.lines, months, data.discount_percent, data.rental_tax_percent],
  );

  return {
    step,
    data,
    updateData,
    updateRental,
    updateLines,
    nextStep,
    prevStep,
    goToStep,
    reset,
    months,
    totals,
    // nomes que a etapa Comercial já usa
    subtotal: totals.subtotal,
    discountValue: totals.discount,
    taxValue: totals.tax,
    total: totals.total,
  };
}
