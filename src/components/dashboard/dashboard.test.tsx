import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StatsCardsView } from "./StatsCards";
import { PipelineChartView } from "./PipelineChart";
import { RecentQuotesView } from "./RecentQuotes";
import { DashboardView } from "@/pages/Dashboard";

afterEach(cleanup);

describe("números do painel", () => {
  it("mostra os quatro números", () => {
    render(<StatsCardsView stats={{ clients: 128, leads: 28, quotes: 14, conversionRate: 37 }} />);
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("37%")).toBeInTheDocument();
    ["Clientes", "Leads", "Propostas", "Conversão"].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  });

  it("antes de carregar mostra zeros, sem quebrar", () => {
    render(<StatsCardsView />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBe(3);
  });

  it("2 colunas no celular e 4 em tela larga (classes responsivas)", () => {
    const { container } = render(<StatsCardsView />);
    const grid = container.firstElementChild!;
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("lg:grid-cols-4");
  });
});

describe("pipeline de vendas", () => {
  const data = [
    { name: "Novo lead", count: 12, color: "#3b82f6" },
    { name: "Negociação", count: 3, color: "#10b981" },
    { name: "Fechado", count: 0, color: "#64748b" },
  ];

  it("uma linha por etapa, com o nome e a quantidade", () => {
    render(<PipelineChartView data={data} />);
    const rows = within(screen.getByRole("list", { name: /Leads por etapa/ })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual(["Novo lead12", "Negociação3", "Fechado0"]);
    expect(screen.getByText("15 leads por etapa do funil")).toBeInTheDocument();
  });

  it("largura da barra proporcional; zero fica vazio; valor pequeno continua visível", () => {
    const { container } = render(<PipelineChartView data={[...data, { name: "Quase", count: 1, color: "#000" }]} />);
    const widths = [...container.querySelectorAll("li [style]")].map((el) => (el as HTMLElement).style.width);
    expect(widths).toEqual(["100%", "25%", "0%", "8.333333333333332%"]);
    // 1 em 12 = 8,3% (acima do mínimo de 4%)
  });

  it("sem leads: mensagem amigável em vez de gráfico vazio", () => {
    render(<PipelineChartView data={data.map((d) => ({ ...d, count: 0 }))} />);
    expect(screen.getByText(/Adicione leads ao pipeline/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("ainda carregando (sem dados): também mostra a mensagem", () => {
    render(<PipelineChartView />);
    expect(screen.getByText(/Adicione leads ao pipeline/)).toBeInTheDocument();
  });

  it("singular e plural", () => {
    render(<PipelineChartView data={[{ name: "A", count: 1, color: "#000" }]} />);
    expect(screen.getByText("1 lead por etapa do funil")).toBeInTheDocument();
  });
});

describe("propostas recentes", () => {
  const long = "Construtora e Incorporadora Exemplo de Nome Muito Longo para Testar o Corte Ltda";
  const quotes = [
    { id: "1", quote_number: "PRO1", status: "finalized", total: 570120, currency: "BRL", clients: { nome_fantasia: "Santos", razao_social: "Santos LTDA" } },
    { id: "2", quote_number: "PRO2", status: "draft", total: 1000, currency: "BRL", clients: { razao_social: long } },
    { id: "3", quote_number: "PRO3", status: "cancelled", total: 5, currency: "BRL", clients: null },
  ];

  it("cliente (nome fantasia primeiro), valor e situação", () => {
    render(<RecentQuotesView quotes={quotes} />);
    expect(screen.getByText("Santos")).toBeInTheDocument();
    expect(screen.getByText(/570\.120,00/)).toBeInTheDocument();
    expect(screen.getByText("Finalizado")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument(); // sem cliente
  });

  it("nome longo é cortado com reticências (não empurra o valor para fora)", () => {
    render(<RecentQuotesView quotes={quotes} />);
    const name = screen.getByText(long);
    expect(name.className).toContain("truncate");
    expect(name.parentElement!.className).toContain("min-w-0");
  });

  it("valor nunca quebra em duas linhas", () => {
    render(<RecentQuotesView quotes={quotes} />);
    expect(screen.getByText(/570\.120,00/).className).toContain("whitespace-nowrap");
  });

  it("sem propostas", () => {
    render(<RecentQuotesView quotes={[]} />);
    expect(screen.getByText("Nenhuma proposta ainda")).toBeInTheDocument();
    cleanup();
    render(<RecentQuotesView quotes={null} />);
    expect(screen.getByText("Nenhuma proposta ainda")).toBeInTheDocument();
  });
});

describe("painel inicial", () => {
  const slots = { stats: <div>S</div>, pipeline: <div>P</div>, recent: <div>R</div> };

  it("boas-vindas, blocos e atalhos", () => {
    render(<DashboardView name="Ana" isAdmin onNavigate={() => {}} slots={slots} />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText(/Bem-vindo, Ana!/)).toBeInTheDocument();
    expect(screen.getByText(/\(Admin\)/)).toBeInTheDocument();
    ["S", "P", "R"].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  });

  it("não-administrador não vê '(Admin)'", () => {
    render(<DashboardView name="Ana" onNavigate={() => {}} slots={slots} />);
    expect(screen.queryByText(/\(Admin\)/)).not.toBeInTheDocument();
  });

  it("atalhos levam às telas certas", () => {
    const go = vi.fn();
    render(<DashboardView name="Ana" onNavigate={go} slots={slots} />);
    fireEvent.click(screen.getByRole("button", { name: /Novo cliente/ }));
    fireEvent.click(screen.getByRole("button", { name: /Novo lead/ }));
    fireEvent.click(screen.getByRole("button", { name: /Nova proposta/ }));
    expect(go.mock.calls.map((c) => c[0])).toEqual(["/clientes", "/pipeline", "/orcamentos"]);
  });

  it("gráfico e propostas lado a lado só em tela extra larga; atalhos empilhados no celular", () => {
    const { container } = render(<DashboardView name="Ana" onNavigate={() => {}} slots={slots} />);
    expect(container.innerHTML).toContain("xl:grid-cols-2");
    expect(container.innerHTML).toContain("sm:grid-cols-3");
  });
});
