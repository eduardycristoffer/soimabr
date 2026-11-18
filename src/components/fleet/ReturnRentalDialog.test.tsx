import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { rental, TODAY } from "@/test/fleetFixtures";

const h = vi.hoisted(() => ({ finishRental: vi.fn(async (..._a: any[]) => {}), extendRental: vi.fn(async (..._a: any[]) => {}) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), finishRental: h.finishRental, extendRental: h.extendRental }));

import { ExtendRentalDialog, ReturnRentalDialog } from "./ReturnRentalDialog";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const r = rental("g1", "2026-01-01", "2026-12-31", { monthly_value: 10000, mobilization_value: 3000, demobilization_value: 2000 });

beforeEach(() => { h.finishRental.mockClear(); h.extendRental.mockClear(); });
afterEach(cleanup);

describe("registrar devolução", () => {
  it("começa em hoje, mostra a diferença do prazo e a receita final", () => {
    wrap(<ReturnRentalDialog open onClose={() => {}} rental={r} unitCode="GRU-1" today={TODAY} />);
    expect((screen.getByLabelText("Data da devolução *") as HTMLInputElement).value).toBe(TODAY);
    expect(screen.getByText(/Devolvida/).textContent).toContain("199 dias antes");
    // 5,5 meses × 10.000 + 3.000 + 2.000 = 60.000
    expect(screen.getByText(/Receita final desta locação/).textContent).toMatch(/60\.000,00/);
    expect(screen.getByText(/previsto: R\$\s125\.000,00/)).toBeInTheDocument();
  });

  it("devolução depois do prazo diz quantos dias a mais", () => {
    wrap(<ReturnRentalDialog open onClose={() => {}} rental={rental("g1", "2026-01-01", "2026-06-10")} unitCode="GRU-1" today={TODAY} />);
    expect(screen.getByText(/Devolvida/).textContent).toContain("5 dias depois");
  });

  it("grava a data e a desmobilização e fecha", async () => {
    const onClose = vi.fn();
    wrap(<ReturnRentalDialog open onClose={onClose} rental={r} unitCode="GRU-1" today={TODAY} />);
    fireEvent.change(screen.getByLabelText("Data da devolução *"), { target: { value: "2026-06-10" } });
    fireEvent.change(screen.getByLabelText("Desmobilização cobrada (R$)"), { target: { value: "2.500,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar devolução" }));
    await waitFor(() => expect(h.finishRental).toHaveBeenCalledWith(r.id, "2026-06-10", 2500));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("data antes do início não deixa registrar", () => {
    wrap(<ReturnRentalDialog open onClose={() => {}} rental={r} unitCode="GRU-1" today={TODAY} />);
    fireEvent.change(screen.getByLabelText("Data da devolução *"), { target: { value: "2025-12-31" } });
    expect(screen.getByText("A devolução não pode ser antes do início da locação.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar devolução" })).toBeDisabled();
  });

  it("desmobilização ilegível bloqueia", () => {
    wrap(<ReturnRentalDialog open onClose={() => {}} rental={r} unitCode="GRU-1" today={TODAY} />);
    fireEvent.change(screen.getByLabelText("Desmobilização cobrada (R$)"), { target: { value: "abc" } });
    expect(screen.getByText("Valor inválido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar devolução" })).toBeDisabled();
  });
});

describe("prorrogar locação", () => {
  it("mostra quantos dias entram e quanto sobe o valor previsto", () => {
    wrap(<ExtendRentalDialog open onClose={() => {}} rental={rental("g1", "2026-01-01", "2026-06-30", { monthly_value: 10000 })} unitCode="GRU-1" />);
    fireEvent.change(screen.getByLabelText("Novo término previsto *"), { target: { value: "2026-07-31" } });
    expect(screen.getByText(/Mais/).textContent).toContain("31 dias");
    expect(screen.getByText(/Valor previsto: \+/).textContent).toMatch(/R\$\s10\.000,00/); // exatamente 1 mês: 30/06 → 31/07
  });

  it("sem mudar a data o botão fica desligado; salvar manda o novo prazo", async () => {
    const onClose = vi.fn();
    const x = rental("g1", "2026-01-01", "2026-06-30");
    wrap(<ExtendRentalDialog open onClose={onClose} rental={x} unitCode="GRU-1" />);
    expect(screen.getByRole("button", { name: "Salvar novo prazo" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Novo término previsto *"), { target: { value: "2026-09-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar novo prazo" }));
    await waitFor(() => expect(h.extendRental).toHaveBeenCalledWith(x.id, "2026-09-30"));
  });

  it("encurtar também é permitido e diz isso; antes do início não", () => {
    wrap(<ExtendRentalDialog open onClose={() => {}} rental={rental("g1", "2026-01-01", "2026-06-30")} unitCode="GRU-1" />);
    fireEvent.change(screen.getByLabelText("Novo término previsto *"), { target: { value: "2026-06-20" } });
    const note = screen.getByText(/mais curto/);
    expect(note.textContent).toContain("10 dias");
    fireEvent.change(screen.getByLabelText("Novo término previsto *"), { target: { value: "2025-12-01" } });
    expect(screen.getByText("A data não pode ser antes do início.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar novo prazo" })).toBeDisabled();
  });
});
