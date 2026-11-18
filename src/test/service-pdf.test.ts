import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { defaultServiceData, emptyItem, toQuoteItemRows, type ServiceItem } from "@/lib/serviceProposal";

/**
 * Executa o gerador REAL da proposta de serviço (supabase/functions/generate-pdf/index.ts).
 * A função de borda roda no Deno e não pode ser importada; por isso o trecho do gerador é
 * recortado do arquivo, convertido de TypeScript e executado aqui.
 */
const source = readFileSync(join(process.cwd(), "supabase/functions/generate-pdf/index.ts"), "utf-8");
const marker = source.indexOf("// PROPOSTA DE SERVIÇO");
if (marker < 0) throw new Error("trecho da proposta de serviço não encontrado em generate-pdf");
const js = ts.transpileModule(source.slice(marker), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
// eslint-disable-next-line no-new-func
const mod = new Function(`${js}; return { generateServiceHTML, serviceFooterHtml, svcEsc };`)() as {
  generateServiceHTML: (q: any, items: any[], creator: any, company: any, opts: { forPdf: boolean }) => string;
  serviceFooterHtml: (c: any) => string;
  svcEsc: (s: unknown) => string;
};

const company = {
  company_name: "Dacrom Brasil Serviços", razao_social: "Dacrom Brasil Serviços LTDA", cnpj: "27.964.905/0001-38",
  address: "Avenida Maranhão, S/N, Quadra 61, Lote 15, Jundiaí, Anápolis-GO, CEP 75110-470",
  phone: "(62) 3772-0059", email: "dacrombrengenharia@gmail.com",
  representante_nome: "Ana Cristina Mendes Da Costa Morais", representante_cargo: "Diretora",
};

const line = (p: Partial<ServiceItem>) => emptyItem({ unit_price: 100, quantity: 1, description: "Serviço", ...p });

function build(over: { items?: ServiceItem[]; service?: any; quote?: any } = {}) {
  const items = over.items ?? [
    line({ description: "Plano de cargas", unit_price: 2800 }),
    line({ description: "Montagem da grua (previsão 4 dias)", unit_price: 23000 }),
    line({ description: "Desmontagem da grua (previsão 6 dias)", unit_price: 30000 }),
    line({ description: "Telescopagem da torre da grua ascensional", quantity: null, unit_price: 5500 }),
    line({ description: "Furo em concreto", quantity: null, unit_price: 95, is_optional: true, note: "Por furo" }),
    line({ description: "Treinamento de sinaleiros", unit: "Único", unit_price: 2500, is_optional: true }),
  ];
  const rows = toQuoteItemRows("q1", items).map((r) => ({ ...r }));
  const sd = { ...defaultServiceData(company as any), attention: "Eng. Rodrigo Fiuza", ...(over.service || {}) };
  sd.equipment = sd.equipment.map((e) => (e.label === "Modelo" ? { ...e, value: "TORRE ASCENSIONAL – AUTO DESMONTANTE" } : e));
  const quote = {
    quote_number: "PRO260042", quote_type: "servico", status: "finalized", created_at: "2026-06-30T03:30:00Z",
    validity_days: 30, hide_unit_prices: false, notes: null, project_name: "OBRA CORPORATE", project_location: "Betim, MG",
    clients: { razao_social: "Construtora Santos Ltda", nome_fantasia: "Santos" },
    service_data: sd, __revision_number: 2, ...(over.quote || {}),
  };
  return mod.generateServiceHTML(quote, rows, { name: "Vendedor" }, company, { forPdf: false });
}

describe("PDF da proposta de serviço", () => {
  const html = build();

  it("tem as 7 seções do modelo, em ordem", () => {
    const titles = [...html.matchAll(/<h2>(\d+)\. ([^<]+)<\/h2>/g)].map((m) => `${m[1]}. ${m[2]}`);
    expect(titles).toEqual([
      "1. OBJETO", "2. CONDIÇÕES COMERCIAIS", "3. CONDIÇÕES DE PAGAMENTO",
      "4. RESPONSABILIDADES DA CONTRATANTE", "5. RESPONSABILIDADES DA CONTRATADA",
      "6. CONSIDERAÇÕES FINAIS", "7. VALIDADE",
    ]);
    expect(html).toContain("ACEITE DA PROPOSTA");
  });

  it("cabeçalho: empresa emitente, número, revisão (sem a palavra Rascunho) e data no fuso de Brasília", () => {
    expect(html).toContain("Dacrom Brasil Serviços");
    expect(html).toContain("Proposta PRO260042");
    expect(html).toContain("Rev. 2");
    expect(html).not.toMatch(/rascunho/i);
    // 30/06/2026 03:30 UTC = 30/06 00:30 em Brasília → ainda dia 30
    expect(html).toContain("Anápolis/GO, 30 de junho de 2026");
    expect(html).toContain("Att. Eng. Rodrigo Fiuza");
    expect(html).toContain("Construtora Santos Ltda"); // exibido em maiúsculas pelo estilo
  });

  it("data de madrugada UTC não vira o dia seguinte nem o anterior errado", () => {
    // 01/07/2026 02:00 UTC = 30/06/2026 23:00 em Brasília
    const h = build({ quote: { created_at: "2026-07-01T02:00:00Z" } });
    expect(h).toContain("30 de junho de 2026");
    expect(h).toContain("(30/06/2026)");
    expect(h).toContain("até <strong>30/07/2026</strong>");
  });

  it("tabela de preços: valores, total só dos itens com quantidade, opcional marcado e sob medição sem valor", () => {
    expect(html).toContain("R$ 2.800,00");
    expect(html).toContain("R$ 23.000,00");
    expect(html).toContain("Total dos itens com quantidade definida");
    expect(html).toContain("R$ 55.800,00"); // 2.800 + 23.000 + 30.000; opcionais e sob medição ficam de fora
    expect(html).toContain("(OPCIONAL)");
    expect(html).toContain("sob medição");
    expect(html).not.toContain("R$ 58.300,00"); // total errado se o opcional entrasse
    expect(html).toContain("2.1</td>");
    expect(html).toContain("2.6</td>");
  });

  it("escondendo os preços, a tabela perde as colunas e o total", () => {
    const h = build({ quote: { hide_unit_prices: true } });
    expect(h).not.toContain("Preço unitário");
    expect(h).not.toContain("R$ 55.800,00");
    expect(h).not.toContain("R$ 23.000,00");
    expect(h).toContain("Montagem da grua");
  });

  it("numeração das seções acompanha o que aparece (sem buracos)", () => {
    const h = build({ service: { client_responsibilities: [], payment_text: "" } });
    const titles = [...h.matchAll(/<h2>(\d+)\. ([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(titles).toEqual(["1", "2", "3", "4", "5"]);
    expect(h).not.toContain("RESPONSABILIDADES DA CONTRATANTE");
  });

  it("considerações finais numeradas 6.1, 6.2...", () => {
    expect(html).toContain("6.1. Manutenções");
    expect(html).toContain("6.5. Retenções");
  });

  it("texto digitado pelo usuário não vira HTML (sem injeção)", () => {
    const h = build({
      items: [line({ description: `<script>alert(1)</script> & "x"`, note: "<img src=x onerror=1>" })],
      service: { attention: "<b>Fulano</b>", subject: "Assunto </div><script>x()</script>" },
    });
    expect(h).not.toContain("<script>alert");
    expect(h).not.toContain("<img src=x");
    expect(h).not.toContain("<b>Fulano</b>");
    expect(h).not.toContain("<script>x()");
    expect(h).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;");
  });

  it("assinante vem da proposta; aceite do cliente com campos para preencher", () => {
    expect(html).toContain("Ana Cristina Mendes Da Costa Morais");
    expect(html).toContain("Diretora");
    expect(html).toContain("Pela Construtora Santos Ltda");
    expect(html).toContain("Data: ____/____/________");
  });

  it("PDF (forPdf): sem a barra de impressão e sem rodapé solto; rodapé do PDFShift traz a numeração", () => {
    const quote = { quote_number: "PRO1", status: "draft", created_at: "2026-06-30T12:00:00Z", validity_days: 30, clients: {}, service_data: {} };
    const pdfHtml = mod.generateServiceHTML(quote, [], null, company, { forPdf: true });
    expect(pdfHtml).not.toContain("print-toolbar\"><button");
    expect(pdfHtml).not.toContain("endcontact\">");
    const footer = mod.serviceFooterHtml(company);
    expect(footer).toContain("{{page}}");
    expect(footer).toContain("{{total}}");
    expect(footer).toContain("27.964.905/0001-38");
  });

  it("proposta quase vazia (rascunho) não quebra", () => {
    const quote = { quote_number: "PRO2", status: "draft", created_at: "2026-06-30T12:00:00Z", clients: null, service_data: null };
    const h = mod.generateServiceHTML(quote, [], null, null, { forPdf: false });
    expect(h).toContain("Proposta PRO2");
    expect(h).toContain("Rev. 0");
    expect(h).not.toContain("undefined");
    expect(h).not.toContain("NaN");
  });
});
