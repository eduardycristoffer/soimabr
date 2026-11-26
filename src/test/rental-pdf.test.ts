import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import {
  customLine, defaultLines, defaultRentalData, legacyColumns, rentalTotals, toQuoteItemRows, type RentalLine,
} from "@/lib/rentalProposal";

/**
 * Executa o gerador REAL da proposta de locação detalhada (supabase/functions/generate-pdf/index.ts).
 * A função de borda roda no Deno e não pode ser importada; por isso o trecho do gerador é recortado do arquivo,
 * convertido de TypeScript e executado aqui (o trecho da proposta de serviço traz as funções de apoio).
 */
const source = readFileSync(join(process.cwd(), "supabase/functions/generate-pdf/index.ts"), "utf-8");
const marker = source.indexOf("// PROPOSTA DE SERVIÇO");
if (marker < 0) throw new Error("trecho das propostas em carta não encontrado em generate-pdf");
const js = ts.transpileModule(source.slice(marker), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
// eslint-disable-next-line no-new-func
const mod = new Function(`${js}; return { generateRentalProposalHTML, generateServiceHTML };`)() as {
  generateRentalProposalHTML: (q: any, items: any[], creator: any, company: any, opts: { forPdf: boolean }) => string;
  generateServiceHTML: (q: any, items: any[], creator: any, company: any, opts: { forPdf: boolean }) => string;
};

const company = {
  company_name: "Dacrom Brasil Serviços", razao_social: "Dacrom Brasil Serviços LTDA", cnpj: "27.964.905/0001-38",
  address: "Avenida Maranhão, S/N, Anápolis-GO", phone: "(62) 3772-0059", email: "contato@example.com",
  representante_nome: "Ana Morais", representante_cargo: "Diretora",
};

const set = (lines: RentalLine[], key: string, unit_price: number, extra: Partial<RentalLine> = {}) => {
  Object.assign(lines.find((l) => l.key === key)!, { unit_price, enabled: true, ...extra });
};

/** Quadro do modelo: locação, montagem/desmontagem, mobilização/desmobilização — e os custos separados. */
function priced(): RentalLine[] {
  const lines = defaultLines();
  set(lines, "rent", 22666);
  set(lines, "assembly", 17000);
  set(lines, "disassembly", 27000);
  set(lines, "mobilization", 54600);
  set(lines, "demobilization", 54600);
  return lines;
}

function build(over: { lines?: RentalLine[]; data?: any; quote?: any; forPdf?: boolean } = {}) {
  const lines = over.lines ?? priced();
  const months = over.quote?.rental_duration_months ?? 8;
  const data = { ...defaultRentalData(), attention: "Eng. Rodrigo Fiuza", issue_city: "Santana de Parnaíba/SP", ...(over.data || {}), lines };
  const t = rentalTotals(lines, months, over.quote?.discount_percent ?? 0, over.quote?.rental_tax_percent ?? 0);
  const quote = {
    quote_number: "PRO260077", quote_type: "locacao", status: "finalized", created_at: "2026-06-30T03:30:00Z",
    validity_days: 30, hide_unit_prices: false, hide_discount_value: false, notes: null, payment_terms_items: [],
    project_name: "OBRA CORPORATE", project_location: "Betim, MG", rental_duration_months: months, rental_start_date: "2026-03-01",
    grua_lanca_m: 50, grua_altura_torre_m: 42, grua_carga_maxima_kg: 6000, grua_carga_ponta_kg: 1200,
    discount_percent: 0, rental_tax_percent: 0, subtotal: t.subtotal, total: t.total,
    clients: { razao_social: "Construtora Santos Ltda", nome_fantasia: "Santos" },
    service_data: data, __revision_number: 1, ...(over.quote || {}),
  };
  const items = [
    { product_category: "grua", product_name: "POTAIN MC85AS", order_index: 0 },
    ...toQuoteItemRows("q1", lines, months),
  ];
  return mod.generateRentalProposalHTML(quote, items, { name: "Vendedor" }, company, { forPdf: over.forPdf ?? false });
}

const h2 = (html: string) => [...html.matchAll(/<h2>(\d+)\. ([^<]+)<\/h2>/g)].map((m) => `${m[1]}. ${m[2]}`);
const money = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

describe("PDF da proposta de locação detalhada", () => {
  const html = build();

  it("tem as seções do modelo, em ordem, e a numeração acompanha o que aparece", () => {
    const titles = h2(html);
    expect(titles.slice(0, 2)).toEqual(["1. EQUIPAMENTO", "2. QUADRO RESUMO DE PREÇOS"]);
    expect(titles).toContain("3. SEGURO");
    expect(titles).toContain("4. NÃO INCLUSO");
    expect(titles).toContain("5. INCLUSO");
    expect(titles).toContain("6. OBSERVAÇÕES DO QUADRO DE PREÇOS");
    expect(titles.some((t) => /COMPROMISSOS DA CONTRATANTE/.test(t))).toBe(true);
    expect(titles.at(-1)).toMatch(/VALIDADE$/);
    expect(html).toContain("ACEITE DA PROPOSTA");
  });

  it("cabeçalho: empresa, número, revisão (sem Rascunho), data em Brasília, contato e assunto", () => {
    expect(html).toContain("Dacrom Brasil Serviços");
    expect(html).toContain("Proposta PRO260077");
    expect(html).toContain("Rev. 1");
    expect(html).not.toMatch(/rascunho/i);
    expect(html).toContain("Santana de Parnaíba/SP, 30 de junho de 2026");
    expect(html).toContain("Att. Eng. Rodrigo Fiuza");
    expect(html).toContain("Construtora Santos Ltda");
    expect(html).toContain("Locação de grua e serviços decorrentes");
  });

  it("equipamento: modelo, período, início sem andar de dia, dados da grua e dispositivos de segurança", () => {
    expect(html).toContain("POTAIN MC85AS");
    expect(html).toContain("8 meses");
    expect(html).toContain("01/03/2026"); // '2026-03-01' sem passar pelo fuso
    expect(html).toContain("50 m");
    expect(html).toContain("6.000 kg");
    expect(html).toContain("Limitador de momento máximo");
  });

  it("quadro: os dois blocos com valores, totais por bloco e total do equipamento batem com a biblioteca", () => {
    const t = rentalTotals(priced(), 8);
    expect(t.ebl).toBe(181328);
    expect(html).toContain("Locação de bens móveis");
    expect(html).toContain("Serviços de mão-de-obra");
    expect(html).toContain(money(22666));
    expect(html).toContain(money(t.ebl));
    expect(html).toContain(money(t.cmo));
    expect(html).toContain("Valor total estimado por equipamento");
    expect(html).toContain(money(t.subtotal));
    expect(html).toContain("VALOR TOTAL DA PROPOSTA");
    expect(html).toContain(money(t.total));
  });

  it("linha sem valor ou desmarcada NÃO aparece", () => {
    for (const nome of ["Operador mensal diurno", "Caçamba de 750 litros", "Assistência técnica", "Telescopagem por evento", "Frete"]) {
      expect(html).not.toContain(nome);
    }
    const lines = priced();
    set(lines, "mobilization", 54600, { enabled: false });
    const h = build({ lines });
    expect(h).not.toContain("Custo para mobilização");
    expect(h).toContain("Custo para desmobilização");
  });

  it("operador, seguro, manutenção e assistência técnica aparecem como custos separados, cada um com seu valor", () => {
    const lines = priced();
    set(lines, "insurance", 1500);
    set(lines, "operator", 12000);
    set(lines, "maintenance_monthly", 6500);
    set(lines, "technical_assistance", 3000);
    const t = rentalTotals(lines, 8);
    const h = build({ lines });
    expect(h).toContain("Seguro de riscos diversos (RD)");
    expect(h).toContain("Operador mensal diurno");
    expect(h).toContain("Manutenção mensal");
    expect(h).toContain("Assistência técnica");
    expect(h).toContain(money(12000));
    expect(h).toContain(money(6500));
    expect(h).toContain(money(3000 * 8));
    expect(h).toContain(money(t.subtotal));
    expect(h).not.toMatch(/incluso no valor|operador incluso|seguro incluso/i);
  });

  it("linha livre acrescentada pelo usuário aparece com o texto escapado", () => {
    const lines = priced();
    lines.push(customLine("cmo", { description: "Taxa <b>especial</b> & cia", unit_price: 900, quantity: 2 }));
    const h = build({ lines });
    expect(h).toContain("Taxa &lt;b&gt;especial&lt;/b&gt; &amp; cia");
    expect(h).not.toContain("<b>especial</b>");
    expect(h).toContain(money(1800));
  });

  it("texto digitado nunca vira HTML solto", () => {
    const h = build({ data: { intro: "<script>alert(1)</script>", attention: '"><img src=x onerror=1>' } });
    expect(h).not.toContain("<script>alert(1)</script>");
    expect(h).not.toContain("<img src=x");
    expect(h).toContain("&lt;script&gt;");
  });

  it("esconder valores unitários: some a coluna de preço e fica só o total final", () => {
    const h = build({ quote: { hide_unit_prices: true } });
    expect(h).not.toContain("Valor unitário");
    expect(h).not.toContain(money(22666));
    expect(h).not.toContain("Valor total estimado por equipamento");
    expect(h).toContain("VALOR TOTAL DA PROPOSTA");
    expect(h).toContain(money(rentalTotals(priced(), 8).total));
  });

  it("desconto e imposto: mostrados, ou só 'Desconto aplicado' quando o valor é escondido", () => {
    const t = rentalTotals(priced(), 8, 10, 5);
    const shown = build({ quote: { discount_percent: 10, rental_tax_percent: 5 } });
    expect(shown).toContain("Desconto (10%)");
    expect(shown).toContain(money(t.discount));
    expect(shown).toContain("Impostos (5%)");
    expect(shown).toContain(money(t.total));
    const hidden = build({ quote: { discount_percent: 10, rental_tax_percent: 5, hide_discount_value: true } });
    expect(hidden).toContain("Desconto aplicado");
    expect(hidden).not.toContain("Desconto (10%)");
    expect(hidden).not.toContain(money(t.discount));
  });

  it("tabelas fora do horário comercial só aparecem com valor, com campo de adesão Sim/Não", () => {
    expect(html).not.toContain("após as 17:00");
    expect(html).not.toContain("Adesão");
    const lines = priced();
    set(lines, "night17_weekday", 180);
    const h = build({ lines });
    expect(h).toContain("Manutenção corretiva após as 17:00 e até as 22:00");
    expect(h).not.toContain("após as 22:00 e até as 6:00");
    expect(h).toContain("Adesão");
    expect(h).toContain(money(180));
    expect(h).toContain("MANUTENÇÃO CORRETIVA");
    expect((h.match(/class="box"/g) || []).length).toBe(2); // Sim e Não
    // tarifa por hora não entra no total
    expect(h).toContain(money(rentalTotals(lines, 8).total));
    expect(rentalTotals(lines, 8).total).toBe(rentalTotals(priced(), 8).total);
  });

  it("lista esvaziada some do PDF e a numeração das seções fecha sem buracos", () => {
    const h = build({ data: { insurance: [], not_included: [], included: [], observations: [], sections: [] } });
    const titles = h2(h);
    expect(titles.map((t) => t.split(". ")[1])).toEqual(["EQUIPAMENTO", "QUADRO RESUMO DE PREÇOS", "VALIDADE"]);
    expect(titles.map((t) => Number(t.split(".")[0]))).toEqual([1, 2, 3]);
  });

  it("condições de pagamento da etapa Comercial entram como seção própria", () => {
    const h = build({ quote: { payment_terms_items: [{ text: "50% na assinatura" }, { text: "50% na montagem" }] } });
    expect(h).toContain("CONDIÇÕES DE PAGAMENTO");
    expect(h).toContain("50% na assinatura");
    expect(html).not.toContain("CONDIÇÕES DE PAGAMENTO");
  });

  it("validade, assinatura e aceite", () => {
    expect(html).toContain("<strong>30 dias</strong>");
    expect(html).toContain("até <strong>30/07/2026</strong>");
    expect(html).toContain("Pela Construtora Santos Ltda");
    expect(html).toContain("Ana Morais"); // assinante da empresa quando a proposta não define outro
    expect(html).toContain("Declaro expressamente ter lido");
  });

  it("cada revisão renova a validade: 30 dias a contar da última revisão", () => {
    const h = build({ quote: { __revision_number: 2, __validity_base: "2026-11-24T21:38:11Z" } });
    expect(h).toContain("a contar da Rev. 2 (24/11/2026)");
    expect(h).toContain("até <strong>24/12/2026</strong>");
  });

  it("para o PDF não leva a barra de impressão; na tela leva", () => {
    expect(html).toContain('<div class="print-toolbar">');
    expect(build({ forPdf: true })).not.toContain('<div class="print-toolbar">');
  });

  it("o total do PDF é o mesmo que o assistente grava (colunas antigas e itens fecham com ele)", () => {
    const lines = priced();
    set(lines, "operator", 12000);
    set(lines, "insurance", 1500);
    const t = rentalTotals(lines, 8, 5, 3);
    const rows = toQuoteItemRows("q", lines, 8);
    expect(rows.reduce((s, r) => s + r.total_price, 0)).toBe(t.subtotal);
    expect(legacyColumns(lines, 8).rental_monthly_value).toBe(22666);
    expect(build({ lines, quote: { discount_percent: 5, rental_tax_percent: 3 } })).toContain(money(t.total));
  });
});

describe("a proposta de serviço continua igual", () => {
  it("o estilo comum foi compartilhado sem mudar o documento", () => {
    const html = mod.generateServiceHTML(
      { quote_number: "S1", quote_type: "servico", status: "finalized", created_at: "2026-06-30T03:30:00Z", validity_days: 30, clients: { razao_social: "X" }, service_data: {} },
      [], {}, company, { forPdf: true },
    );
    expect(html).toContain("<style>");
    expect(html).toContain("table.items tr.total-row td");
    expect(html).not.toContain("table.totals");
  });
});
