import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({ isAdmin: true, fleet: true, fleetCalls: [] as any[] }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { name: "Ana" }, isAdmin: h.isAdmin, signOut: vi.fn() }) }));
vi.mock("@/hooks/useFleetEnabled", () => ({ useFleetEnabled: (on: boolean) => { h.fleetCalls.push(on); return on && h.fleet; } }));
vi.mock("@/components/layout/InstallAppButton", () => ({ InstallAppButton: () => null }));
vi.mock("@/components/tour/TourButton", () => ({ TourButton: () => null }));

import { Sidebar } from "./Sidebar";

const renderSidebar = () => render(<MemoryRouter><Sidebar /></MemoryRouter>);
// O ambiente de teste (Node 26 + jsdom) não tem localStorage; o menu guarda se está recolhido.
const memory = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null, length: 0 };
beforeEach(() => {
  h.isAdmin = true; h.fleet = true; h.fleetCalls = [];
  Object.defineProperty(window, "localStorage", { value: memory, configurable: true });
});
afterEach(cleanup);

describe("menu: Frota", () => {
  it("administrador com a frota ativada vê 'Frota', entre Relatórios e os itens de administração", () => {
    renderSidebar();
    const links = screen.getAllByRole("link").map((a) => a.textContent);
    expect(links).toContain("Frota");
    expect(links.indexOf("Frota")).toBe(links.indexOf("Relatórios") + 1);
    expect(screen.getByRole("link", { name: "Frota" })).toHaveAttribute("href", "/frota");
  });

  it("frota ainda não ativada no banco: o item não aparece (o menu fica como era)", () => {
    h.fleet = false;
    renderSidebar();
    expect(screen.queryByRole("link", { name: "Frota" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Relatórios" })).toBeInTheDocument();
  });

  it("quem não é administrador nunca vê, e nem consulta o banco", () => {
    h.isAdmin = false;
    renderSidebar();
    expect(screen.queryByRole("link", { name: "Frota" })).not.toBeInTheDocument();
    expect(h.fleetCalls.every((x) => x === false)).toBe(true);
  });
});
