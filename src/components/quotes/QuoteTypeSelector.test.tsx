import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import QuoteTypeSelector from "./QuoteTypeSelector";

afterEach(cleanup);

describe("escolha do tipo de proposta", () => {
  it("sem o SQL de serviço: só Venda e Locação", () => {
    render(<QuoteTypeSelector open onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Nova proposta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Venda/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Locação/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Serviço/ })).not.toBeInTheDocument();
  });

  it("com o serviço ativado: as três opções, nesta ordem", () => {
    render(<QuoteTypeSelector open serviceEnabled onSelect={() => {}} onClose={() => {}} />);
    const names = screen.getAllByRole("button").filter((b) => b.closest("ul")).map((b) => b.textContent);
    expect(names.map((n) => n!.split(/Venda de|Aluguel|Montagem/)[0].trim())).toEqual(["Venda", "Locação", "Serviço"]);
  });

  it("clicar escolhe o tipo", () => {
    const onSelect = vi.fn();
    render(<QuoteTypeSelector open serviceEnabled onSelect={onSelect} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Venda/ }));
    fireEvent.click(screen.getByRole("button", { name: /Locação/ }));
    fireEvent.click(screen.getByRole("button", { name: /Serviço/ }));
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual(["venda", "locacao", "servico"]);
  });

  it("fechada, não mostra nada", () => {
    render(<QuoteTypeSelector open={false} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.queryByText("Nova proposta")).not.toBeInTheDocument();
  });

  it("cada opção explica o que é", () => {
    render(<QuoteTypeSelector open serviceEnabled onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Venda de equipamento")).toBeInTheDocument();
    expect(screen.getByText("Aluguel de grua")).toBeInTheDocument();
    expect(screen.getByText("Montagem, manutenção e operação")).toBeInTheDocument();
  });
});
