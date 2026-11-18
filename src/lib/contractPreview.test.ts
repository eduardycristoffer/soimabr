import { describe, it, expect } from "vitest";
import { buildPreviewBlocks, type Block, type Inline } from "./contractPreview";
import { buildSampleMap } from "./contractSample";

const map = {
  vendedora_razao_social: "Empresa Exemplo Ltda",
  vendedora_cnpj: "11.222.333/0001-81",
  vendedora_ie: "",
  itens_inclusos_tabela: '%%HTML%%<table class="scope-table"><tr><td>Grua</td></tr></table>%%/HTML%%',
  condicoes_pagamento_tabela: "1. **Entrada** — R$ 100,00 — na assinatura\n2. **Parcela** — R$ 50,00 — em 30 dias\n\n**Total:** R$ 150,00",
};

const flat = (inl: Inline[]): string =>
  inl.map((i) => (i.type === "text" ? i.text : i.type === "field" ? `[${i.value}]` : i.type === "strong" ? `<b>${flat(i.children)}</b>` : `<i>${flat(i.children)}</i>`)).join("");
const lines = (blocks: Block[]) =>
  blocks.map((b) => (b.kind === "blank" ? "" : b.kind === "html" ? `HTML(${b.key})` : `${b.kind}:${flat(b.children)}`));

describe("visualização do texto da cláusula (mesmas regras do PDF)", () => {
  it("parágrafos, listas e linhas em branco", () => {
    const b = buildPreviewBlocks("Primeiro.\n\nSegundo.\n- item um\n- item dois\nFim.", map);
    expect(lines(b)).toEqual(["p:Primeiro.", "", "p:Segundo.", "li:item um", "li:item dois", "p:Fim."]);
  });

  it("campo preenchido aparece marcado, com o valor", () => {
    const b = buildPreviewBlocks("CNPJ {{vendedora_cnpj}}.", map);
    expect(lines(b)).toEqual(["p:CNPJ [11.222.333/0001-81]."]);
    const field = (b[0] as any).children.find((i: Inline) => i.type === "field");
    expect(field).toMatchObject({ key: "vendedora_cnpj", known: true, empty: false });
  });

  it("campo que o sistema não preenche: sai '—' e fica marcado como desconhecido", () => {
    const b = buildPreviewBlocks("Locadora: {{locadora_razao_social}}.", map);
    expect(lines(b)).toEqual(["p:Locadora: [—]."]);
    const field = (b[0] as any).children.find((i: Inline) => i.type === "field");
    expect(field).toMatchObject({ known: false, empty: true });
  });

  it("campo conhecido mas vazio: '—' (como no contrato), sem ser desconhecido", () => {
    const b = buildPreviewBlocks("IE {{vendedora_ie}}", map);
    const field = (b[0] as any).children.find((i: Inline) => i.type === "field");
    expect(flat((b[0] as any).children)).toBe("IE [—]");
    expect(field).toMatchObject({ known: true, empty: true });
  });

  it("negrito e itálico", () => {
    expect(lines(buildPreviewBlocks("Texto **forte** e _leve_ ok.", map))).toEqual(["p:Texto <b>forte</b> e <i>leve</i> ok."]);
    expect(lines(buildPreviewBlocks("**{{vendedora_razao_social}}** assina", map))).toEqual(["p:<b>[Empresa Exemplo Ltda]</b> assina"]);
  });

  it("tabela automática vira bloco à parte, sem os marcadores internos", () => {
    const b = buildPreviewBlocks("Componentes:\n{{itens_inclusos_tabela}}\nDepois.", map);
    expect(lines(b)).toEqual(["p:Componentes:", "HTML(itens_inclusos_tabela)", "p:Depois."]);
    expect((b[1] as any).html).toBe('<table class="scope-table"><tr><td>Grua</td></tr></table>');
  });

  it("valor com várias linhas (condições de pagamento): negrito dentro do valor e sem marcador vazando", () => {
    const b = buildPreviewBlocks("Pagamento:\n{{condicoes_pagamento_tabela}}", map);
    expect(lines(b)).toEqual([
      "p:Pagamento:",
      "p:[1. ]<b>[Entrada]</b>[ — R$ 100,00 — na assinatura]",
      "p:[2. ]<b>[Parcela]</b>[ — R$ 50,00 — em 30 dias]",
      "",
      "p:<b>[Total:]</b>[ R$ 150,00]",
    ]);
    const all = JSON.stringify(b);
    expect(all).not.toMatch(/[\uE000-\uE004]/); // nenhum marcador interno sobra no resultado
  });

  it("não deixa linhas em branco sobrando no começo, no fim ou duplicadas", () => {
    expect(lines(buildPreviewBlocks("\n\nA\n\n\n\nB\n\n", map))).toEqual(["p:A", "", "p:B"]);
    expect(buildPreviewBlocks("", map)).toEqual([]);
  });

  it("texto digitado nunca vira HTML (só a tabela automática vem como HTML)", () => {
    const b = buildPreviewBlocks("<script>alert(1)</script> {{vendedora_razao_social}}", map);
    expect(b.every((x) => x.kind !== "html")).toBe(true);
    expect(flat((b[0] as any).children)).toContain("<script>alert(1)</script>");
  });

  it("com os dados de exemplo reais: qualificação da venda sai sem nenhum '—'", () => {
    const sample = buildSampleMap(new Date("2026-11-17T15:00:00Z"));
    const body = "{{vendedora_razao_social}}, inscrita no CNPJ sob o nº {{vendedora_cnpj}}, neste ato representada por {{vendedora_representante_nome}}, CPF {{vendedora_representante_cpf}}.";
    const txt = flat((buildPreviewBlocks(body, sample)[0] as any).children);
    expect(txt).not.toContain("[—]");
    expect(txt).toContain("[11.222.333/0001-81]");
    expect(txt).toContain("[111.444.777-35]");
  });
});
