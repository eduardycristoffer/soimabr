import { useEffect } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ServiceWizardData, useServiceWizard } from "@/hooks/useServiceWizard";
import { emptyItem } from "@/lib/serviceProposal";
import ServiceStepItems from "./ServiceStepItems";
import ServiceStepReview from "./ServiceStepReview";
import { StringListEditor, SectionListEditor, moveItem } from "./editors";
import { defaultServiceData } from "@/lib/serviceProposal";

afterEach(cleanup);

/** Liga a etapa ao estado real do assistente, como na tela. */
function ItemsHarness({ initial, onNext = () => {} }: { initial?: Partial<ServiceWizardData>; onNext?: () => void }) {
  const w = useServiceWizard();
  useEffect(() => { if (initial) w.updateData(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <ServiceStepItems data={w.data} updateData={w.updateData} totals={w.totals} onNext={onNext} onPrev={() => {}} />;
}

const money = (n: string) => new RegExp(n.replace(/\./g, "\\.").replace(",", ","));

describe("etapa de preços", () => {
  it("sem itens: avisa e não deixa avançar", () => {
    render(<ItemsHarness />);
    expect(screen.getByText(/Nenhum item ainda/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
  });

  it("item em branco: aparece como 2.1 e libera o botão Próximo", () => {
    render(<ItemsHarness />);
    fireEvent.click(screen.getByRole("button", { name: /Item em branco/ }));
    expect(screen.getByText("Item 2.1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo" })).toBeEnabled();
  });

  it("quantidade × preço soma no total; apagar a quantidade vira 'sob medição' e sai do total", () => {
    render(<ItemsHarness initial={{ items: [emptyItem({ description: "Montagem", quantity: 1, unit_price: 23000 })] }} />);
    expect(screen.getByText("Soma no total")).toBeInTheDocument();
    expect(screen.getAllByText(money("23.000,00")).length).toBeGreaterThan(0);

    const qty = screen.getByPlaceholderText("sob medição");
    fireEvent.change(qty, { target: { value: "" } });
    expect(screen.getByText("Sob medição", { selector: "div,span" })).toBeInTheDocument();
    expect(screen.getByText(/Total dos itens com quantidade \(0\)/)).toBeInTheDocument();
  });

  it("opcional não entra no total", () => {
    render(<ItemsHarness initial={{ items: [
      emptyItem({ description: "A", quantity: 1, unit_price: 1000 }),
      emptyItem({ description: "B", quantity: 1, unit_price: 500 }),
    ] }} />);
    expect(screen.getByText(/Total dos itens com quantidade \(2\)/)).toBeInTheDocument();
    const [, secondSwitch] = screen.getAllByRole("switch").filter((s) => !s.closest("label")?.textContent?.includes("Mostrar preços"));
    fireEvent.click(secondSwitch);
    expect(screen.getByText(/Total dos itens com quantidade \(1\)/)).toBeInTheDocument();
    expect(screen.getByText("1 opcional(is)")).toBeInTheDocument();
  });

  it("quantidade quebrada é arredondada (a coluna do banco é inteira)", () => {
    render(<ItemsHarness initial={{ items: [emptyItem({ description: "A", quantity: 1, unit_price: 10 })] }} />);
    const qty = screen.getByPlaceholderText("sob medição") as HTMLInputElement;
    fireEvent.change(qty, { target: { value: "2.6" } });
    expect(qty.value).toBe("3");
  });

  it("remover item", () => {
    render(<ItemsHarness initial={{ items: [emptyItem({ description: "A" }), emptyItem({ description: "B" })] }} />);
    expect(screen.getAllByText(/^Item 2\./)).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Remover item" })[0]);
    expect(screen.getAllByText(/^Item 2\./)).toHaveLength(1);
  });

  it("esconder preços mostra o aviso", () => {
    render(<ItemsHarness initial={{ items: [emptyItem({ description: "A" })] }} />);
    expect(screen.queryByText(/Com os preços escondidos/)).not.toBeInTheDocument();
    const toggle = screen.getAllByRole("switch").find((s) => s.closest("label")?.textContent?.includes("Mostrar preços"))!;
    fireEvent.click(toggle);
    expect(screen.getByText(/Com os preços escondidos/)).toBeInTheDocument();
  });
});

describe("etapa de revisão", () => {
  const totals = { fixedTotal: 25800, fixedCount: 2, measuredCount: 1, optionalCount: 1 };
  const base = (over: Partial<ServiceWizardData> = {}): ServiceWizardData => ({
    client_id: "c1", client_name: "Santos", client_type: "nacional",
    project_name: "Obra", project_location: "",
    items: [emptyItem({ description: "Montagem", quantity: 1, unit_price: 23000 })],
    show_unit_prices: true, validity_days: 30, notes: "", service: defaultServiceData(), texts_reviewed: false,
    ...over,
  });
  const renderReview = (data: ServiceWizardData, extra: Record<string, unknown> = {}) => {
    const fns = { onSaveDraft: vi.fn(), onFinalize: vi.fn(), updateData: vi.fn() };
    render(<ServiceStepReview data={data} totals={totals} onPrev={() => {}} isSaving={false} {...fns} {...(extra as any)} />);
    return fns;
  };

  it("só finaliza depois de marcar que revisou os textos", () => {
    const f = renderReview(base());
    expect(screen.getByRole("button", { name: /Finalizar Proposta/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(f.updateData).toHaveBeenCalledWith({ texts_reviewed: true });
  });

  it("textos revisados e dados completos: finalizar liberado e chama a ação", () => {
    const f = renderReview(base({ texts_reviewed: true }));
    const btn = screen.getByRole("button", { name: /Finalizar Proposta/ });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(f.onFinalize).toHaveBeenCalledTimes(1);
  });

  it("mostra o que falta e bloqueia finalizar, mas o rascunho continua permitido", () => {
    const f = renderReview(base({ texts_reviewed: true, items: [emptyItem({ description: "", unit_price: 0 })] }));
    expect(screen.getByText("Item 2.1: falta a descrição.")).toBeInTheDocument();
    expect(screen.getByText("Item 2.1: informe o preço unitário.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finalizar Proposta/ })).toBeDisabled();
    const draft = screen.getByRole("button", { name: /Salvar Rascunho/ });
    expect(draft).toBeEnabled();
    fireEvent.click(draft);
    expect(f.onSaveDraft).toHaveBeenCalled();
  });

  it("sem cliente nem o rascunho salva", () => {
    renderReview(base({ client_id: "" }));
    expect(screen.getByRole("button", { name: /Salvar Rascunho/ })).toBeDisabled();
    expect(screen.getByText("Escolha o cliente.")).toBeInTheDocument();
  });

  it("proposta já finalizada oferece 'manter finalizada' (também exige revisão)", () => {
    const onSaveChanges = vi.fn();
    renderReview(base({ texts_reviewed: false }), { onSaveChanges });
    const keep = screen.getByRole("button", { name: /manter finalizada/ });
    expect(keep).toBeDisabled();
    cleanup();
    renderReview(base({ texts_reviewed: true }), { onSaveChanges });
    const keep2 = screen.getByRole("button", { name: /manter finalizada/ });
    expect(keep2).toBeEnabled();
    fireEvent.click(keep2);
    expect(onSaveChanges).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Voltar para Rascunho/ })).toBeInTheDocument();
  });

  it("opcional não mostra valor de linha na revisão", () => {
    renderReview(base({ items: [emptyItem({ description: "Treino", quantity: 1, unit_price: 2500, is_optional: true })] }));
    const row = screen.getByText("Treino").closest("tr")!;
    expect(within(row).getByText("(opcional)")).toBeInTheDocument();
    expect(within(row).getAllByText("—").length).toBe(1);
  });
});

describe("editores de lista", () => {
  it("moveItem troca de lugar sem alterar a lista original e respeita as pontas", () => {
    const a = ["x", "y", "z"];
    expect(moveItem(a, 1, -1)).toEqual(["y", "x", "z"]);
    expect(moveItem(a, 2, 1)).toBe(a);
    expect(moveItem(a, 0, -1)).toBe(a);
    expect(a).toEqual(["x", "y", "z"]);
  });

  it("tópicos: editar, adicionar e remover", () => {
    const onChange = vi.fn();
    render(<StringListEditor title="Inclusos" value={["um", "dois"]} onChange={onChange} />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "UM" } });
    expect(onChange).toHaveBeenLastCalledWith(["UM", "dois"]);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar tópico/ }));
    expect(onChange).toHaveBeenLastCalledWith(["um", "dois", ""]);
    fireEvent.click(screen.getAllByRole("button", { name: "Remover tópico" })[1]);
    expect(onChange).toHaveBeenLastCalledWith(["um"]);
  });

  it("lista vazia avisa que a parte não aparece na proposta", () => {
    render(<StringListEditor title="Inclusos" value={[]} onChange={() => {}} />);
    expect(screen.getByText(/Nenhum tópico/)).toBeInTheDocument();
  });

  it("restaurar texto-padrão chama a ação do botão", () => {
    const onReset = vi.fn();
    render(<StringListEditor title="Inclusos" value={["a"]} onChange={() => {}} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: /Restaurar texto-padrão/ }));
    expect(onReset).toHaveBeenCalled();
  });

  it("seções finais: numeradas 6.1, 6.2 e editáveis", () => {
    const onChange = vi.fn();
    render(<SectionListEditor value={[{ title: "A", text: "ta" }, { title: "B", text: "tb" }]} onChange={onChange} />);
    expect(screen.getByText("6.1")).toBeInTheDocument();
    expect(screen.getByText("6.2")).toBeInTheDocument();
    fireEvent.change(screen.getAllByPlaceholderText("Título da seção")[1], { target: { value: "Novo" } });
    expect(onChange).toHaveBeenLastCalledWith([{ title: "A", text: "ta" }, { title: "Novo", text: "tb" }]);
  });
});
