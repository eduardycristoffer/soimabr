import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DonutChart, HBarList, PALETTE, StackedColumnChart, TrendChart } from "./charts";

afterEach(cleanup);

describe("rosca (donut)", () => {
  const slices = [
    { key: "a", label: "Rascunho", value: 1, color: "#d97706" },
    { key: "b", label: "Finalizada", value: 3, color: "#2563eb" },
    { key: "c", label: "Cancelada", value: 0, color: "#e11d48" },
  ];

  it("total no centro e legenda com quantidade e porcentagem", () => {
    render(<DonutChart title="Situação" slices={slices} centerLabel="propostas" />);
    expect(screen.getByText("propostas")).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Rascunho125%", "Finalizada375%", "Cancelada00%"]);
    // total (4) aparece no centro
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });

  it("leitor de tela recebe o resumo com todos os valores", () => {
    render(<DonutChart title="Situação" slices={slices} centerLabel="propostas" />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Situação. Rascunho: 1; Finalizada: 3; Cancelada: 0.");
  });

  it("sem dados: mensagem em vez de rosca vazia", () => {
    render(<DonutChart title="Situação" slices={slices.map((s) => ({ ...s, value: 0 }))} centerLabel="propostas" empty="Nada por aqui." />);
    expect(screen.getByText("Nada por aqui.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("legenda empilha no celular e fica ao lado em tela larga", () => {
    const { container } = render(<DonutChart title="Situação" slices={slices} centerLabel="propostas" />);
    expect(container.innerHTML).toContain("flex-col");
    expect(container.innerHTML).toContain("sm:flex-row");
  });
});

describe("gráficos por mês", () => {
  const data = [
    { label: "out/26", created: 4, signed: 1 },
    { label: "nov/26", created: 6, signed: 2 },
  ];
  const series = [
    { key: "created", label: "Propostas criadas", color: PALETTE.trend.created },
    { key: "signed", label: "Contratos assinados", color: PALETTE.trend.signed },
  ];

  it("evolução: legenda com todas as séries", () => {
    render(<TrendChart title="Evolução" data={data} series={series} />);
    const legend = screen.getByRole("list", { name: "Legenda" });
    expect(within(legend).getAllByRole("listitem").map((l) => l.textContent)).toEqual(["Propostas criadas", "Contratos assinados"]);
  });

  it("evolução: 'Ver como tabela' mostra os números do mês mais recente primeiro", () => {
    render(<TrendChart title="Evolução" data={data} series={series} />);
    fireEvent.click(screen.getByRole("button", { name: /Ver como tabela|Tabela/ }));
    const rows = screen.getAllByRole("row").slice(1).map((r) => r.textContent);
    expect(rows).toEqual(["nov/26 62".replace(" ", ""), "out/26 41".replace(" ", "")].map((x) => x.replace(/\s/g, "")));
    expect(screen.getByRole("columnheader", { name: "Contratos assinados" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver gráfico|Gráfico/ }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("colunas empilhadas: legenda e tabela", () => {
    render(<StackedColumnChart title="Por situação" data={[{ label: "nov/26", a: 1, b: 2 }]} series={[{ key: "a", label: "Rascunho", color: "#d97706" }, { key: "b", label: "Finalizada", color: "#2563eb" }]} />);
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver como tabela|Tabela/ }));
    expect(screen.getAllByRole("row")[1].textContent).toBe("nov/2612");
  });
});

describe("barras de ranking", () => {
  it("vazio mostra a mensagem", () => {
    render(<HBarList title="Principais clientes" items={[]} empty="Sem clientes." />);
    expect(screen.getByText("Sem clientes.")).toBeInTheDocument();
  });
});

describe("paleta dos gráficos", () => {
  it("cada grupo usa cores diferentes entre si (nunca duas fatias iguais)", () => {
    for (const group of Object.values(PALETTE)) {
      const colors = Object.values(group);
      expect(new Set(colors).size).toBe(colors.length);
    }
  });

  it("as cores seguem a paleta validada (claro e escuro)", () => {
    expect(PALETTE.status).toEqual({ draft: "#d97706", finalized: "#2563eb", cancelled: "#e11d48" });
    expect(PALETTE.type).toEqual({ venda: "#2563eb", locacao: "#ea580c", servico: "#0d9488" });
    // ordem: assinado → aguardando → em preparo → cancelado (verde e rosa não ficam vizinhos)
    expect(Object.keys(PALETTE.contract)).toEqual(["signed", "sent", "preparing", "cancelled"]);
  });
});
