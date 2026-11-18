import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { fleetData, rental, unit } from "@/test/fleetFixtures";

const h = vi.hoisted(() => ({
  auth: { isAdmin: true, isLoading: false },
  status: "ready" as "loading" | "ready" | "missing",
  q: { data: undefined as any, isLoading: false, error: null as any },
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/hooks/useFleetEnabled", () => ({ useFleetStatus: () => h.status, useFleetEnabled: () => h.status === "ready" }));
vi.mock("@/hooks/useFleet", async (orig) => ({ ...(await orig<typeof import("@/hooks/useFleet")>()), useFleetData: () => h.q }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), fetchRentalContracts: async () => [] }));

import Frota from "./Frota";

function renderPage(url = "/frota") {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/frota" element={<Frota />} />
          <Route path="/dashboard" element={<div>painel</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const withData = () => fleetData({ units: [unit("g1"), unit("g2")], rentals: [rental("g1", "2026-01-01", "2027-12-31", { site_name: "Obra Alfa" })] });

beforeEach(() => {
  h.auth = { isAdmin: true, isLoading: false };
  h.status = "ready";
  h.q = { data: withData(), isLoading: false, error: null };
});
afterEach(cleanup);

describe("página Frota", () => {
  it("quem não é administrador vai para o painel; enquanto carrega o login não mostra nada", () => {
    h.auth = { isAdmin: false, isLoading: false };
    renderPage();
    expect(screen.getByText("painel")).toBeInTheDocument();
    cleanup();
    h.auth = { isAdmin: false, isLoading: true };
    const { container } = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Frota /></MemoryRouter></QueryClientProvider>);
    expect(container).toBeEmptyDOMElement();
  });

  it("banco ainda sem as tabelas: explica o que falta, com o nome do arquivo, e não mostra abas", () => {
    h.status = "missing";
    h.q = { data: undefined, isLoading: false, error: null };
    renderPage();
    expect(screen.getByText("A gestão de frota ainda não foi ativada no banco de dados.")).toBeInTheDocument();
    expect(screen.getByText("supabase/manual/2026-11-21_fleet.sql")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nova grua/ })).not.toBeInTheDocument();
  });

  it("carregando: só o esqueleto", () => {
    h.status = "loading";
    h.q = { data: undefined, isLoading: true, error: null };
    renderPage();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("Frota de gruas")).toBeInTheDocument();
  });

  it("erro ao carregar: mensagem", () => {
    h.q = { data: undefined, isLoading: false, error: { message: "sem rede" } };
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a frota. sem rede");
  });

  it("sem nenhuma grua: ensina o caminho e abre o cadastro", async () => {
    h.q = { data: fleetData(), isLoading: false, error: null };
    renderPage();
    expect(screen.getByText("Comece cadastrando as gruas da sua frota.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alocar grua a uma obra/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Cadastrar a primeira grua/ }));
    expect(await screen.findByText("Nova grua", { selector: "h2" })).toBeInTheDocument();
  });

  it("com dados: três abas, começa no panorama", () => {
    renderPage();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Panorama", "Gruas", "Locações"]);
    expect(screen.getByRole("tab", { name: "Panorama" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "Números da frota" })).toBeInTheDocument();
  });

  it("a aba vem do endereço (?aba=) e trocar de aba funciona", () => {
    renderPage("/frota?aba=locacoes");
    expect(screen.getByRole("tab", { name: "Locações" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("list", { name: "Locações" })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Gruas" }), { button: 0 });
    expect(screen.getByRole("tab", { name: "Gruas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("list", { name: "Gruas" })).toBeInTheDocument();
  });

  it("aba desconhecida no endereço cai no panorama", () => {
    renderPage("/frota?aba=xyz");
    expect(screen.getByRole("tab", { name: "Panorama" })).toHaveAttribute("aria-selected", "true");
  });

  it("botões de ação: nova grua e alocar grua abrem os formulários", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Alocar grua a uma obra/ }));
    expect(await screen.findByText("Alocar grua a uma obra", { selector: "h2" })).toBeInTheDocument();
  });
});
