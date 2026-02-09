import { useState, useCallback } from "react";
import { Currency, ProductCategory } from "@/types";

export interface QuoteItemDraft {
  product_id: string;
  product_code: string;
  product_name: string;
  product_category: ProductCategory;
  unit_price: number;
  quantity: number;
  total_price: number;
  notes?: string;
}

export interface QuoteWizardData {
  // Step 1 - Client
  client_id: string;
  client_name: string;

  // Step 2 - Project
  project_name: string;
  project_location: string;

  // Step 3 - Main Equipment (grua)
  equipment: QuoteItemDraft[];

  // Step 4 - Components (torre, tramo, chassis, configuracao)
  components: QuoteItemDraft[];

  // Step 5 - Accessories
  accessories: QuoteItemDraft[];

  // Step 6 - Commercial
  currency: Currency;
  delivery_time: string;
  payment_terms: string;
  freight_terms: string;
  validity_days: number;
  notes: string;

  // Step 7 - Discount
  discount_percent: number;
  discount_justification: string;
}

const INITIAL_DATA: QuoteWizardData = {
  client_id: "",
  client_name: "",
  project_name: "",
  project_location: "",
  equipment: [],
  components: [],
  accessories: [],
  currency: "BRL",
  delivery_time: "",
  payment_terms: "",
  freight_terms: "",
  validity_days: 30,
  notes: "",
  discount_percent: 0,
  discount_justification: "",
};

export const WIZARD_STEPS = [
  { id: 1, title: "Cliente", description: "Selecione o cliente" },
  { id: 2, title: "Projeto", description: "Dados da obra" },
  { id: 3, title: "Equipamento", description: "Grua principal" },
  { id: 4, title: "Componentes", description: "Torres, tramos e chassis" },
  { id: 5, title: "Acessórios", description: "Itens complementares" },
  { id: 6, title: "Comercial", description: "Condições comerciais" },
  { id: 7, title: "Descontos", description: "Desconto geral" },
  { id: 8, title: "Revisão", description: "Resumo e finalização" },
];

export function useQuoteWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuoteWizardData>(INITIAL_DATA);

  const updateData = useCallback((partial: Partial<QuoteWizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(s + 1, 8));
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback((s: number) => {
    setStep(Math.max(1, Math.min(s, 8)));
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
