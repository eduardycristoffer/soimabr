import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";

const h = vi.hoisted(() => ({ isAdmin: true, fleet: true, signOut: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Ana Maria Souza", email: "ana@exemplo.com" }, isAdmin: h.isAdmin, signOut: h.signOut }),
}));
vi.mock("@/hooks/useFleetEnabled", () => ({ useFleetEnabled: (on: boolean) => on && h.fleet }));
vi.mock("@/components/layout/InstallAppButton", () => ({ InstallAppButton: () => <button type="button">Instalar app</button> }));
vi.mock("@/components/tour/TourButton", () => ({ TourButton: ({ onBeforeStart }: { onBeforeStart?: () => void }) => <button type="button" onClick={onBeforeStart}>Tour guiado</button> }));

import { BottomNav } from "./BottomNav";
import { MoreSheet } from "./MoreSheet";

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

/** A barra e a gaveta ligadas como no MainLayout. */
function Shell({ path = "/dashboard" }: { path?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter initialEntries={[path]}>
      <BottomNav onOpenMore={() => setOpen(true)} moreOpen={open} />
      <MoreSheet open={open} onOpenChange={setOpen} />
      <Where />
    </MemoryRouter>
  );
}

beforeEach(() => { h.isAdmin = true; h.fleet = true; h.signOut.mockClear(); });
afterEach(cleanup);

describe("barra de baixo (celular)", () => {
  it("4 atalhos principais + Mais, na ordem de uso", () => {
    render(<Shell />);
    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    const labels = within(nav).getAllByRole("listitem").map((li) => li.textContent);
    expect(labels).toEqual(["Dashboard", "Propostas", "Pipeline", "Contratos", "Mais"]);
    expect(within(nav).getByRole("link", { name: "Propostas" })).toHaveAttribute("href", "/orcamentos");
  });

  it("a tela atual fica marcada (aria-current) e dá para entrar em subtelas", () => {
    render(<Shell path="/orcamentos/123" />);
    expect(screen.getByRole("link", { name: "Propostas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("os botões têm área de toque de pelo menos 56 px (h-14)", () => {
    render(<Shell />);
    expect(screen.getByRole("link", { name: "Contratos" })).toHaveClass("h-14");
    expect(screen.getByRole("button", { name: "Mais opções" })).toHaveClass("h-14");
  });

  it("estando numa tela que só existe em 'Mais' (ex.: Relatórios), o Mais fica em destaque", () => {
    render(<Shell path="/relatorios" />);
    expect(screen.getByRole("button", { name: "Mais opções" })).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("text-primary");
  });

  it("tocar em um atalho muda de tela", () => {
    render(<Shell />);
    fireEvent.click(screen.getByRole("link", { name: "Contratos" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/contratos");
  });
});

describe("gaveta Mais (todas as opções)", () => {
  const open = () => fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));

  it("fechada não mostra nada; ao tocar em Mais, sobe com todas as telas", () => {
    render(<Shell />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    open();
    const dialog = screen.getByRole("dialog");
    for (const name of ["Dashboard", "Clientes", "Pipeline", "Propostas", "Contratos", "Relatórios", "Frota", "Usuários", "Auditoria", "Webhooks"]) {
      expect(within(dialog).getByRole("button", { name })).toBeInTheDocument();
    }
    expect(within(dialog).getByText("Administração")).toBeInTheDocument();
  });

  it("usuário comum: só as telas dele, sem a seção de administração", () => {
    h.isAdmin = false;
    render(<Shell />);
    open();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Relatórios" })).toBeInTheDocument();
    expect(within(dialog).queryByText("Administração")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Usuários" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Frota" })).not.toBeInTheDocument();
  });

  it("Frota só aparece com a frota ativada no banco (como no menu do computador)", () => {
    h.fleet = false;
    render(<Shell />);
    open();
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Frota" })).not.toBeInTheDocument();
  });

  it("escolher uma tela vai para ela e fecha a gaveta", () => {
    render(<Shell />);
    open();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Relatórios" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/relatorios");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("perfil, tour, instalar app e sair estão na gaveta", () => {
    render(<Shell />);
    open();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Ana Maria Souza")).toBeInTheDocument();
    expect(within(dialog).getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(within(dialog).getByText("AM")).toBeInTheDocument(); // iniciais
    expect(within(dialog).getByRole("button", { name: "Tour guiado" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Instalar app" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Meu perfil/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/perfil");
  });

  it("Sair desconecta e fecha a gaveta", () => {
    render(<Shell />);
    open();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sair" }));
    expect(h.signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a tela atual aparece marcada dentro da gaveta", () => {
    render(<Shell path="/clientes" />);
    open();
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Clientes" })).toHaveAttribute("aria-current", "page");
  });
});
