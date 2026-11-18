import { useEffect } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RentalWizardData, initialRentalData, useRentalWizard } from "@/hooks/useRentalWizard";
import { DEFAULT_INSURANCE, defaultLines, type RentalLine } from "@/lib/rentalProposal";
import RentalItemsCard from "../RentalItemsCard";
import RentalStepPrices from "./RentalStepPrices";
import RentalStepReview from "./RentalStepReview";
import RentalStepSummary from "./RentalStepSummary";
import RentalStepTerms from "./RentalStepTerms";
import RentalStepWork from "./RentalStepWork";

afterEach(cleanup);

const priceLine = (lines: RentalLine[], key: string, unit_price: number, extra: Partial<RentalLine> = {}) =>
  lines.map((l) => (l.key === key ? { ...l, unit_price, enabled: true, ...extra } : l));

function Harness({ children, initial }: { children: (w: ReturnType<typeof useRentalWizard>) => React.ReactNode; initial?: (d: RentalWizardData) => Partial<RentalWizardData> }) {
  const w = useRentalWizard();
  useEffect(() => { if (initial) w.updateData(initial(w.data)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children(w)}</>;
}

const prices = (initial?: (d: RentalWizardData) => Partial<RentalWizardData>, onNext = () => {}) => (
  <Harness initial={initial}>
    {(w) => <RentalStepPrices data={w.data} months={w.months} totals={w.totals} updateData={w.updateData} updateLines={w.updateLines} onNext={onNext} onPrev={() => {}} />}
  </Harness>
);

const row = (key: string) => document.querySelector(`[data-line-key="${key}"]`) as HTMLElement;

describe("etapa Preços", () => {
  it("começa sem preço nenhum: avisa que as linhas ligadas sem valor não aparecem e bloqueia o Próximo", () => {
    render(prices());
    expect(screen.getAllByText(/Sem valor: não aparece na proposta/).length).toBeGreaterThanOrEqual(5);
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
  });

  it("operador, seguro, manutenção e assistência técnica são linhas próprias, com valor próprio", () => {
    render(prices());
    for (const key of ["insurance", "operator", "maintenance_monthly", "technical_assistance"]) expect(row(key)).toBeTruthy();
    expect(row("operator")).toHaveTextContent("Operador mensal diurno");
    // desligado: uma linha só; ao ligar, aparecem quantidade, unidade e valor próprios
    expect(within(row("operator")).queryByLabelText("Valor unitário")).not.toBeInTheDocument();
    fireEvent.click(within(row("operator")).getByRole("switch"));
    expect(within(row("operator")).getByLabelText("Valor unitário")).toBeInTheDocument();
  });

  it("prazo e valor da locação mensal liberam o Próximo e entram nos totais", () => {
    render(prices());
    fireEvent.change(screen.getByLabelText(/Período total de locação/), { target: { value: "8" } });
    fireEvent.change(within(row("rent")).getByLabelText("Valor unitário"), { target: { value: "22666" } });
    expect(screen.getByRole("button", { name: "Próximo" })).toBeEnabled();
    // 8 × 22.666 = 181.328 (aparece na linha, no total do bloco e no resumo)
    expect(screen.getAllByText(/181\.328,00/).length).toBeGreaterThanOrEqual(2);
    expect(within(row("rent")).queryByText(/Sem valor/)).not.toBeInTheDocument();
  });

  it("cada custo soma no seu bloco: serviços de mão-de-obra separados da locação", () => {
    render(prices((d) => ({
      rental_duration_months: 8,
      lines: priceLine(priceLine(priceLine(d.lines, "rent", 22666), "operator", 12000), "assembly", 17000),
    })));
    const totals = screen.getByLabelText("Totais do quadro de preços");
    expect(within(totals).getByText(/Total — locação de bens móveis/).parentElement).toHaveTextContent("181.328,00");
    // operador 8 × 12.000 = 96.000 + montagem 17.000
    expect(within(totals).getByText(/Total — serviços de mão-de-obra/).parentElement).toHaveTextContent("113.000,00");
    expect(within(totals).getByText(/Valor total estimado por equipamento/).parentElement).toHaveTextContent("294.328,00");
  });

  it("desmarcar a mobilização tira a linha dos totais e do aviso", () => {
    render(prices((d) => ({ rental_duration_months: 8, lines: priceLine(priceLine(d.lines, "rent", 1000), "mobilization", 54600) })));
    const totals = screen.getByLabelText("Totais do quadro de preços");
    expect(within(totals).getByText(/Total — serviços de mão-de-obra/).parentElement).toHaveTextContent("54.600,00");
    fireEvent.click(within(row("mobilization")).getByRole("switch"));
    expect(within(totals).getByText(/Total — serviços de mão-de-obra/).parentElement).toHaveTextContent("0,00");
  });

  it("dá para acrescentar e remover uma linha livre", () => {
    render(prices());
    const before = document.querySelectorAll('[data-line-key="custom"]').length;
    fireEvent.click(screen.getAllByRole("button", { name: /Adicionar item/ })[1]);
    expect(document.querySelectorAll('[data-line-key="custom"]').length).toBe(before + 1);
    fireEvent.click(screen.getByRole("button", { name: "Remover item" }));
    expect(document.querySelectorAll('[data-line-key="custom"]').length).toBe(before);
  });

  it("quantidade quebrada é arredondada (a coluna do banco é inteira)", () => {
    render(prices());
    const qty = within(row("assembly")).getByLabelText("Quantidade") as HTMLInputElement;
    fireEvent.change(qty, { target: { value: "2.6" } });
    expect(qty.value).toBe("3");
  });

  it("tabelas de manutenção fora do horário ficam recolhidas e só somam como tarifa", () => {
    render(prices((d) => ({ rental_duration_months: 8, lines: priceLine(d.lines, "rent", 1000) })));
    expect(screen.queryByLabelText(/Valor por hora: Manutenção corretiva \(hora homem\) - segunda a sexta \(Manutenção corretiva após as 17:00/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Manutenção corretiva fora do horário comercial/ }));
    const input = screen.getByLabelText(/Valor por hora: .*segunda a sexta.*após as 17:00/);
    fireEvent.change(input, { target: { value: "180" } });
    const totals = screen.getByLabelText("Totais do quadro de preços");
    expect(within(totals).getByText(/Valor total estimado por equipamento/).parentElement).toHaveTextContent("8.000,00");
  });
});

describe("etapa Condições", () => {
  const terms = (initial?: (d: RentalWizardData) => Partial<RentalWizardData>) => (
    <Harness initial={initial}>
      {(w) => <RentalStepTerms data={w.data} updateRental={w.updateRental} companies={[{ id: "1", slug: "dacrom", company_name: "Dacrom", razao_social: "Dacrom LTDA" }]} onCompanyChange={() => {}} onNext={() => {}} onPrev={() => {}} />}
    </Harness>
  );

  it("textos-padrão vêm preenchidos e o aviso pede revisão", () => {
    render(terms());
    expect(screen.getByText(/Revise tudo/)).toBeInTheDocument();
    expect((screen.getByLabelText("Texto de abertura") as HTMLTextAreaElement).value).toContain("proposta comercial");
  });

  it("remover um tópico e restaurar o texto-padrão", () => {
    render(terms());
    fireEvent.click(screen.getByRole("button", { name: /Seguro, incluso e não incluso/ }));
    const removeButtons = () => screen.getAllByRole("button", { name: "Remover tópico" });
    const total = removeButtons().length;
    fireEvent.click(removeButtons()[0]);
    expect(removeButtons().length).toBe(total - 1);
    // o botão "Restaurar" do bloco Seguro (o primeiro da tela é o do texto de abertura)
    const insuranceBlock = screen.getByText("Seguro", { selector: "label" }).parentElement!.parentElement!;
    fireEvent.click(within(insuranceBlock).getByRole("button", { name: /Restaurar texto-padrão/ }));
    expect(removeButtons().length).toBe(total);
    expect(screen.getAllByDisplayValue(DEFAULT_INSURANCE[0]).length).toBeGreaterThan(0);
  });

  it("sem assunto não avança", () => {
    render(terms());
    fireEvent.change(screen.getByLabelText("Assunto *"), { target: { value: "  " } });
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
  });
});

describe("etapa Obra", () => {
  const work = (initial?: (d: RentalWizardData) => Partial<RentalWizardData>) => (
    <Harness initial={initial}>
      {(w) => <RentalStepWork data={w.data} updateData={w.updateData} updateRental={w.updateRental} onNext={() => {}} onPrev={() => {}} />}
    </Harness>
  );

  it("não pergunta tipo de obra, condição do terreno nem fundação especial", () => {
    render(work());
    expect(screen.queryByText(/Tipo de Obra/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Condição do Terreno/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fundação especial/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mais detalhes da obra/ })).not.toBeInTheDocument();
  });

  it("proposta antiga com esses dados: eles não aparecem na tela, mas continuam guardados", () => {
    const d = { ...initialRentalData(), rental_work_type: "residencial", rental_terrain_condition: "plano", rental_special_foundation: true };
    render(<RentalStepWork data={d} updateData={() => {}} updateRental={() => {}} onNext={() => {}} onPrev={() => {}} />);
    expect(screen.queryByLabelText(/fundação especial/i)).not.toBeInTheDocument();
    expect(d).toMatchObject({ rental_work_type: "residencial", rental_terrain_condition: "plano", rental_special_foundation: true });
  });

  it("só o nome da obra é obrigatório; o contato (Att.) vai para os textos", () => {
    render(work());
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nome do Projeto/), { target: { value: "Obra Corporate" } });
    expect(screen.getByRole("button", { name: "Próximo" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText(/Contato na obra/), { target: { value: "Eng. Fulano" } });
    expect(screen.getByLabelText(/Contato na obra/)).toHaveValue("Eng. Fulano");
  });
});

describe("etapa Resumo", () => {
  const summary = (initial: (d: RentalWizardData) => Partial<RentalWizardData>) => (
    <Harness initial={initial}>
      {(w) => <RentalStepSummary data={w.data} months={w.months} totals={w.totals} onNext={() => {}} onPrev={() => {}} />}
    </Harness>
  );
  const base = (d: RentalWizardData) => ({ rental_duration_months: 8, project_name: "Obra", lines: priceLine(priceLine(d.lines, "rent", 22666), "operator", 12000) });

  it("mostra cada custo em sua linha, nos dois blocos", () => {
    render(summary(base));
    const eblTable = screen.getByRole("table", { name: "Locação de bens móveis" });
    expect(within(eblTable).getByText(/Locação mensal do equipamento/)).toBeInTheDocument();
    const cmoTable = screen.getByRole("table", { name: "Serviços de mão-de-obra" });
    expect(within(cmoTable).getByText(/Operador mensal diurno/)).toBeInTheDocument();
  });

  it("avisa das linhas ligadas que ficaram sem valor (não aparecem)", () => {
    render(summary(base));
    expect(screen.getByText(/ficaram sem valor e/)).toBeInTheDocument();
    expect(screen.getByText(/Montagem \(com auxílio/)).toBeInTheDocument();
  });

  it("valores unitários escondidos: some a coluna e ficam só os totais finais", () => {
    render(summary((d) => ({ ...base(d), hide_unit_prices: true })));
    expect(screen.queryByText("Valor unit.")).not.toBeInTheDocument();
    expect(screen.queryByText("Valor total estimado por equipamento")).not.toBeInTheDocument();
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
  });

  it("desconto e impostos aparecem nos totais", () => {
    render(summary((d) => ({ ...base(d), discount_percent: 10, rental_tax_percent: 5 })));
    expect(screen.getByText(/Desconto \(10%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Impostos \(5%\)/)).toBeInTheDocument();
  });
});

describe("etapa Revisão", () => {
  const review = (initial: (d: RentalWizardData) => Partial<RentalWizardData>, extra: Partial<React.ComponentProps<typeof RentalStepReview>> = {}) => (
    <Harness initial={initial}>
      {(w) => <RentalStepReview data={w.data} total={w.total} updateData={w.updateData} onPrev={() => {}} onSaveDraft={() => {}} onFinalize={extra.onFinalize ?? (() => {})} isSaving={false} {...extra} />}
    </Harness>
  );
  const complete = (d: RentalWizardData) => ({
    client_id: "c1", rental_duration_months: 8, project_name: "Obra", selected_crane_name: "MC85",
    lines: priceLine(d.lines, "rent", 22666),
  });

  it("proposta incompleta: lista o que falta, bloqueia Finalizar, mas deixa salvar rascunho", () => {
    render(review(() => ({ client_id: "c1" })));
    expect(screen.getByText("Para finalizar, corrija:")).toBeInTheDocument();
    expect(screen.getByText("Informe o prazo da locação, em meses.")).toBeInTheDocument();
    expect(screen.getByText("Informe o valor da locação mensal do equipamento.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finalizar Proposta/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Salvar Rascunho/ })).toBeEnabled();
  });

  it("completa mas com os textos não revisados: ainda bloqueia; confirmar a revisão libera", () => {
    const onFinalize = vi.fn();
    render(review(complete, { onFinalize }));
    expect(screen.queryByText("Para finalizar, corrija:")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finalizar Proposta/ })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Revisei os textos da proposta/));
    const finalize = screen.getByRole("button", { name: /Finalizar Proposta/ });
    expect(finalize).toBeEnabled();
    fireEvent.click(finalize);
    expect(onFinalize).toHaveBeenCalled();
  });

  it("desconto acima do limite: só envia para aprovação", () => {
    render(review(complete, { needsApproval: true, onRequestApproval: () => {} }));
    expect(screen.queryByRole("button", { name: /Finalizar Proposta/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enviar para Aprovação/ })).toBeEnabled();
  });
});

describe("detalhe da proposta de locação", () => {
  const sd = (lines: RentalLine[]) => ({ kind: "locacao", lines });
  const lines = (): RentalLine[] => priceLine(priceLine(priceLine(defaultLines(), "rent", 22666), "operator", 12000), "insurance", 1500);

  it("mostra cada custo em sua linha e os totais", () => {
    render(<RentalItemsCard serviceData={sd(lines())} months={8} total={310000} />);
    expect(screen.getByText(/Locação mensal do equipamento/)).toBeInTheDocument();
    expect(screen.getByText(/Operador mensal diurno/)).toBeInTheDocument();
    expect(screen.getByText(/Seguro de riscos diversos/)).toBeInTheDocument();
    expect(screen.queryByText(/Assistência técnica/)).not.toBeInTheDocument(); // sem valor, não aparece
    expect(screen.getAllByText(/181\.328,00/).length).toBeGreaterThan(0);
  });

  it("valores escondidos: só o total", () => {
    render(<RentalItemsCard serviceData={sd(lines())} months={8} total={310000} hidePrices />);
    expect(screen.queryByText(/181\.328,00/)).not.toBeInTheDocument();
    expect(screen.getByText(/310\.000,00/)).toBeInTheDocument();
  });
});
