import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { crane, unit } from "@/test/fleetFixtures";

const h = vi.hoisted(() => ({ saveUnit: vi.fn(async (u: any) => ({ ...u, id: u.id ?? "new" })) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), saveUnit: h.saveUnit }));

import { UnitFormDialog } from "./UnitFormDialog";

const catalog = [crane("gt45", { nome: "Grua torre 45", default_lanca_m: 45, default_altura_torre_m: 27, default_carga_maxima_kg: 2500, default_carga_ponta_kg: 1000 })];
const wrap = (props: Partial<React.ComponentProps<typeof UnitFormDialog>> = {}) => {
  const onClose = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><UnitFormDialog open onClose={onClose} catalog={catalog} existingCodes={["GRU-001", "GRU-002"]} {...props} /></QueryClientProvider>);
  return { onClose };
};

beforeEach(() => { h.saveUnit.mockClear(); });
afterEach(cleanup);

describe("cadastrar grua", () => {
  it("código é obrigatório", async () => {
    wrap();
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar grua" }));
    expect(await screen.findByText("Informe o código da grua (ex.: GRU-045).")).toBeInTheDocument();
    expect(h.saveUnit).not.toHaveBeenCalled();
  });

  it("código repetido (sem diferenciar maiúsculas) é recusado antes de ir ao banco", async () => {
    wrap();
    fireEvent.change(screen.getByLabelText("Código / patrimônio *"), { target: { value: "gru-001" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar grua" }));
    expect(await screen.findByText("Já existe uma grua com esse código.")).toBeInTheDocument();
    expect(h.saveUnit).not.toHaveBeenCalled();
  });

  it("escolher o modelo do catálogo preenche as medidas vazias, mas não apaga o que já foi digitado", () => {
    wrap();
    fireEvent.change(screen.getByLabelText("Lança (m)"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Modelo do catálogo"), { target: { value: "gt45" } });
    expect((screen.getByLabelText("Lança (m)") as HTMLInputElement).value).toBe("50");
    expect((screen.getByLabelText("Altura (m)") as HTMLInputElement).value).toBe("27");
    expect((screen.getByLabelText("Carga máx. (kg)") as HTMLInputElement).value).toBe("2500");
  });

  it("grava com números de verdade e valor de compra no formato brasileiro", async () => {
    const { onClose } = wrap();
    fireEvent.change(screen.getByLabelText("Código / patrimônio *"), { target: { value: "GRU-045" } });
    fireEvent.change(screen.getByLabelText("Modelo do catálogo"), { target: { value: "gt45" } });
    fireEvent.change(screen.getByLabelText("Valor de compra (R$)"), { target: { value: "1.250.000,00" } });
    fireEvent.change(screen.getByLabelText("Data da compra"), { target: { value: "2025-03-10" } });
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: "2019" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar grua" }));
    await waitFor(() => expect(h.saveUnit).toHaveBeenCalledTimes(1));
    expect(h.saveUnit.mock.calls[0][0]).toMatchObject({
      id: undefined, code: "GRU-045", product_id: "gt45", lanca_m: 45, altura_torre_m: 27, carga_maxima_kg: 2500, carga_ponta_kg: 1000,
      acquisition_cost: 1250000, acquisition_date: "2025-03-10", year_manufactured: 2019, status: "active",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("número inválido e ano fora do possível bloqueiam", async () => {
    wrap();
    fireEvent.change(screen.getByLabelText("Código / patrimônio *"), { target: { value: "GRU-9" } });
    fireEvent.change(screen.getByLabelText("Lança (m)"), { target: { value: "abc" } });
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: "1800" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar grua" }));
    expect(await screen.findByText("Ano inválido.")).toBeInTheDocument();
    expect(screen.getAllByText("Número inválido.").length).toBe(1);
    expect(h.saveUnit).not.toHaveBeenCalled();
  });

  it("editar: abre com os dados, o próprio código não conta como repetido, e mantém o id", async () => {
    const u = unit("g1", { code: "GRU-001", acquisition_cost: 900000, status: "maintenance" });
    wrap({ unit: u });
    expect(screen.getByText("Editar GRU-001")).toBeInTheDocument();
    expect((screen.getByLabelText("Valor de compra (R$)") as HTMLInputElement).value).toBe("900000");
    expect((screen.getByLabelText("Situação") as HTMLSelectElement).value).toBe("maintenance");
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(h.saveUnit).toHaveBeenCalled());
    expect(h.saveUnit.mock.calls[0][0]).toMatchObject({ id: "g1", code: "GRU-001", acquisition_cost: 900000, status: "maintenance" });
  });

  it("campos vazios viram nulos (nunca texto vazio no banco)", async () => {
    wrap();
    fireEvent.change(screen.getByLabelText("Código / patrimônio *"), { target: { value: "GRU-7" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar grua" }));
    await waitFor(() => expect(h.saveUnit).toHaveBeenCalled());
    expect(h.saveUnit.mock.calls[0][0]).toMatchObject({ model_name: null, serial_number: null, year_manufactured: null, lanca_m: null, acquisition_cost: 0, acquisition_date: null, location_note: null, notes: null, product_id: null });
  });
});
