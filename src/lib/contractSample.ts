import { buildPlaceholderMap, type ContractGenerationInputs } from "@/lib/contractPlaceholders";

/**
 * Dados de EXEMPLO para a visualização do modelo de contrato. Tudo é fictício (empresa "Exemplo",
 * cliente "Modelo") e passa pelo MESMO `buildPlaceholderMap` da geração real, então a visualização
 * mostra exatamente o formato que o contrato terá (CNPJ com pontos, valor por extenso, tabela...).
 */
export function buildSampleMap(now: Date = new Date()): Record<string, string> {
  const company = {
    razao_social: "SOIMA Exemplo Indústria Ltda",
    cnpj: "11222333000181",
    inscricao_estadual: "10.123.456-7",
    address: "Avenida do Exemplo, 1000, Distrito Industrial, Anápolis-GO, CEP 75000-000",
    email: "contato@empresa-exemplo.com.br",
    representante_nome: "Maria Exemplo da Silva",
    representante_cpf: "11144477735",
    representante_rg: "1234567 SSP/GO",
    representante_cargo: "Diretora",
  };

  const client = {
    razao_social: "Construtora Modelo Ltda",
    cnpj: "45723174000110",
    endereco: "Rua das Obras, 250",
    cidade: "Goiânia",
    estado: "GO",
    cep: "74000000",
    email: "financeiro@construtora-modelo.com.br",
  };

  const grua = {
    product_category: "grua",
    product_code: "GRU-045",
    product_name: "Grua torre SOIMA modelo exemplo",
    quantity: 1,
    grua_lanca_m: 45,
    grua_altura_torre_m: 27,
    grua_carga_maxima_kg: 2500,
    grua_carga_ponta_kg: 1000,
  };
  const items = [
    grua,
    { product_category: "torre", product_code: "TRR-001", product_name: "Torre de 27 metros", quantity: 1 },
    { product_category: "acessorio", product_code: "ACE-010", product_name: "Kit de ancoragem", quantity: 2 },
    { product_category: "servico", product_code: "SRV-001", product_name: "Montagem e ART", quantity: 1 },
  ];

  const quote = {
    quote_type: "venda",
    total: 570120,
    grua_lanca_m: 45,
    grua_altura_torre_m: 27,
    grua_carga_maxima_kg: 2500,
    grua_carga_ponta_kg: 1000,
    warranty_struct_years: 2,
    warranty_components_years: 1,
    delivery_time: 60,
    // dados de locação, para os modelos de locação
    rental_duration_months: 12,
    rental_monthly_value: 18500,
    rental_mobilization: 6000,
    rental_demobilization: 6000,
    rental_freight: 4500,
    rental_assembly: 9000,
    rental_disassembly: 7000,
    rental_operator_included: true,
    rental_maintenance_included: true,
    rental_insurance_included: false,
    rental_technical_assistance: true,
    rental_start_date: "2026-03-01",
    rental_terrain_condition: "plano",
    rental_special_foundation: false,
    rental_work_type: "residencial",
    rental_height_needed: 60,
    rental_jib_needed: 45,
    rental_max_weight: 2500,
    rental_tax_percent: 0,
  };

  const inputs: ContractGenerationInputs = {
    contract_date: now,
    buyer_rep_name: "João Exemplo Pereira",
    buyer_rep_cpf: "52998224725",
    buyer_rep_rg: "7654321 SSP/GO",
    buyer_rep_cargo: "Diretor",
    seller_manager_name: "Carlos Exemplo Souza",
    seller_manager_cpf: "39053344705",
    seller_manager_phone: "62999990000",
    seller_manager_email: "gestor@empresa-exemplo.com.br",
    buyer_manager_name: "Ana Modelo Lima",
    buyer_manager_cpf: "86288366757",
    buyer_manager_phone: "62988880000",
    buyer_manager_email: "obras@construtora-modelo.com.br",
    delivery_days: 60,
    payment_schedule: [
      { label: "Entrada", value: 171036, due: "na assinatura do contrato" },
      { label: "Parcela 1", value: 199542, due: "em 30 dias" },
      { label: "Parcela 2", value: 199542, due: "em 60 dias" },
    ],
  };

  return buildPlaceholderMap({ quote, client, company, items, inputs, contract_number: "CTR260001" });
}
