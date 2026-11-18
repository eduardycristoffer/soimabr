import { describe, it, expect } from "vitest";
import {
  cityFromAddress, cleanServiceData, defaultServiceData, emptyItem, itemKind, itemLineValue, itemNumber,
  itemsFromRows, itemTotal, normalizeServiceData, serviceProblems, serviceTotals, toQuoteItemRows,
  SERVICE_ITEM_PRESETS, DEFAULT_COMPANY_SLUG, buildServiceQuotePayload, type ServiceItem,
} from "./serviceProposal";

const item = (p: Partial<ServiceItem>): ServiceItem =>
  emptyItem({ description: "Serviço", unit_price: 100, quantity: 1, ...p });

describe("tipos de linha e totais (modelo TECSU)", () => {
  it("quantidade definida soma ao total; opcional e 'sob medição' não", () => {
    const items = [
      item({ quantity: 1, unit_price: 2800 }),            // plano de cargas
      item({ quantity: 1, unit_price: 23000 }),           // montagem
      item({ quantity: null, unit_price: 5500 }),         // telescopagem (sob medição)
      item({ quantity: 1, unit_price: 2500, is_optional: true }), // treinamento (opcional)
    ];
    expect(items.map(itemKind)).toEqual(["fixed", "fixed", "measured", "optional"]);
    expect(serviceTotals(items)).toEqual({ fixedTotal: 25800, fixedCount: 2, measuredCount: 1, optionalCount: 1 });
  });

  it("reproduz o total do modelo TECSU (2.800 + 23.000 + 30.000)", () => {
    const items = [
      item({ quantity: 1, unit_price: 2800 }),
      item({ quantity: 1, unit_price: 23000 }),
      item({ quantity: 1, unit_price: 30000 }),
    ];
    expect(serviceTotals(items).fixedTotal).toBe(55800);
  });

  it("opcional com quantidade mostra o valor da linha, mas não soma", () => {
    const o = item({ quantity: 2, unit_price: 2500, is_optional: true });
    expect(itemLineValue(o)).toBe(5000);
    expect(itemTotal(o)).toBe(0);
  });

  it("arredonda centavos sem erro de ponto flutuante", () => {
    expect(itemLineValue(item({ quantity: 3, unit_price: 0.1 }))).toBe(0.3);
    expect(serviceTotals([item({ quantity: 3, unit_price: 33.33 })]).fixedTotal).toBe(99.99);
  });

  it("quantidade 0 ou vazia é 'sob medição'", () => {
    expect(itemKind(item({ quantity: 0 }))).toBe("measured");
    expect(itemKind(item({ quantity: null }))).toBe("measured");
  });

  it("numera as linhas a partir de 2.1", () => {
    expect([0, 1, 9].map(itemNumber)).toEqual(["2.1", "2.2", "2.10"]);
  });
});

describe("linhas do banco (quote_items)", () => {
  const items = [
    item({ description: " Montagem ", quantity: 1, unit_price: 23000, note: " " }),
    item({ description: "Hora técnica", unit: "Hs", quantity: null, unit_price: 120, note: "Dias úteis" }),
    item({ description: "Treinamento", unit: "Único", quantity: 1, unit_price: 2500, is_optional: true }),
  ];
  const rows = toQuoteItemRows("q1", items);

  it("grava categoria serviço, ordem e códigos", () => {
    expect(rows.map((r) => r.product_category)).toEqual(["servico", "servico", "servico"]);
    expect(rows.map((r) => r.order_index)).toEqual([0, 1, 2]);
    expect(rows.map((r) => r.product_code)).toEqual(["SRV-01", "SRV-02", "SRV-03"]);
    expect(rows[0].product_id).toBeNull();
  });

  it("total_price guarda só o que soma ao total da proposta", () => {
    expect(rows.map((r) => r.total_price)).toEqual([23000, 0, 0]);
    expect(rows.reduce((s, r) => s + r.total_price, 0)).toBe(serviceTotals(items).fixedTotal);
  });

  it("'sob medição' vira quantidade 0; observação vazia vira null; descrição sem espaços nas pontas", () => {
    expect(rows[1].quantity).toBe(0);
    expect(rows[0].notes).toBeNull();
    expect(rows[0].product_name).toBe("Montagem");
    expect(rows[1].notes).toBe("Dias úteis");
  });

  it("guarda unidade e opcional", () => {
    expect(rows.map((r) => r.unit)).toEqual(["Vb", "Hs", "Único"]);
    expect(rows.map((r) => r.is_optional)).toEqual([false, false, true]);
  });

  it("ida e volta: o que foi salvo volta igual para a tela", () => {
    const back = itemsFromRows(rows.map((r) => ({ ...r })));
    expect(back.map((b) => [b.description, b.unit, b.quantity, b.unit_price, b.is_optional, b.note])).toEqual([
      ["Montagem", "Vb", 1, 23000, false, ""],
      ["Hora técnica", "Hs", null, 120, false, "Dias úteis"],
      ["Treinamento", "Único", 1, 2500, true, ""],
    ]);
  });

  it("lê linhas fora de ordem e sem as colunas novas (banco antigo)", () => {
    const back = itemsFromRows([
      { product_name: "B", order_index: 1, quantity: 2, unit_price: 10 },
      { product_name: "A", order_index: 0, quantity: 1, unit_price: 5 },
    ]);
    expect(back.map((b) => b.description)).toEqual(["A", "B"]);
    expect(back[0].unit).toBe("Vb");
    expect(back[0].is_optional).toBe(false);
  });
});

describe("dados da proposta (service_data)", () => {
  it("padrão: emitente Dacrom, textos do modelo e seções completas", () => {
    const d = defaultServiceData();
    expect(d.company_slug).toBe(DEFAULT_COMPANY_SLUG);
    expect(d.final_sections.map((s) => s.title)).toEqual([
      "Manutenções", "Montagens e Desmontagens", "Confidencialidade", "Reajuste", "Retenções",
    ]);
    expect(d.equipment.map((e) => e.label)).toContain("Capacidade de carga");
    expect(d.client_responsibilities.length).toBeGreaterThan(10);
    expect(d.company_responsibilities.length).toBe(4);
  });

  it("usa dados da empresa emitente (cidade e assinante)", () => {
    const d = defaultServiceData({
      slug: "dacrom",
      address: "Avenida Maranhão, S/N, Quadra 61, Lote 15, Jundiaí, Anápolis-GO, CEP 75110-470",
      representante_nome: "Ana Cristina Mendes Da Costa Morais",
      representante_cargo: "Diretora",
    });
    expect(d.issue_city).toBe("Anápolis/GO");
    expect(d.signer_name).toBe("Ana Cristina Mendes Da Costa Morais");
    expect(d.signer_role).toBe("Diretora");
  });

  it("cityFromAddress tolera endereços sem padrão", () => {
    expect(cityFromAddress(null)).toBe("");
    expect(cityFromAddress("Rua sem cidade")).toBe("");
    expect(cityFromAddress("Rua X, 10, Belo Horizonte - MG, CEP 30000-000")).toBe("Belo Horizonte/MG");
  });

  it("normaliza: campo ausente → padrão; lista esvaziada de propósito continua vazia", () => {
    const d = normalizeServiceData({ subject: "Meu assunto", inclusions: [], client_responsibilities: ["Só esta"] });
    expect(d.subject).toBe("Meu assunto");
    expect(d.inclusions).toEqual([]);
    expect(d.client_responsibilities).toEqual(["Só esta"]);
    expect(d.company_responsibilities.length).toBe(4);
    expect(d.intro).toContain("contatos verbais");
  });

  it("normaliza: lixo (null, texto, tipos errados) não quebra", () => {
    expect(normalizeServiceData(null).version).toBe(1);
    expect(normalizeServiceData("texto").subject).toContain("montagem");
    const d = normalizeServiceData({ inclusions: [1, "ok", null], equipment: [null, { label: 5, value: "x" }], final_sections: "x" });
    expect(d.inclusions).toEqual(["ok"]);
    expect(d.equipment).toEqual([{ label: "", value: "x" }]);
    expect(d.final_sections.length).toBe(5);
  });

  it("limpar remove linhas em branco antes de gravar", () => {
    const d = defaultServiceData();
    d.inclusions = ["  uma  ", "", "   "];
    d.final_sections.push({ title: " ", text: "" });
    const c = cleanServiceData(d);
    expect(c.inclusions).toEqual(["uma"]);
    expect(c.final_sections.length).toBe(5);
    expect(c.equipment.every((e) => e.label)).toBe(true);
  });

  it("os atalhos de serviços não trazem preço (quem define é o comercial)", () => {
    expect(SERVICE_ITEM_PRESETS.length).toBeGreaterThanOrEqual(10);
    for (const p of SERVICE_ITEM_PRESETS) expect((p as any).unit_price).toBeUndefined();
  });
});

describe("validação para finalizar", () => {
  const ok = { client_id: "c1", items: [item({})], data: defaultServiceData(), validity_days: 30 };

  it("proposta completa passa", () => expect(serviceProblems(ok)).toEqual([]));

  it("aponta cliente, itens, descrição e preço", () => {
    expect(serviceProblems({ ...ok, client_id: "" })).toContain("Escolha o cliente.");
    expect(serviceProblems({ ...ok, items: [] })).toContain("Adicione ao menos um item de preço.");
    const p = serviceProblems({ ...ok, items: [item({ description: " ", unit_price: 0 })] });
    expect(p).toContain("Item 2.1: falta a descrição.");
    expect(p).toContain("Item 2.1: informe o preço unitário.");
  });

  it("quantidade quebrada é recusada (a coluna do banco é inteira)", () => {
    const p = serviceProblems({ ...ok, items: [item({ quantity: 1.5 })] });
    expect(p.some((m) => m.includes("número inteiro"))).toBe(true);
  });

  it("exige assunto e validade", () => {
    const d = { ...defaultServiceData(), subject: " " };
    expect(serviceProblems({ ...ok, data: d })).toContain("Informe o assunto da proposta.");
    expect(serviceProblems({ ...ok, validity_days: 0 })).toContain("Informe a validade da proposta em dias.");
  });

  it("item opcional também precisa de preço (aparece na proposta)", () => {
    const p = serviceProblems({ ...ok, items: [item({ is_optional: true, unit_price: 0 })] });
    expect(p).toContain("Item 2.1: informe o preço unitário.");
  });
});

describe("colunas gravadas em quotes", () => {
  const base = {
    client_id: "c1", project_name: " Obra Corporate ", project_location: "", validity_days: 30, notes: "  ",
    show_unit_prices: true, service: defaultServiceData(),
    items: [item({ quantity: 1, unit_price: 2800 }), item({ quantity: 1, unit_price: 23000 }), item({ quantity: null, unit_price: 5500 })],
  };

  it("tipo serviço, em reais, total = itens com quantidade, sem desconto", () => {
    const p = buildServiceQuotePayload(base);
    expect(p.quote_type).toBe("servico");
    expect(p.currency).toBe("BRL");
    expect(p.subtotal).toBe(25800);
    expect(p.total).toBe(25800);
    expect([p.discount_percent, p.discount_value]).toEqual([0, 0]);
    expect(p.discount_approved).toBe(true);
  });

  it("limpa espaços e transforma vazio em null", () => {
    const p = buildServiceQuotePayload(base);
    expect(p.project_name).toBe("Obra Corporate");
    expect(p.project_location).toBeNull();
    expect(p.notes).toBeNull();
  });

  it("preços visíveis por padrão; esconder inverte a flag do banco", () => {
    expect(buildServiceQuotePayload(base).hide_unit_prices).toBe(false);
    expect(buildServiceQuotePayload({ ...base, show_unit_prices: false }).hide_unit_prices).toBe(true);
  });

  it("espelha o texto de pagamento em payment_terms (uma linha)", () => {
    const p = buildServiceQuotePayload(base);
    expect(p.payment_terms).not.toContain("\n");
    expect(p.payment_terms).toContain("10 (dez) dias");
  });

  it("grava os dados da proposta já limpos", () => {
    const service = defaultServiceData();
    service.inclusions = ["a", "  ", ""];
    expect(buildServiceQuotePayload({ ...base, service }).service_data.inclusions).toEqual(["a"]);
  });
});
