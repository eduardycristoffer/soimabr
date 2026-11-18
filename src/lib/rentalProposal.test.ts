import { describe, it, expect } from "vitest";
import {
  LINE_CATALOG, cleanRentalData, customLine, defaultLines, defaultRentalData, effectiveQty, groupTotal, isShown, legacyColumns,
  lineValue, linesFromLegacy, linesWithoutValue, normalizeLines, normalizeRentalData, rentalProblems, rentalTotals, shownLines, toQuoteItemRows, withLinePrice,
  type RentalLine,
} from "./rentalProposal";

const price = (lines: RentalLine[], key: string, unit_price: number, extra: Partial<RentalLine> = {}) => {
  const l = lines.find((x) => x.key === key)!;
  Object.assign(l, { unit_price, ...extra });
  return lines;
};
const base = () => {
  const lines = defaultLines();
  price(lines, "rent", 22666);
  price(lines, "assembly", 17000);
  price(lines, "disassembly", 27000);
  price(lines, "mobilization", 54600);
  price(lines, "demobilization", 54600);
  return lines;
};

describe("quadro de preços: o que aparece", () => {
  it("o modelo tem as linhas separadas: operador, seguro, manutenção e assistência técnica são custos próprios", () => {
    const keys = LINE_CATALOG.map((c) => c.key);
    for (const k of ["rent", "insurance", "operator", "maintenance_monthly", "technical_assistance", "mobilization", "demobilization", "assembly", "disassembly", "corrective_weekday"]) {
      expect(keys).toContain(k);
    }
    expect(LINE_CATALOG.some((c) => /inclus/i.test(c.description))).toBe(false); // nada de "incluso" escondido
  });

  it("começa sem nenhum preço: nada aparece até alguém informar valor", () => {
    expect(defaultLines().every((l) => !isShown(l))).toBe(true);
    expect(shownLines(defaultLines(), "ebl")).toEqual([]);
  });

  it("linha sem valor não aparece, mesmo marcada", () => {
    const lines = base();
    expect(shownLines(lines, "cmo").map((l) => l.key)).toEqual(["assembly", "disassembly", "mobilization", "demobilization"]);
  });

  it("desmarcar a mobilização tira a linha, mesmo com valor", () => {
    const lines = base();
    price(lines, "mobilization", 54600, { enabled: false });
    expect(shownLines(lines, "cmo").map((l) => l.key)).not.toContain("mobilization");
  });

  it("linha ligada e ainda sem valor é avisada (para a pessoa saber que não vai aparecer)", () => {
    const lines = defaultLines();
    price(lines, "rent", 1000);
    expect(linesWithoutValue(lines).map((l) => l.key)).toEqual(["assembly", "disassembly", "mobilization", "demobilization"]);
    price(lines, "operator", 0, { enabled: false });
    expect(linesWithoutValue(lines).some((l) => l.key === "operator")).toBe(false); // desmarcada: nada a avisar
  });

  it("dá para acrescentar linha livre em qualquer bloco, e ela aparece com valor", () => {
    const lines = [...base(), customLine("cmo", { description: "Treinamento de sinaleiro", unit: "Un", quantity: 3, unit_price: 500 })];
    const shown = shownLines(lines, "cmo");
    expect(shown[shown.length - 1].description).toBe("Treinamento de sinaleiro");
    expect(lineValue(shown[shown.length - 1], 8)).toBe(1500);
  });
});

describe("quadro de preços: contas", () => {
  it("quantidade das linhas mensais acompanha o prazo; as outras usam a quantidade própria", () => {
    const lines = base();
    const rent = lines.find((l) => l.key === "rent")!;
    expect(effectiveQty(rent, 8)).toBe(8);
    expect(effectiveQty(lines.find((l) => l.key === "assembly")!, 8)).toBe(1);
    expect(effectiveQty({ quantity: 21, follows_months: false }, 8)).toBe(21);
    expect(effectiveQty({ quantity: 5, follows_months: true }, 0)).toBe(0);
  });

  it("reproduz o quadro do modelo: 8 meses de locação, montagem, desmontagem e mobilização/desmobilização", () => {
    const lines = base();
    price(lines, "bucket", 780, { enabled: true });
    price(lines, "insurance", 143, { enabled: true });
    price(lines, "telescoping", 450, { enabled: true, quantity: 21 });
    price(lines, "operator", 11250, { enabled: true });
    price(lines, "maintenance_monthly", 2530, { enabled: true });
    expect(groupTotal(lines, "ebl", 8)).toBe(181328 + 6240 + 1144); // 188.712
    expect(groupTotal(lines, "cmo", 8)).toBe(17000 + 27000 + 9450 + 54600 + 54600 + 90000 + 20240); // 272.890
    const t = rentalTotals(lines, 8);
    expect(t.ebl).toBe(188712);
    expect(t.subtotal).toBe(188712 + 272890);
  });

  it("linha de tarifa por hora (quantidade 0) mostra o valor unitário mas soma zero", () => {
    const lines = base();
    price(lines, "corrective_sat", 270, { enabled: true });
    expect(isShown(lines.find((l) => l.key === "corrective_sat")!)).toBe(true);
    expect(groupTotal(lines, "cmo", 8)).toBe(17000 + 27000 + 54600 + 54600);
  });

  it("as tabelas de manutenção fora do horário não entram no total do equipamento", () => {
    const lines = base();
    price(lines, "night17_weekday", 270, { enabled: true, quantity: 10 });
    expect(rentalTotals(lines, 8).subtotal).toBe(rentalTotals(base(), 8).subtotal);
  });

  it("desconto e imposto incidem sobre o total dos dois blocos", () => {
    const t = rentalTotals(base(), 8, 10, 5);
    const sub = 22666 * 8 + 17000 + 27000 + 54600 + 54600;
    expect(t.subtotal).toBe(sub);
    expect(t.discount).toBe(Math.round(sub * 10) / 100);
    expect(t.afterDiscount).toBe(Math.round((sub - t.discount) * 100) / 100);
    expect(t.tax).toBeCloseTo(t.afterDiscount * 0.05, 2);
    expect(t.total).toBeCloseTo(t.afterDiscount + t.tax, 2);
  });

  it("sem prazo, as linhas mensais valem zero", () => {
    expect(rentalTotals(base(), 0).ebl).toBe(0);
  });
});

describe("colunas antigas (contrato, frota e relatórios continuam lendo)", () => {
  it("preenche valor mensal, mobilização, desmobilização, montagem e desmontagem", () => {
    const c = legacyColumns(base(), 8);
    expect(c).toMatchObject({ rental_monthly_value: 22666, rental_mobilization: 54600, rental_demobilization: 54600, rental_assembly: 17000, rental_disassembly: 27000, rental_freight: 0 });
  });
  it("sem valor mensal: null (nunca zero escondido)", () => {
    expect(legacyColumns(defaultLines(), 8).rental_monthly_value).toBeNull();
  });
  it("operador, seguro, manutenção e assistência viram 'sim' só quando a linha aparece (com valor)", () => {
    const lines = base();
    expect(legacyColumns(lines, 8)).toMatchObject({ rental_operator_included: false, rental_insurance_included: false, rental_maintenance_included: false, rental_technical_assistance: false });
    price(lines, "operator", 11250, { enabled: true });
    price(lines, "insurance", 143, { enabled: false });
    expect(legacyColumns(lines, 8)).toMatchObject({ rental_operator_included: true, rental_insurance_included: false });
  });
  it("linha de mobilização desmarcada zera a coluna", () => {
    const lines = base();
    lines.find((l) => l.key === "mobilization")!.enabled = false;
    expect(legacyColumns(lines, 8).rental_mobilization).toBe(0);
  });
});

describe("linhas do banco", () => {
  it("só as linhas que aparecem viram itens, na ordem dos blocos, com unidade e total; a grua fica no índice 0", () => {
    const rows = toQuoteItemRows("q1", base(), 8);
    expect(rows.map((r) => [r.product_name.split(" ")[0], r.quantity, r.unit, r.unit_price, r.total_price, r.order_index])).toEqual([
      ["Locação", 8, "Mês", 22666, 181328, 1],
      ["Montagem", 1, "Vb", 17000, 17000, 2],
      ["Desmontagem", 1, "Vb", 27000, 27000, 3],
      ["Custo", 1, "Vb", 54600, 54600, 4],
      ["Custo", 1, "Vb", 54600, 54600, 5],
    ]);
    expect(rows[0]).toMatchObject({ quote_id: "q1", product_id: null, product_category: "servico", is_optional: false });
    expect(rows[1].product_category).toBe("montagem");
    expect(rows[3].product_category).toBe("transporte");
  });
  it("a soma dos itens bate com o subtotal da proposta", () => {
    const lines = base();
    price(lines, "operator", 11250, { enabled: true });
    const sum = toQuoteItemRows("q", lines, 8).reduce((s, r) => s + r.total_price, 0);
    expect(sum).toBe(rentalTotals(lines, 8).subtotal);
  });
  it("categorias: operador e manutenção usam as próprias", () => {
    const lines = base();
    price(lines, "operator", 11250, { enabled: true });
    price(lines, "maintenance_monthly", 2530, { enabled: true });
    const cats = toQuoteItemRows("q", lines, 8).map((r) => r.product_category);
    expect(cats).toContain("operador");
    expect(cats).toContain("manutencao");
  });
  it("quantidade quebrada é arredondada (a coluna é inteira) e a validação avisa", () => {
    const lines = base();
    price(lines, "telescoping", 450, { enabled: true, quantity: 2.5 });
    expect(toQuoteItemRows("q", lines, 8).find((r) => r.product_name.startsWith("Telescopagem"))!.quantity).toBe(3);
    const data = defaultRentalData();
    data.lines = lines;
    expect(rentalProblems({ client_id: "c", months: 8, lines, data, validity_days: 30 })).toContain('"Telescopagem por evento (estimado)": a quantidade precisa ser um número inteiro.');
  });
});

describe("ler e limpar o que está gravado", () => {
  it("dados vazios ou de outro tipo viram os padrões", () => {
    expect(normalizeRentalData(null).kind).toBe("locacao");
    expect(normalizeRentalData({ kind: "servico", subject: "x" }).subject).toBe("Locação de grua e serviços decorrentes");
  });
  it("reabrir uma proposta mantém preços, linhas livres e o que foi desmarcado", () => {
    const d = defaultRentalData();
    d.lines = [...base(), customLine("ebl", { description: "Placa extra", unit_price: 99 })];
    d.lines.find((l) => l.key === "mobilization")!.enabled = false;
    d.observations = ["só esta"];
    const back = normalizeRentalData(JSON.parse(JSON.stringify(d)));
    expect(back.lines.find((l) => l.key === "rent")!.unit_price).toBe(22666);
    expect(back.lines.find((l) => l.key === "mobilization")!.enabled).toBe(false);
    expect(back.lines.some((l) => l.description === "Placa extra" && l.key === null)).toBe(true);
    expect(back.observations).toEqual(["só esta"]);
  });
  it("lista esvaziada de propósito continua vazia; campo ausente volta ao padrão", () => {
    const back = normalizeRentalData({ kind: "locacao", insurance: [] });
    expect(back.insurance).toEqual([]);
    expect(back.safety_devices.length).toBeGreaterThan(0);
  });
  it("proposta antiga ganha linhas novas do modelo sem perder as dela", () => {
    const old = [{ key: "rent", group: "ebl", description: "Aluguel", unit: "Mês", unit_price: 5000, enabled: true, follows_months: true, quantity: 0 }];
    const lines = normalizeLines(old);
    expect(lines.find((l) => l.key === "rent")!.description).toBe("Aluguel");
    expect(lines.length).toBe(LINE_CATALOG.length);
  });
  it("linha com dado estranho não quebra", () => {
    const lines = normalizeLines([{ key: "xyz", group: "??", description: 5, unit_price: "abc" }, null, "x"]);
    expect(lines.find((l) => l.key === null)).toMatchObject({ group: "cmo", unit_price: 0, description: "" });
  });
  it("limpar tira tópicos em branco e linhas livres vazias", () => {
    const d = defaultRentalData();
    d.insurance = ["a", "  ", ""];
    d.lines = [...d.lines, customLine("cmo", { description: "" })];
    const c = cleanRentalData(d);
    expect(c.insurance).toEqual(["a"]);
    expect(c.lines.length).toBe(LINE_CATALOG.length);
  });
  it("os textos-padrão são genéricos: não citam nenhuma empresa do modelo", () => {
    const all = JSON.stringify(defaultRentalData());
    expect(all).not.toMatch(/locabens|potain|CMO SERVI|EMPRESA BRASILEIRA|AB INCORPORADORA/i);
    expect(all).toMatch(/LOCADORA/);
    expect(all).toMatch(/CONTRATANTE/);
  });
});

describe("validação para finalizar", () => {
  const ok = () => {
    const lines = base();
    return { client_id: "c1", months: 8, lines, data: { ...defaultRentalData(), lines }, validity_days: 30 };
  };
  it("proposta completa não tem problema", () => {
    expect(rentalProblems(ok())).toEqual([]);
  });
  it("cliente, prazo e valor mensal são obrigatórios", () => {
    const i = ok();
    expect(rentalProblems({ ...i, client_id: "", months: 0, lines: defaultLines() })).toEqual([
      "Escolha o cliente.", "Informe o prazo da locação, em meses.", "Informe o valor da locação mensal do equipamento.",
    ]);
  });
  it("assunto e validade", () => {
    const i = ok();
    expect(rentalProblems({ ...i, data: { ...i.data, subject: " " }, validity_days: 0 })).toEqual(["Informe o assunto da proposta.", "Informe a validade da proposta em dias."]);
  });
  it("linha com valor e sem descrição é recusada", () => {
    const i = ok();
    i.lines.push(customLine("cmo", { description: "", unit_price: 10 }));
    expect(rentalProblems(i)).toContain("Há uma linha com valor, mas sem descrição.");
  });
});

describe("preço vindo do cadastro da grua", () => {
  it("liga a linha e define o valor; valor vazio ou zero não mexe em nada", () => {
    const lines = defaultLines();
    const out = withLinePrice(lines, "rent", 22666.456);
    expect(out.find((l) => l.key === "rent")).toMatchObject({ unit_price: 22666.46, enabled: true });
    expect(withLinePrice(lines, "rent", 0)).toBe(lines);
    expect(withLinePrice(lines, "rent", null)).toBe(lines);
    expect(withLinePrice(lines, "rent", undefined)).toBe(lines);
  });

  it("não altera a lista original", () => {
    const lines = defaultLines();
    withLinePrice(lines, "rent", 100);
    expect(lines.find((l) => l.key === "rent")!.unit_price).toBe(0);
  });
});

describe("proposta de locação antiga (só colunas rental_*)", () => {
  it("vira linhas do quadro com os mesmos valores", () => {
    const lines = linesFromLegacy({
      rental_monthly_value: 22666, rental_mobilization: 54600, rental_demobilization: 54600, rental_freight: 8000,
      rental_assembly: 17000, rental_disassembly: 27000,
    });
    expect(lines.find((l) => l.key === "rent")!.unit_price).toBe(22666);
    expect(lines.find((l) => l.key === "freight")).toMatchObject({ unit_price: 8000, enabled: true });
    expect(shownLines(lines, "cmo").map((l) => l.key)).toEqual(["assembly", "disassembly", "mobilization", "demobilization", "freight"]);
    // o total fecha com o que o assistente antigo calculava: mensal × meses + custos adicionais
    expect(rentalTotals(lines, 8).subtotal).toBe(22666 * 8 + 54600 * 2 + 8000 + 17000 + 27000);
  });

  it("'incluso' sem valor vira linha ligada e SEM valor (aparece o aviso, não aparece na proposta)", () => {
    const lines = linesFromLegacy({
      rental_monthly_value: 1000, rental_operator_included: true, rental_maintenance_included: true,
      rental_insurance_included: true, rental_technical_assistance: true,
    });
    const keys = ["operator", "maintenance_monthly", "insurance", "technical_assistance"];
    for (const k of keys) expect(lines.find((l) => l.key === k)).toMatchObject({ enabled: true, unit_price: 0 });
    expect(linesWithoutValue(lines).map((l) => l.key)).toEqual(expect.arrayContaining(keys));
    expect(shownLines(lines, "cmo").some((l) => keys.includes(String(l.key)))).toBe(false);
  });

  it("proposta sem nenhum dado antigo começa limpa", () => {
    expect(linesFromLegacy({}).every((l) => !isShown(l))).toBe(true);
  });
});
