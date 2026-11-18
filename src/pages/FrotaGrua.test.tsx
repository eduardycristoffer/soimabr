import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { cost, fleetData, rental, unit } from "@/test/fleetFixtures";

const h = vi.hoisted(() => ({
  auth: { isAdmin: true, isLoading: false },
  status: "ready" as "loading" | "ready" | "missing",
  q: { data: undefined as any, isLoading: false, error: null as any },
  deleteCost: vi.fn(async (..._a: any[]) => {}),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/hooks/useFleetEnabled", () => ({ useFleetStatus: () => h.status, useFleetEnabled: () => h.status === "ready" }));
vi.mock("@/hooks/useFleet", async (orig) => ({ ...(await orig<typeof import("@/hooks/useFleet")>()), useFleetData: () => h.q }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), deleteCost: h.deleteCost, fetchRentalContracts: async () => [] }));
// "hoje" fixo: a página usa a data do dia
vi.mock("@/lib/fleet", async (orig) => ({ ...(await orig<typeof import("@/lib/fleet")>()), todayISO: () => "2026-06-15" }));

import FrotaGrua from "./FrotaGrua";

const nb = (s: string | null) => (s ?? "").replace(/ /g, " ");
function renderPage(id = "g1") {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/frota/gruas/${id}`]}>
        <Routes>
          <Route path="/frota/gruas/:id" element={<FrotaGrua />} />
          <Route path="/frota" element={<div>lista da frota</div>} />
          <Route path="/dashboard" element={<div>painel</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const base = () =>
  fleetData({
    units: [unit("g1", { model_name: "Grua torre 45", serial_number: "SN-1", year_manufactured: 2019, acquisition_cost: 1_000_000, acquisition_date: "2025-06-15" }), unit("g2", { status: "retired" })],
    rentals: [rental("g1", "2026-01-01", "2026-12-31", { site_name: "Edifício Aurora", monthly_value: 25000, client_id: "k1", clients: { razao_social: "Alfa SA", nome_fantasia: null } })],
    costs: [cost("g1", "investimento", 100_000, "2025-08-01"), cost("g1", "manutencao", 20_000, "2026-02-01")],
  });

beforeEach(() => {
  h.auth = { isAdmin: true, isLoading: false };
  h.status = "ready";
  h.q = { data: base(), isLoading: false, error: null };
  h.deleteCost.mockClear();
});
afterEach(cleanup);

describe("página da grua", () => {
  it("quem não é administrador vai para o painel; frota não ativada volta para /frota", () => {
    h.auth = { isAdmin: false, isLoading: false };
    renderPage();
    expect(screen.getByText("painel")).toBeInTheDocument();
    cleanup();
    h.auth = { isAdmin: true, isLoading: false };
    h.status = "missing";
    renderPage();
    expect(screen.getByText("lista da frota")).toBeInTheDocument();
  });

  it("grua inexistente: aviso com volta para a frota", () => {
    renderPage("zzz");
    expect(screen.getByText("Grua não encontrada.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Frota/ })).toHaveAttribute("href", "/frota");
  });

  it("cabeçalho: código, situação, modelo, série, ano e especificação", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "G1" })).toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "G1" }).parentElement!).getByText("Em obra")).toBeInTheDocument();
    expect(screen.getByText("Grua torre 45 · nº de série SN-1 · ano 2019")).toBeInTheDocument();
    expect(screen.getByText(/Lança 50 m · Altura 40 m/)).toBeInTheDocument();
  });

  it("'Em obra agora' com a obra, o cliente e o prazo", () => {
    renderPage();
    const card = screen.getByText("Em obra agora").closest("[class*='rounded-lg']") as HTMLElement;
    expect(card.textContent).toContain("Edifício Aurora · Alfa SA");
    expect(within(card).getByRole("progressbar")).toBeInTheDocument();
  });

  it("números: valor empregado (compra + investimento), custos, resultado, ROI e utilização", () => {
    renderPage();
    const kpis = nb(screen.getByRole("region", { name: "Números da grua" }).textContent);
    expect(kpis).toContain("Valor empregadoR$ 1,1 mi");
    expect(kpis).toContain("compra R$ 1 mi + R$ 100 mil investidos");
    expect(kpis).toContain("Custos de operaçãoR$ 20 mil");
    expect(kpis).toContain("Rentabilidade (ROI)");
    expect(kpis).toContain("Rendimento mensal2,27%");
    expect(kpis).toMatch(/Utilização \(12 meses\)\d+%/);
  });

  it("custos e investimentos listados do mais novo para o mais antigo; remover chama a ação", async () => {
    renderPage();
    const list = screen.getByRole("list", { name: "Custos e investimentos" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0].textContent).toContain("Manutenção");
    expect(rows[1].textContent).toContain("Investimento");
    fireEvent.click(within(rows[0]).getByRole("button", { name: /Remover lançamento/ }));
    await waitFor(() => expect(h.deleteCost).toHaveBeenCalledTimes(1));
    expect(h.deleteCost.mock.calls[0][0]).toBe(h.q.data.costs.find((c: any) => c.kind === "manutencao").id);
  });

  it("sem lançamentos: orienta", () => {
    h.q = { data: { ...base(), costs: [] }, isLoading: false, error: null };
    renderPage();
    expect(screen.getByText(/Nenhum lançamento/)).toBeInTheDocument();
  });

  it("grua baixada não pode receber nova locação", () => {
    renderPage("g2");
    expect(screen.getByRole("button", { name: /Alocar a uma obra/ })).toBeDisabled();
    expect(screen.getByText("Baixada")).toBeInTheDocument();
  });

  it("botões abrem editar, lançar custo e alocar", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    expect(await screen.findByText("Editar G1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByText("Editar G1")).not.toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /Lançar/ })[0]);
    expect(await screen.findByText(/Lançar custo ou investimento — G1/)).toBeInTheDocument();
  });

  it("locações desta grua aparecem sem repetir o nome da grua", () => {
    renderPage();
    const list = screen.getByRole("list", { name: "Locações" });
    expect(within(list).queryByRole("link", { name: /G1/ })).not.toBeInTheDocument();
    expect(list.textContent).toContain("Edifício Aurora");
  });
});
