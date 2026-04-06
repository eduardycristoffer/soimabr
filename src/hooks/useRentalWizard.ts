import { useState, useCallback } from "react";
import { ClientType, Currency } from "@/types";
import { PaymentTermItem } from "@/hooks/useQuoteWizard";

export interface RentalWizardData {
  // Step 1 - Client
  client_id: string;
  client_name: string;
  client_type: ClientType;

  // Step 2 - Work site
  project_name: string;
  project_location: string;
  rental_work_type: string; // residencial, comercial, industrial
  rental_height_needed: number | null;
  rental_jib_needed: number | null;
  rental_max_weight: number | null;
  rental_duration_months: number | null;
  rental_start_date: string;
  rental_terrain_condition: string;
  rental_special_foundation: boolean;

  // Step 3 - Crane selection
  selected_crane_id: string;
  selected_crane_name: string;
  selected_crane_code: string;
  grua_lanca_m: number | null;
  grua_altura_torre_m: number | null;
  grua_carga_maxima_kg: number | null;
  grua_carga_ponta_kg: number | null;
  grua_altura_trabalho_m: number | null;

  // Step 4 - Rental config
  rental_monthly_value: number | null;
  rental_mobilization: number;
  rental_demobilization: number;
  rental_freight: number;
  rental_assembly: number;
  rental_disassembly: number;
  rental_operator_included: boolean;
  rental_maintenance_included: boolean;
  rental_insurance_included: boolean;
  rental_technical_assistance: boolean;

  // Step 5 - Commercial
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
}

const INITIAL_DATA: RentalWizardData = {
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
  rental_monthly_value: null,
  rental_mobilization: 0,
  rental_demobilization: 0,
  rental_freight: 0,
  rental_assembly: 0,
  rental_disassembly: 0,
  rental_operator_included: false,
  rental_maintenance_included: false,
  rental_insurance_included: false,
  rental_technical_assistance: false,
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
  hide_discount_value: false,
  hide_unit_prices: false,
};

export const RENTAL_WIZARD_STEPS = [
  { id: 1, title: "Cliente", description: "Selecione o cliente" },
  { id: 2, title: "Obra", description: "Dados da obra" },
  { id: 3, title: "Grua", description: "Seleção do equipamento" },
  { id: 4, title: "Aluguel", description: "Configuração do aluguel" },
  { id: 5, title: "Comercial", description: "Ajustes comerciais" },
  { id: 6, title: "Resumo", description: "Resumo financeiro" },
  { id: 7, title: "Revisão", description: "Confirmar e salvar" },
];

export function useRentalWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RentalWizardData>(INITIAL_DATA);

  const updateData = useCallback((partial: Partial<RentalWizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(s + 1, 7));
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback((s: number) => {
    setStep(Math.max(1, Math.min(s, 7)));
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setData(INITIAL_DATA);
  }, []);

  // Calculations
  const months = data.rental_duration_months || 0;
  const monthlyValue = data.rental_monthly_value || 0;
  const rentalSubtotal = monthlyValue * months;
  const additionalCosts =
    data.rental_mobilization +
    data.rental_demobilization +
    data.rental_freight +
    data.rental_assembly +
    data.rental_disassembly;
  const subtotal = rentalSubtotal + additionalCosts;
  const discountValue = subtotal * (data.discount_percent / 100);
  const afterDiscount = subtotal - discountValue;
  const taxValue = afterDiscount * (data.rental_tax_percent / 100);
  const total = afterDiscount + taxValue;

  return {
    step,
    data,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    reset,
    rentalSubtotal,
    additionalCosts,
    subtotal,
    discountValue,
    taxValue,
    total,
  };
}
