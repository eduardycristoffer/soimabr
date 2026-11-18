import { useState, useCallback, useMemo } from "react";
import { ClientType } from "@/types";
import {
  ServiceData, ServiceItem, defaultServiceData, serviceTotals,
} from "@/lib/serviceProposal";

export interface ServiceWizardData {
  // Etapa 1 – cliente
  client_id: string;
  client_name: string;
  client_type: ClientType;

  // Etapa 2 – obra e escopo
  project_name: string;
  project_location: string;

  // Etapa 3 – preços
  items: ServiceItem[];
  /** mostra preço unitário e valor de cada linha no PDF (na proposta de serviço a tabela de preços É a proposta) */
  show_unit_prices: boolean;

  // Etapa 4 – condições
  validity_days: number;
  notes: string;
  service: ServiceData;

  // Etapa 5 – revisão
  /** o usuário confirmou que revisou os textos-padrão (reajuste, retenções, prazos...) */
  texts_reviewed: boolean;
}

export const SERVICE_WIZARD_STEPS = [
  { id: 1, title: "Cliente", description: "Selecione o cliente" },
  { id: 2, title: "Escopo", description: "Obra, objeto e equipamento" },
  { id: 3, title: "Preços", description: "Tabela de serviços e preços" },
  { id: 4, title: "Condições", description: "Pagamento, responsabilidades e considerações" },
  { id: 5, title: "Revisão", description: "Confirmar e salvar" },
];

const LAST_STEP = SERVICE_WIZARD_STEPS.length;

export function initialServiceData(): ServiceWizardData {
  return {
    client_id: "",
    client_name: "",
    client_type: "nacional",
    project_name: "",
    project_location: "",
    items: [],
    show_unit_prices: true,
    validity_days: 30,
    notes: "",
    service: defaultServiceData(),
    texts_reviewed: false,
  };
}

export function useServiceWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ServiceWizardData>(initialServiceData);

  const updateData = useCallback((partial: Partial<ServiceWizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  /** Atualiza só os textos/dados da proposta de serviço. */
  const updateService = useCallback((partial: Partial<ServiceData>) => {
    setData((prev) => ({ ...prev, service: { ...prev.service, ...partial }, texts_reviewed: false }));
  }, []);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, LAST_STEP)), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  const goToStep = useCallback((s: number) => setStep(Math.max(1, Math.min(s, LAST_STEP))), []);
  const reset = useCallback(() => {
    setStep(1);
    setData(initialServiceData());
  }, []);

  const totals = useMemo(() => serviceTotals(data.items), [data.items]);

  return { step, data, updateData, updateService, nextStep, prevStep, goToStep, reset, totals };
}
