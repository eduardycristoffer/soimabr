import { describe, it, expect } from "vitest";
import {
  FIELD_CATALOG, FIELD_GROUPS, FIELD_KEYS, extractFieldKeys, fieldFullLabel, fieldLabel, fieldToken, insertAtCursor,
  isKnownField, unknownFieldKeys,
} from "./contractFields";
import { buildSampleMap } from "./contractSample";
import { CONTRACT_TYPE_LABEL, clauseKeyLabel, friendlyBody, shortSample, toggleListPrefix, wrapSelection } from "@/lib/contractFields";
import { HTML_CLOSE, HTML_OPEN } from "@/lib/contractPlaceholders";

const sample = buildSampleMap(new Date("2026-11-17T15:00:00Z"));

describe("catálogo de campos", () => {
  it("cobre TODO campo que o gerador de contratos preenche (se alguém criar um campo novo, este teste avisa)", () => {
    const missing = Object.keys(sample).filter((k) => !isKnownField(k));
    expect(missing).toEqual([]);
  });

  it("não guarda campo que o gerador nem preenche mais", () => {
    const stale = FIELD_KEYS.filter((k) => !(k in sample));
    expect(stale).toEqual([]);
  });

  it("todo campo tem nome legível e grupo que existe", () => {
    const groups = new Set(FIELD_GROUPS.map((g) => g.id));
    for (const k of FIELD_KEYS) {
      expect(FIELD_CATALOG[k].label.trim().length, k).toBeGreaterThan(2);
      expect(groups.has(FIELD_CATALOG[k].group), k).toBe(true);
      expect(FIELD_CATALOG[k].label, k).not.toMatch(/_/); // nada de nome técnico na tela
    }
  });

  it("nomes e dica completa", () => {
    expect(fieldLabel("vendedora_cnpj")).toBe("CNPJ");
    expect(fieldFullLabel("compradora_cnpj_cpf")).toBe("Cliente · CNPJ ou CPF");
    expect(fieldLabel("campo_que_nao_existe")).toBe("campo_que_nao_existe");
    expect(fieldFullLabel("campo_que_nao_existe")).toBe("campo_que_nao_existe");
  });
});

describe("campos dentro do texto", () => {
  const body = "A {{ vendedora_razao_social }}, CNPJ {{vendedora_cnpj}}, e {{vendedora_cnpj}} de novo; {{locadora_razao_social}}.";

  it("acha os campos, sem repetir, aceitando espaços dentro das chaves", () => {
    expect(extractFieldKeys(body)).toEqual(["vendedora_razao_social", "vendedora_cnpj", "locadora_razao_social"]);
  });

  it("separa os que o sistema NÃO preenche", () => {
    expect(unknownFieldKeys(body)).toEqual(["locadora_razao_social"]);
  });

  it("maiúscula errada conta como desconhecido (o gerador diferencia)", () => {
    expect(unknownFieldKeys("{{Vendedora_CNPJ}}")).toEqual(["Vendedora_CNPJ"]);
  });

  it("texto sem campos", () => {
    expect(extractFieldKeys("nada aqui")).toEqual([]);
    expect(extractFieldKeys("")).toEqual([]);
  });

  it("o trecho real da cláusula de qualificação (venda) só usa campos conhecidos", () => {
    const real =
      "{{vendedora_razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{vendedora_cnpj}} e Inscrição Estadual nº {{vendedora_ie}}, com sede em {{vendedora_endereco}}, e-mail {{vendedora_email}}, neste ato representada por {{vendedora_representante_nome}}, portador(a) do CPF nº {{vendedora_representante_cpf}} e RG nº {{vendedora_representante_rg}}, cargo {{vendedora_representante_cargo}}\n" +
      "E, de outro lado, {{compradora_razao_social}}, inscrita no CNPJ/CPF sob o nº {{compradora_cnpj_cpf}}, com sede/domicílio em {{compradora_endereco}}, {{compradora_cidade}} - {{compradora_estado}}, CEP {{compradora_cep}}, e-mail {{compradora_email}}";
    expect(unknownFieldKeys(real)).toEqual([]);
    expect(extractFieldKeys(real).length).toBe(16);
  });
});

describe("inserir campo na posição do cursor", () => {
  it("no meio, no fim, no começo", () => {
    expect(insertAtCursor("abcd", 2, 2, "{{x}}")).toEqual({ text: "ab{{x}}cd", cursor: 7 });
    expect(insertAtCursor("abcd", 4, 4, "Z")).toEqual({ text: "abcdZ", cursor: 5 });
    expect(insertAtCursor("abcd", 0, 0, "Z")).toEqual({ text: "Zabcd", cursor: 1 });
  });
  it("troca o trecho selecionado", () => {
    expect(insertAtCursor("Olá FULANO tudo", 4, 10, fieldToken("compradora_razao_social"))).toEqual({
      text: "Olá {{compradora_razao_social}} tudo",
      cursor: 4 + "{{compradora_razao_social}}".length,
    });
  });
  it("posições fora do texto não quebram", () => {
    expect(insertAtCursor("ab", -5, 99, "X").text).toBe("X");
    expect(insertAtCursor("", 0, 0, "X")).toEqual({ text: "X", cursor: 1 });
  });
});

describe("dados de exemplo da visualização", () => {
  it("passam pelo gerador real: formatos de contrato", () => {
    expect(sample.vendedora_cnpj).toBe("11.222.333/0001-81");
    expect(sample.valor_total_numerico).toMatch(/570\.120,00/);
    expect(sample.valor_total_extenso.toLowerCase()).toContain("quinhentos e setenta mil");
    expect(sample.data_contrato).toMatch(/2026/);
    expect(sample.itens_inclusos_tabela).toContain("%%HTML%%");
    expect(sample.condicoes_pagamento_tabela).toContain("Entrada");
  });

  it("são claramente fictícios e quase tudo vem preenchido", () => {
    expect(sample.vendedora_razao_social).toContain("Exemplo");
    expect(sample.compradora_razao_social).toContain("Modelo");
    const empty = Object.entries(sample).filter(([, v]) => v === "" || v == null).map(([k]) => k);
    expect(empty).toEqual([]);
  });
});


describe("rótulos e edição de texto", () => {
  it("tipos de contrato em português", () => {
    expect(CONTRACT_TYPE_LABEL).toEqual({ venda: "Venda", locacao: "Locação", servico: "Serviço" });
  });

  it("chaves conhecidas usam o mesmo texto da caixa de seleção ao gerar; as outras mostram a chave", () => {
    expect(clauseKeyLabel("operador")).toBe("Cláusulas de operador (faturamento e condições)");
    expect(clauseKeyLabel("prestadora_servico")).toBe("Cláusula de prestação de serviço acessória");
    expect(clauseKeyLabel("xyz")).toBe("Opcional (xyz)");
  });

  it("valor de exemplo em uma linha: vazio, tabela, texto longo e quebras de linha", () => {
    expect(shortSample(undefined)).toBe("—");
    expect(shortSample("")).toBe("—");
    expect(shortSample(`${HTML_OPEN}<table></table>${HTML_CLOSE}`)).toBe("(tabela)");
    expect(shortSample("linha 1\n  linha 2")).toBe("linha 1 linha 2");
    const long = "a".repeat(100);
    expect(shortSample(long, 10)).toBe("aaaaaaaaa…");
    expect(shortSample(long, 10).length).toBe(10);
  });

  it("negrito: envolve a seleção; sem seleção deixa o cursor no meio", () => {
    expect(wrapSelection("um dois três", 3, 7, "**")).toEqual({ text: "um **dois** três", selStart: 5, selEnd: 9 });
    expect(wrapSelection("abc", 1, 1, "**")).toEqual({ text: "a****bc", selStart: 3, selEnd: 3 });
    expect(wrapSelection("abc", -5, 99, "_")).toEqual({ text: "_abc_", selStart: 1, selEnd: 4 });
  });

  it("lista: coloca '- ' nas linhas tocadas e tira quando todas já são lista", () => {
    const t = "intro\nA\nB\nfim";
    const on = toggleListPrefix(t, 6, 9); // seleção cobre "A\nB"
    expect(on.text).toBe("intro\n- A\n- B\nfim");
    const off = toggleListPrefix(on.text, on.selStart, on.selEnd);
    expect(off.text).toBe(t);
  });

  it("lista: linha em branco no meio da seleção continua em branco", () => {
    expect(toggleListPrefix("A\n\nB", 0, 4).text).toBe("- A\n\n- B");
  });

  it("lista: sem seleção atua só na linha do cursor", () => {
    expect(toggleListPrefix("um\ndois\ntrês", 5, 5).text).toBe("um\n- dois\ntrês");
  });
});

describe("resumo da cláusula", () => {
  it("troca {{campo}} pelo nome do campo, tira marcas de lista e junta as linhas", () => {
    expect(friendlyBody("{{vendedora_razao_social}}, CNPJ {{vendedora_cnpj}}.\n- item um\n- item dois")).toBe(
      "[Razão social], CNPJ [CNPJ]. item um item dois",
    );
  });
  it("tira as marcas de negrito e itálico do resumo (sem mexer em nomes com sublinhado)", () => {
    expect(friendlyBody("**VENDEDORA:** {{vendedora_cnpj}} e _suave_, ver foo_bar_baz")).toBe("VENDEDORA: [CNPJ] e suave, ver foo_bar_baz");
  });
  it("campo desconhecido aparece com o próprio nome; texto longo é cortado", () => {
    expect(friendlyBody("{{xpto}}")).toBe("[xpto]");
    const r = friendlyBody("a ".repeat(200), 20);
    expect(r.length).toBe(20);
    expect(r.endsWith("…")).toBe(true);
  });
  it("vazio", () => {
    expect(friendlyBody("")).toBe("");
  });
});
