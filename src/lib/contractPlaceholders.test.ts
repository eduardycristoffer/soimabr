import { describe, it, expect } from "vitest";
import {
  buildPlaceholderMap,
  formatDateOnlyBR,
  qualificacaoRepresentantes,
  resolvePlaceholders,
  type ContractGenerationInputs,
} from "@/lib/contractPlaceholders";

// Frase de qualificação exatamente como está no modelo padrão de venda
const QUALIFICACAO_MODELO =
  "{{compradora_razao_social}}, inscrita no CNPJ/CPF sob o nº {{compradora_cnpj_cpf}}, com sede/domicílio em {{compradora_endereco}}, e-mail {{compradora_email}}, neste ato representada por {{compradora_representante_nome}}, portador(a) do CPF nº {{compradora_representante_cpf}} e RG nº {{compradora_representante_rg}}, cargo {{compradora_representante_cargo}}, doravante denominada COMPRADORA;";

const baseInputs = (over: Partial<ContractGenerationInputs> = {}): ContractGenerationInputs => ({
  buyer_rep_name: "MÁRIO SOARES",
  buyer_rep_cpf: "18645364115",
  buyer_rep_rg: "410.358 SSP/GO",
  buyer_rep_cargo: "Sócio",
  payment_schedule: [],
  ...over,
});

const build = (inputs: ContractGenerationInputs, client: any = {}) =>
  buildPlaceholderMap({
    quote: { total: 650000, quote_type: "venda" },
    client: { razao_social: "ARTE PROJETO IMOBILIARIO SPE 05 LTDA", cnpj: "18555835000173", ...client },
    company: { razao_social: "Soíma Brasil", cnpj: "17007780000102", inscricao_estadual: "10.550.407-6" },
    items: [],
    inputs,
    contract_number: "CTR260006",
  });

describe("qualificação de representantes", () => {
  it("1 representante mantém o texto original do modelo", () => {
    const map = build(baseInputs());
    const out = resolvePlaceholders(QUALIFICACAO_MODELO, map);
    expect(out).toContain("neste ato representada por MÁRIO SOARES, portador(a) do CPF nº 186.453.641-15 e RG nº 410.358 SSP/GO, cargo Sócio, doravante");
  });

  it("2 representantes aparecem os dois na qualificação (caso ARTE: Mário e Lucas)", () => {
    const map = build(
      baseInputs({
        buyer_reps: [
          { name: "MÁRIO SOARES", cpf: "18645364115", rg: "410.358 SSP/GO", cargo: "Sócio" },
          { name: "LUCAS CAMARGO RASSI", cpf: "706.820.081-84", rg: "", cargo: "Sócio" },
        ],
      }),
    );
    const out = resolvePlaceholders(QUALIFICACAO_MODELO, map);
    expect(out).toContain("MÁRIO SOARES, portador(a) do CPF nº 186.453.641-15");
    expect(out).toContain("; e LUCAS CAMARGO RASSI, portador(a) do CPF nº 706.820.081-84 e RG nº —, cargo Sócio");
    expect(out).toContain(", doravante denominada COMPRADORA;");
  });

  it("qualificacaoRepresentantes ignora linhas sem nome", () => {
    expect(qualificacaoRepresentantes([{ name: "", cpf: "" }])).toBe("");
  });
});

describe("e-mails do contrato", () => {
  it("usa o e-mail do gestor quando o cliente não tem e-mail (caso 4.1.1 'enviada para —')", () => {
    const map = build(baseInputs({ buyer_manager_email: "mario@arteconstrutora.com" }), { email: null, contato_email: null });
    expect(map.compradora_email).toBe("mario@arteconstrutora.com");
    expect(map.nf_email).toBe("mario@arteconstrutora.com");
    expect(resolvePlaceholders("enviada para {{compradora_email}}.", map)).toBe("enviada para mario@arteconstrutora.com.");
  });

  it("prefere o e-mail do cadastro do cliente para a qualificação", () => {
    const map = build(baseInputs({ buyer_manager_email: "gestor@x.com" }), { email: "cliente@x.com" });
    expect(map.compradora_email).toBe("cliente@x.com");
    expect(map.nf_email).toBe("gestor@x.com");
  });

  it("sem nenhum e-mail continua mostrando '—'", () => {
    const map = build(baseInputs(), { email: null, contato_email: null });
    expect(resolvePlaceholders("e-mail {{compradora_email}}", map)).toBe("e-mail —");
  });
});

describe("formatação de dados", () => {
  it("formata CNPJ da vendedora e da compradora", () => {
    const map = build(baseInputs());
    expect(map.vendedora_cnpj).toBe("17.007.780/0001-02");
    expect(map.compradora_cnpj_cpf).toBe("18.555.835/0001-73");
  });

  it("inscrição estadual da vendedora vem do cadastro da empresa", () => {
    expect(build(baseInputs()).vendedora_ie).toBe("10.550.407-6");
  });

  it("data do contrato usa a data informada (não a de hoje) e o fuso de Brasília", () => {
    const map = build(baseInputs({ contract_date: "2026-10-06T02:30:00.000Z" }));
    // 02:30 UTC ainda é 05/10 em Brasília
    expect(map.data_contrato).toMatch(/05 de outubro de 2026/);
  });
});

describe("formatDateOnlyBR", () => {
  it("não recua um dia em datas sem horário", () => {
    expect(formatDateOnlyBR("2026-11-20")).toBe("20/11/2026");
  });
  it("trata vazio", () => {
    expect(formatDateOnlyBR(null)).toBe("—");
    expect(formatDateOnlyBR("")).toBe("—");
  });
});
