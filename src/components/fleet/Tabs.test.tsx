import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { fleetData, rental, unit, TODAY } from "@/test/fleetFixtures";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), fetchRentalContracts: async () => [] }));

import { RentalsTab } from "./RentalsTab";
import { UnitsTab } from "./UnitsTab";

afterEach(cleanup);
const wrap = (ui: React.ReactNode) => render(<MemoryRouter><QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider></MemoryRouter>);
const nb = (s: string | null) => (s ?? "").replace(/ /g, " ");

const data = fleetData({
  units: [
    unit("g1", { model_name: "Grua A", acquisition_cost: 500_000 }),
    unit("g2", { acquisition_cost: 600_000 }),
    unit("g3", { acquisition_cost: 400_000, status: "maintenance", location_note: "Oficina central" }),
    unit("g4", { acquisition_cost: 300_000, acquisition_date: "2026-06-01" }),
  ],
  rentals: [
    rental("g1", "2026-01-01", "2026-12-31", { site_name: "Obra Alfa", client_id: "k1", clients: { razao_social: "Alfa SA", nome_fantasia: null } }),
    rental("g2", "2026-01-01", "2026-06-10", { site_name: "Obra Beta", client_id: "k2", clients: { razao_social: "Beta Ltda", nome_fantasia: null } }), // atrasada
    rental("g2", "2026-06-20", "2026-12-20", { site_name: "Obra Gama", client_id: "k3", clients: { razao_social: "Gama Ltda", nome_fantasia: null } }), // esperando
    rental("g1", "2025-01-01", "2025-06-30", { site_name: "Obra Antiga", actual_end_date: "2025-06-30" }),
  ],
});

describe("aba Gruas", () => {
  it("um cartão por grua com situação, e quem está esperando é destacado", () => {
    wrap(<UnitsTab data={data} today={TODAY} />);
    const cards = screen.getAllByRole("link");
    expect(cards).toHaveLength(4);
    expect(nb(screen.getByText("G2").closest("a")!.textContent)).toContain("Em obra");
    expect(screen.getByText(/Cliente esperando desde 20\/06/)).toBeInTheDocument();
    expect(nb(screen.getByText("G3").closest("a")!.textContent)).toContain("Em manutenção · Oficina central");
    expect(nb(screen.getByText("G4").closest("a")!.textContent)).toContain("Livre há 14 dias");
  });

  it("filtro por situação com contagem, e some a opção sem nenhuma grua", () => {
    wrap(<UnitsTab data={data} today={TODAY} />);
    const filters = screen.getByRole("group", { name: "Filtrar por situação" });
    expect(within(filters).getByRole("button", { name: /Todas/ }).textContent).toContain("4");
    expect(within(filters).queryByRole("button", { name: /Baixada/ })).not.toBeInTheDocument();
    fireEvent.click(within(filters).getByRole("button", { name: /Em obra/ }));
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/frota/gruas/g1", "/frota/gruas/g2"]);
    fireEvent.click(within(filters).getByRole("button", { name: /Disponível/ }));
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("busca por grua, obra ou cliente", () => {
    wrap(<UnitsTab data={data} today={TODAY} />);
    fireEvent.change(screen.getByLabelText("Buscar grua, obra ou cliente"), { target: { value: "beta" } });
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("G2")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar grua, obra ou cliente"), { target: { value: "nada disso" } });
    expect(screen.getByText("Nenhuma grua encontrada.")).toBeInTheDocument();
  });

  it("mostra valor empregado, rentabilidade e utilização", () => {
    wrap(<UnitsTab data={data} today={TODAY} />);
    const card = nb(screen.getByText("G1").closest("a")!.textContent);
    expect(card).toContain("Valor empregadoR$ 500 mil");
    expect(card).toContain("Rentabilidade");
    expect(card).toContain("Utilização");
  });
});

describe("aba Locações", () => {
  it("começa em 'Em andamento', com as contagens por filtro e quem vence primeiro no topo", () => {
    wrap(<RentalsTab data={data} today={TODAY} />);
    const filters = screen.getByRole("group", { name: "Filtrar locações" });
    const count = (name: RegExp) => within(filters).getByRole("button", { name }).textContent;
    expect(count(/Em andamento/)).toContain("2");
    expect(count(/Agendadas/)).toContain("1");
    expect(count(/Encerradas/)).toContain("1");
    expect(count(/Todas/)).toContain("4");
    const titles = within(screen.getByRole("list", { name: "Locações" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(titles[0]).toContain("Obra Beta"); // atrasada (prazo mais antigo) primeiro
    expect(titles[1]).toContain("Obra Alfa");
    expect(titles).toHaveLength(2);
  });

  it("agendadas e encerradas", () => {
    wrap(<RentalsTab data={data} today={TODAY} />);
    fireEvent.click(screen.getByRole("button", { name: /Agendadas/ }));
    expect(screen.getByText(/Obra Gama/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Encerradas/ }));
    expect(screen.getByText(/Obra Antiga/)).toBeInTheDocument();
    expect(screen.queryByText(/Obra Alfa/)).not.toBeInTheDocument();
  });

  it("'Todas' ordena em andamento, agendadas e encerradas", () => {
    wrap(<RentalsTab data={data} today={TODAY} />);
    fireEvent.click(screen.getByRole("button", { name: /Todas/ }));
    const order = within(screen.getByRole("list", { name: "Locações" })).getAllByRole("listitem").map((li) => ["Obra Alfa", "Obra Beta", "Obra Gama", "Obra Antiga"].find((n) => (li.textContent ?? "").includes(n)));
    expect(order).toEqual(["Obra Beta", "Obra Alfa", "Obra Gama", "Obra Antiga"]);
  });

  it("busca por obra, cliente ou grua; mensagem quando não acha", () => {
    wrap(<RentalsTab data={data} today={TODAY} />);
    fireEvent.change(screen.getByLabelText("Buscar obra, cliente ou grua"), { target: { value: "alfa" } });
    expect(within(screen.getByRole("list", { name: "Locações" })).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Buscar obra, cliente ou grua"), { target: { value: "zzz" } });
    expect(screen.getByText("Nenhuma locação encontrada.")).toBeInTheDocument();
  });

  it("sem nada em andamento: mensagem própria", () => {
    wrap(<RentalsTab data={fleetData({ units: [unit("g1")] })} today={TODAY} />);
    expect(screen.getByText("Nenhuma grua em obra no momento.")).toBeInTheDocument();
  });
});
