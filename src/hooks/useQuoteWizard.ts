import { useState, useCallback } from "react";
import { ClientType, Currency, ProductCategory } from "@/types";

export interface QuoteItemDraft {
  product_id: string;
  product_code: string;
  product_name: string;
  product_category: ProductCategory;
  unit_price: number;
  quantity: number;
  total_price: number;
  notes?: string;
  grua_lanca_m?: number | null;
  grua_altura_torre_m?: number | null;
  grua_carga_maxima_kg?: number | null;
  grua_carga_ponta_kg?: number | null;
  grua_altura_trabalho_m?: number | null;
}

export interface PanelItemDraft {
  text: string;
  order: number;
}

export interface QuoteWizardData {
  // Step 1 - Client
  client_id: string;
  client_name: string;
  client_type: ClientType;

  // Step 2 - Project
  project_name: string;
  project_location: string;

  // Step 3 - Main Equipment (grua)
  equipment: QuoteItemDraft[];

  // Step 4 - Components (torre, tramo, chassis, configuracao)
  components: QuoteItemDraft[];

  // Step 5 - Accessories
  accessories: QuoteItemDraft[];

  // Step 3b - Grua specs (per quote, not per product)
  grua_lanca_m: number | null;
  grua_altura_torre_m: number | null;
  grua_carga_maxima_kg: number | null;
  grua_carga_ponta_kg: number | null;
  grua_altura_trabalho_m: number | null;

  // Step 6 - Technical / Scope
  spec_override_enabled: boolean;
  spec_tipo: string;
  spec_vel_elevacao: string;
  spec_vel_rotacao: string;
  spec_vel_translacao: string;

  // Panel
  panel_items: PanelItemDraft[];
  panel_voltage: string;
  panel_include_motors: boolean;
  panel_motor_elev_kw: number | null;
  panel_motor_elev_hp: number | null;
  panel_motor_elev_vel: string;
  panel_motor_trans_kw: number | null;
  panel_motor_trans_hp: number | null;
  panel_motor_trans_vel: string;
  panel_motor_rot_kw: number | null;
  panel_motor_rot_hp: number | null;
  panel_motor_rot_vel: string;

  // Warranty
  warranty_struct_years: number;
  warranty_paint_years: number;
  warranty_components_years: number;

  // Step 7 - Commercial
  currency: Currency;
  delivery_time: string;
  payment_terms: string;
  freight_terms: string;
  validity_days: number;
  notes: string;
  language: "pt-BR" | "en";

  // Step 8 - Discount
  discount_percent: number;
  discount_justification: string;

  // International pricing
  usd_brl_rate_used: number | null;
  usd_brl_rate_updated_at: string | null;
}

const INITIAL_DATA: QuoteWizardData = {
  client_id: "",
  client_name: "",
  client_type: "nacional",
  project_name: "",
  project_location: "",
  equipment: [],
  components: [],
  accessories: [],
  grua_lanca_m: null,
  grua_altura_torre_m: null,
  grua_carga_maxima_kg: null,
  grua_carga_ponta_kg: null,
  grua_altura_trabalho_m: null,
  spec_override_enabled: false,
  spec_tipo: "",
  spec_vel_elevacao: "",
  spec_vel_rotacao: "",
  spec_vel_translacao: "",
  panel_items: [],
  panel_voltage: "380",
  panel_include_motors: false,
  panel_motor_elev_kw: null,
  panel_motor_elev_hp: null,
  panel_motor_elev_vel: "",
  panel_motor_trans_kw: null,
  panel_motor_trans_hp: null,
  panel_motor_trans_vel: "",
  panel_motor_rot_kw: null,
  panel_motor_rot_hp: null,
  panel_motor_rot_vel: "",
  warranty_struct_years: 3,
  warranty_paint_years: 2,
  warranty_components_years: 1,
  currency: "BRL",
  delivery_time: "",
  payment_terms: "",
  freight_terms: "",
  validity_days: 30,
  notes: "",
  language: "pt-BR",
  discount_percent: 0,
  discount_justification: "",
  usd_brl_rate_used: null,
  usd_brl_rate_updated_at: null,
};

export const WIZARD_STEPS = [
  { id: 1, title: "Cliente", description: "Selecione o cliente" },
  { id: 2, title: "Projeto", description: "Dados da obra" },
  { id: 3, title: "Equipamento", description: "Grua principal" },
  { id: 4, title: "Componentes", description: "Torres, tramos e chassis" },
  { id: 5, title: "Acessórios", description: "Itens complementares" },
  { id: 6, title: "Técnico", description: "Escopo, painel e garantia" },
  { id: 7, title: "Comercial", description: "Condições comerciais" },
  { id: 8, title: "Descontos", description: "Desconto geral" },
  { id: 9, title: "Revisão", description: "Resumo e finalização" },
];

export function useQuoteWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuoteWizardData>(INITIAL_DATA);

  const updateData = useCallback((partial: Partial<QuoteWizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(s + 1, 9));
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback((s: number) => {
    setStep(Math.max(1, Math.min(s, 9)));
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setData(INITIAL_DATA);
  }, []);

  const allItems = [...data.equipment, ...data.components, ...data.accessories];
  const subtotal = allItems.reduce((sum, i) => sum + i.total_price, 0);
  const discountValue = subtotal * (data.discount_percent / 100);
  const total = subtotal - discountValue;

  return {
    step,
    data,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    reset,
    subtotal,
    discountValue,
    total,
  };
}
