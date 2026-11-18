import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Relatorios from "./Relatorios";

const h = vi.hoisted(() => ({
  closing: false,
  isAdmin: true,
  quotes: [] as any[],
  lastSelect: "",
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { user_id: "u1", name: "Ana" }, isAdmin: h.isAdmin }) }));
vi.mock("@/hooks/useQuoteClosingEnabled", () => ({ useQuoteClosingEnabled: () => h.closing }));
vi.mock("@/integrations/supabase/client", () => {
  const make = (table: string) => {
    const b: any = {
      select: (cols: string) => { if (table === "quotes") h.lastSelect = cols; return b; },
      order: () => b,
      then: (res: any, rej: any) =>
        Promise.resolve({
          data: table === "quotes" ? h.quotes : [{ user_id: "u1", name: "Ana" }, { user_id: "u2", name: "Bruno" }],
          error: null,
        }).then(res, rej),
    };
    return b;
  };
  return { supabase: { from: make } };
});

const now = new Date();
const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10, 15)).toISOString();
const mkQ = (id: string, over: any = {}) => ({
  id, quote_number: `PRO${id}`, status: "finalized", quote_type: "venda", total: 1000, currency: "BRL", usd_brl_rate_used: null,
  created_at: thisMonth, created_by: "u1", clients: { razao_social: "Cliente Um Ltda", nome_fantasia: "Cliente Um" }, contracts: [], ...over,
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Relatorios /></QueryClientProvider>);
}
const openTab = (name: RegExp) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });

beforeEach(() => {
  h.closing = false;
  h.isAdmin = true;
  h.quotes = [
    mkQ("1", { contracts: [{ id: "c1", contract_number: "CTR1", status: "signed", sent_at: thisMonth, signed_at: thisMonth, created_at: thisMonth }] }),
    mkQ("2", { status: "draft", total: 500, created_by: "u2", clients: { razao_social: "Cliente Dois SA", nome_fantasia: null } }),
    mkQ("3", { status: "cancelled", total: 9999 }),
    mkQ("4", { quote_type: "locacao", total: 2000, created_by: "u2" }),
  ];
});
afterEach(cleanup);

describe("página de Relatórios com gráficos", () => {
  it("visão geral: evolução, rosca da situação, rosca do tipo, valor por mês e funil", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Evolução mês a mês")).toBeInTheDocument());
    expect(screen.getByText("Situação das propostas")).toBeInTheDocument();
    expect(screen.getByText("Tipo de proposta")).toBeInTheDocument();
    expect(screen.getByText("Valor das propostas criadas por mês")).toBeInTheDocument();
    expect(screen.getByText("Funil")).toBeInTheDocument();
  });

  it("a rosca da situação conta as propostas certas", async () => {
    renderPage();
    await screen.findByText("Evolução mês a mês"); // espera os dados chegarem (antes disso a rosca aparece vazia)
    const card = (await screen.findByText("Situação das propostas")).closest("[class*='rounded-lg']") as HTMLElement;
    const items = within(card).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Rascunho125%", "Finalizada250%", "Cancelada125%"]);
  });

  it("sem o SQL de fechamento: nada de 'Fechadas' nem 'closed_at' na consulta", async () => {
    renderPage();
    await screen.findByText("Evolução mês a mês");
    expect(screen.queryByText("Fechadas")).not.toBeInTheDocument();
    expect(h.lastSelect).not.toContain("closed_at");
    expect(screen.queryByText("Fechamento confirmado")).not.toBeInTheDocument();
  });

  it("com o SQL de fechamento: consulta traz closed_at, aparece o número 'Fechadas' e a etapa no funil", async () => {
    h.closing = true;
    h.quotes[0].closed_at = thisMonth;
    renderPage();
    await screen.findByText("Evolução mês a mês");
    await waitFor(() => expect(h.lastSelect).toContain("closed_at"));
    expect(screen.getByText("Fechadas")).toBeInTheDocument();
    expect(screen.getByText("Fechamento confirmado")).toBeInTheDocument();
    expect(screen.getByText("Fechamentos confirmados")).toBeInTheDocument(); // legenda do gráfico de evolução
  });

  it("aba Propostas: gráficos primeiro; a lista fica recolhida até pedir", async () => {
    renderPage();
    await screen.findByText("Evolução mês a mês");
    openTab(/^Propostas$/);
    expect(await screen.findByText("Propostas por mês")).toBeInTheDocument();
    expect(screen.getByText("Principais clientes")).toBeInTheDocument();
    expect(screen.queryByText("PRO1")).not.toBeInTheDocument(); // lista recolhida
    fireEvent.click(screen.getByRole("button", { name: /Ver a lista de propostas \(4\)/ }));
    expect(await screen.findByText("PRO1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Esconder a lista de propostas/ })).toBeInTheDocument();
  });

  it("aba Propostas: ranking de clientes soma por cliente e ignora canceladas", async () => {
    renderPage();
    await screen.findByText("Evolução mês a mês");
    openTab(/^Propostas$/);
    const card = (await screen.findByText("Principais clientes")).closest("[class*='rounded-lg']") as HTMLElement;
    const rows = within(card).getAllByRole("listitem").map((li) => li.textContent);
    // Cliente Um: PRO1 (1.000) + PRO4 (2.000), a cancelada (9.999) fica de fora; Cliente Dois: 500
    expect(rows[0]).toContain("Cliente Um");
    expect(rows[0]).toContain("2 propostas");
    expect(rows[1]).toContain("Cliente Dois SA");
  });

  it("aba Contratos: situação em 4 grupos, tempo até assinar e lista recolhida", async () => {
    renderPage();
    await screen.findByText("Evolução mês a mês");
    openTab(/^Contratos$/);
    expect(await screen.findByText("Situação dos contratos")).toBeInTheDocument();
    expect(screen.getByText("Tempo até assinar", { selector: "h3, div" })).toBeInTheDocument();
    expect(screen.getByText("Assinados", { selector: "li *, li" })).toBeInTheDocument();
    expect(screen.queryByText("CTR1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver a lista de contratos \(1\)/ }));
    expect(await screen.findByText("CTR1")).toBeInTheDocument();
  });

  it("aba Vendedores (administrador): valor e conversão por vendedor", async () => {
    renderPage();
    await screen.findByText("Evolução mês a mês");
    openTab(/^Vendedores$/);
    expect(await screen.findByText("Valor em propostas por vendedor")).toBeInTheDocument();
    expect(screen.getByText("Conversão por vendedor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver a tabela de vendedores/ })).toBeInTheDocument();
  });

  it("quem não é administrador não vê a aba Vendedores", async () => {
    h.isAdmin = false;
    renderPage();
    await screen.findByText("Evolução mês a mês");
    expect(screen.queryByRole("tab", { name: /Vendedores/ })).not.toBeInTheDocument();
  });
});
