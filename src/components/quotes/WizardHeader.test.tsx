import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WizardHeader from "./WizardHeader";

afterEach(cleanup);

const steps = [
  { id: 1, title: "Cliente", description: "Selecione o cliente" },
  { id: 2, title: "Obra", description: "Dados da obra" },
  { id: 3, title: "Preços" },
  { id: 4, title: "Revisão" },
];

const setup = (current = 3) => {
  const onBack = vi.fn();
  const onGoTo = vi.fn();
  render(<WizardHeader title="Nova proposta" steps={steps} current={current} onBack={onBack} onGoTo={onGoTo} />);
  return { onBack, onGoTo };
};

describe("cabeçalho do assistente de propostas", () => {
  it("mostra título, etapa atual e progresso", () => {
    setup(3);
    expect(screen.getByRole("heading", { name: "Nova proposta" })).toBeInTheDocument();
    expect(screen.getByText(/Etapa 3 de 4/)).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
  });

  it("só etapas já concluídas podem ser reabertas", () => {
    const { onGoTo } = setup(3);
    const cliente = screen.getByRole("button", { name: /Cliente/ });
    const obra = screen.getByRole("button", { name: /Obra/ });
    const precos = screen.getByRole("button", { name: /Preços/ });
    const revisao = screen.getByRole("button", { name: /Revisão/ });
    expect(cliente).toBeEnabled();
    expect(obra).toBeEnabled();
    expect(precos).toBeDisabled(); // atual
    expect(revisao).toBeDisabled(); // futura
    fireEvent.click(obra);
    expect(onGoTo).toHaveBeenCalledWith(2);
    fireEvent.click(revisao);
    expect(onGoTo).toHaveBeenCalledTimes(1);
  });

  it("marca a etapa atual para leitores de tela", () => {
    setup(2);
    expect(screen.getByRole("button", { name: /Obra/ })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: /Cliente/ })).not.toHaveAttribute("aria-current");
  });

  it("botão de voltar", () => {
    const { onBack } = setup(1);
    fireEvent.click(screen.getByRole("button", { name: "Voltar para a lista" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("na primeira etapa nada pode ser reaberto; na última, todas as anteriores podem", () => {
    setup(1);
    screen.getAllByRole("button").filter((b) => b.getAttribute("aria-label") !== "Voltar para a lista").forEach((b) => expect(b).toBeDisabled());
    cleanup();
    setup(4);
    expect(screen.getByRole("button", { name: /Cliente/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Preços/ })).toBeEnabled();
  });
});
