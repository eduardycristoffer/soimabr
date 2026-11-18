import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ContractPaper } from "./ContractPaper";
import { newClause, type DraftClause } from "@/lib/contractTemplateDraft";
import { buildSampleMap } from "@/lib/contractSample";

afterEach(cleanup);
const sample = buildSampleMap(new Date("2026-11-18T12:00:00Z"));
const C = (uid: string, title: string, body: string, extra: Partial<DraftClause> = {}): DraftClause => ({ uid, id: uid, title, body, is_core: true, clause_key: null, ...extra });
const noop = () => {};

describe("folha do contrato (visualização)", () => {
  it("numera como o PDF: a primeira cláusula sem número, as demais 1., 2.…", () => {
    render(<ContractPaper clauses={[C("a", "PARTES", "x"), C("b", "OBJETO", "y"), C("c", "PREÇO", "z")]} sample={sample} activeUid={null} onSelect={noop} />);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["PARTES", "1. OBJETO", "2. PREÇO"]);
  });

  it("cabeçalho com o número do contrato de exemplo e a empresa", () => {
    render(<ContractPaper clauses={[C("a", "T", "x")]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(screen.getByText(`Nº ${sample.numero_contrato}`)).toBeInTheDocument();
    expect(screen.getByText(sample.vendedora_razao_social)).toBeInTheDocument();
  });

  it("campo conhecido aparece preenchido (azul), com o dado de exemplo", () => {
    const { container } = render(<ContractPaper clauses={[C("a", "T", "CNPJ {{vendedora_cnpj}}.")]} sample={sample} activeUid={null} onSelect={noop} />);
    const chip = container.querySelector('[data-field-state="filled"]')!;
    expect(chip.textContent).toBe(sample.vendedora_cnpj);
    expect(chip.getAttribute("title")).toContain("Nossa empresa · CNPJ");
  });

  it("campo que o sistema não conhece aparece em vermelho com o nome técnico (e não como '—')", () => {
    const { container } = render(<ContractPaper clauses={[C("a", "T", "Valor {{valor_mensal_locacao}}")]} sample={sample} activeUid={null} onSelect={noop} />);
    const chip = container.querySelector('[data-field-state="unknown"]')!;
    expect(chip.textContent).toBe("{{valor_mensal_locacao}}");
    expect(chip.getAttribute("title")).toContain("não conhece");
  });

  it("campo conhecido sem dado aparece em amarelo com '—'", () => {
    const { container } = render(<ContractPaper clauses={[C("a", "T", "IE {{vendedora_ie}}")]} sample={{ ...sample, vendedora_ie: "" }} activeUid={null} onSelect={noop} />);
    const chip = container.querySelector('[data-field-state="empty"]')!;
    expect(chip.textContent).toBe("—");
  });

  it("negrito, itálico e lista como no PDF", () => {
    const { container } = render(<ContractPaper clauses={[C("a", "T", "**forte** e _suave_\n\n- um\n- dois")]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(container.querySelector("strong")!.textContent).toBe("forte");
    expect(container.querySelector("em")!.textContent).toBe("suave");
    expect(Array.from(container.querySelectorAll("li")).map((l) => l.textContent)).toEqual(["um", "dois"]);
  });

  it("tabela de itens é desenhada (HTML do gerador), sem mostrar marcadores internos", () => {
    const { container } = render(<ContractPaper clauses={[C("a", "T", "{{itens_inclusos_tabela}}")]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(container.querySelector("table.scope-table")).not.toBeNull();
    expect(container.innerHTML).not.toContain("%%HTML%%");
  });

  it("cláusula opcional leva a etiqueta; as normais não", () => {
    render(<ContractPaper clauses={[C("a", "T1", "x"), C("b", "OPERADOR", "y", { is_core: false, clause_key: "operador" })]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(screen.getAllByText("Opcional")).toHaveLength(1);
    expect(within(screen.getByRole("button", { name: /OPERADOR/ })).getByText("Opcional")).toBeInTheDocument();
  });

  it("clicar ou apertar Enter/Espaço escolhe a cláusula", () => {
    const onSelect = vi.fn();
    render(<ContractPaper clauses={[C("a", "T1", "x"), C("b", "T2", "y")]} sample={sample} activeUid={null} onSelect={onSelect} />);
    const second = screen.getByRole("button", { name: /Editar cláusula 1\. T2/ });
    fireEvent.click(second);
    fireEvent.keyDown(second, { key: "Enter" });
    fireEvent.keyDown(second, { key: " " });
    fireEvent.keyDown(second, { key: "a" });
    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("a cláusula em edição fica marcada", () => {
    render(<ContractPaper clauses={[C("a", "T1", "x"), C("b", "T2", "y")]} sample={sample} activeUid="b" onSelect={noop} />);
    expect(screen.getByRole("button", { name: /T2/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /T1/ })).not.toHaveAttribute("aria-current");
  });

  it("título e texto vazios aparecem como aviso discreto, não como buraco", () => {
    render(<ContractPaper clauses={[C("a", "", "")]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(screen.getByText("(sem título)")).toBeInTheDocument();
    expect(screen.getByText("(sem texto)")).toBeInTheDocument();
  });

  it("modelo sem cláusulas explica o que fazer", () => {
    render(<ContractPaper clauses={[]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(screen.getByText(/ainda não tem cláusulas/)).toBeInTheDocument();
  });

  it("avisa que a tabela de itens entra no fim quando nenhuma cláusula a usa", () => {
    const { rerender } = render(<ContractPaper clauses={[C("a", "T", "x")]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(screen.getByText(/ESCOPO — ITENS INCLUSOS/)).toBeInTheDocument();
    rerender(<ContractPaper clauses={[C("a", "T", "{{itens_inclusos_tabela}}")]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(screen.queryByText(/ESCOPO — ITENS INCLUSOS/)).not.toBeInTheDocument();
  });

  it("cláusula nova (ainda sem id) também aparece", () => {
    render(<ContractPaper clauses={[C("a", "T", "x"), newClause({ title: "Extra", body: "texto" })]} sample={sample} activeUid={null} onSelect={noop} />);
    expect(screen.getByRole("heading", { name: "1. Extra" })).toBeInTheDocument();
  });
});
