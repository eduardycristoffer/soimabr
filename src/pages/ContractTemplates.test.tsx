import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ContractTemplates from "./ContractTemplates";

const h = vi.hoisted(() => ({ auth: { isAdmin: true, isLoading: false }, types: [] as string[], dirtyOnMount: false }));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
// O editor em si já é testado à parte; aqui só importa como a página o encaixa (abas e proteção ao trocar).
vi.mock("@/components/contract-templates/TemplateWorkspace", async () => {
  const React = await import("react");
  return {
    default: ({ type, onDirtyChange }: { type: string; onDirtyChange?: (d: boolean) => void }) => {
      h.types.push(type);
      return (
        <div data-testid={`ws-${type}`}>
          editor {type}
          <button onClick={() => onDirtyChange?.(true)}>sujar</button>
          <button onClick={() => onDirtyChange?.(false)}>limpar</button>
        </div>
      );
    },
  };
});

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/modelos"]}>
        <Routes>
          <Route path="/modelos" element={<ContractTemplates />} />
          <Route path="/dashboard" element={<div>painel</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const tab = (name: string) => screen.getByRole("tab", { name });
const click = (name: string) => fireEvent.mouseDown(tab(name), { button: 0 });

beforeEach(() => { h.auth = { isAdmin: true, isLoading: false }; h.types = []; });
afterEach(cleanup);

describe("página Modelos de Contrato", () => {
  it("tem as três abas (Venda, Locação, Serviço) e começa em Venda", () => {
    renderPage();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Venda", "Locação", "Serviço"]);
    expect(screen.getByTestId("ws-venda")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Modelos de Contrato" })).toBeInTheDocument();
  });

  it("só o editor da aba aberta existe (não carrega os outros)", () => {
    renderPage();
    expect(screen.queryByTestId("ws-locacao")).not.toBeInTheDocument();
    click("Locação");
    expect(screen.getByTestId("ws-locacao")).toBeInTheDocument();
    expect(screen.queryByTestId("ws-venda")).not.toBeInTheDocument();
    click("Serviço");
    expect(screen.getByTestId("ws-servico")).toBeInTheDocument();
  });

  it("quem não é administrador vai para o painel", () => {
    h.auth = { isAdmin: false, isLoading: false };
    renderPage();
    expect(screen.getByText("painel")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("enquanto carrega o login não mostra nada nem redireciona", () => {
    h.auth = { isAdmin: false, isLoading: true };
    const { container } = renderPage();
    expect(container).toBeEmptyDOMElement();
  });

  it("com alterações não salvas, trocar de aba pergunta; 'Ficar aqui' mantém", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "sujar" }));
    click("Locação");
    expect(screen.getByText("Sair sem salvar?")).toBeInTheDocument();
    expect(screen.getByTestId("ws-venda")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ficar aqui" }));
    expect(screen.queryByText("Sair sem salvar?")).not.toBeInTheDocument();
    expect(tab("Venda")).toHaveAttribute("data-state", "active");
  });

  it("com alterações não salvas, 'Mudar e descartar' troca de aba", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "sujar" }));
    click("Serviço");
    fireEvent.click(screen.getByRole("button", { name: "Mudar e descartar" }));
    await waitFor(() => expect(screen.getByTestId("ws-servico")).toBeInTheDocument());
    expect(tab("Serviço")).toHaveAttribute("data-state", "active");
  });

  it("sem alterações, troca de aba direto", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "sujar" }));
    fireEvent.click(screen.getByRole("button", { name: "limpar" }));
    click("Locação");
    expect(screen.queryByText("Sair sem salvar?")).not.toBeInTheDocument();
    expect(screen.getByTestId("ws-locacao")).toBeInTheDocument();
  });

  it("clicar na aba em que já está não pergunta nada", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "sujar" }));
    click("Venda");
    expect(screen.queryByText("Sair sem salvar?")).not.toBeInTheDocument();
  });
});
