import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ saveCost: vi.fn(async (..._a: any[]) => {}) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), saveCost: h.saveCost }));

import { CostFormDialog } from "./CostFormDialog";

const wrap = () => {
  const onClose = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><CostFormDialog open onClose={onClose} unitId="g1" unitCode="GRU-1" /></QueryClientProvider>);
  return { onClose };
};
beforeEach(() => { h.saveCost.mockClear(); });
afterEach(cleanup);

describe("lançar custo ou investimento", () => {
  it("valor obrigatório e maior que zero", async () => {
    wrap();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Informe um valor maior que zero.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Valor (R$) *"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(h.saveCost).not.toHaveBeenCalled();
  });

  it("grava tipo, valor, data e descrição para a grua certa", async () => {
    const { onClose } = wrap();
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "investimento" } });
    fireEvent.change(screen.getByLabelText("Valor (R$) *"), { target: { value: "45.000,00" } });
    fireEvent.change(screen.getByLabelText("Data *"), { target: { value: "2026-05-10" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Reforma do sistema elétrico" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(h.saveCost).toHaveBeenCalledWith({ unit_id: "g1", rental_id: null, kind: "investimento", amount: 45000, incurred_on: "2026-05-10", description: "Reforma do sistema elétrico" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("explica a diferença entre investimento e custo", () => {
    wrap();
    expect(screen.getByText(/soma ao valor empregado/)).toBeInTheDocument();
  });

  it("descrição vazia vai como nula", async () => {
    wrap();
    fireEvent.change(screen.getByLabelText("Valor (R$) *"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(h.saveCost).toHaveBeenCalled());
    expect(h.saveCost.mock.calls[0][0]).toMatchObject({ kind: "manutencao", description: null });
  });
});
