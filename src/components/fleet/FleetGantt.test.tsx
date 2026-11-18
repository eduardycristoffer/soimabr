import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FleetGantt } from "./FleetGantt";
import { rental, unit, TODAY } from "@/test/fleetFixtures";

afterEach(cleanup);
const renderG = (props: Partial<React.ComponentProps<typeof FleetGantt>> = {}) =>
  render(<MemoryRouter><FleetGantt units={[unit("g1"), unit("g2"), unit("g3", { status: "retired" })]} rentals={[]} today={TODAY} {...props} /></MemoryRouter>);

describe("linha do tempo", () => {
  it("uma linha por grua da frota (baixada não aparece) e os 12 meses no cabeçalho", () => {
    const { container } = renderG();
    expect(container.querySelectorAll("[data-gantt-unit]")).toHaveLength(2);
    expect(screen.getByText("mar/26")).toBeInTheDocument();
    expect(screen.getByText("fev/27")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "G1" })).toHaveAttribute("href", "/frota/gruas/g1");
  });

  it("barras com cor por situação: em obra, agendada, atrasada e encerrada", () => {
    const { container } = renderG({
      rentals: [
        rental("g1", "2026-05-01", "2026-12-31", { site_name: "Ativa" }),
        rental("g1", "2027-01-05", "2027-02-20", { site_name: "Agendada" }),
        rental("g2", "2026-04-01", "2026-05-31", { site_name: "Atrasada" }),
        rental("g2", "2026-03-10", "2026-03-31", { site_name: "Encerrada", actual_end_date: "2026-03-31" }),
      ],
    });
    const kinds = Array.from(container.querySelectorAll("[data-bar]")).map((b) => `${b.textContent}:${b.getAttribute("data-bar")}`).sort();
    expect(kinds).toEqual(["Agendada:scheduled", "Ativa:active", "Atrasada:overdue", "Encerrada:finished"]);
  });

  it("dica da barra: obra, cliente, datas e valor mensal", () => {
    const { container } = renderG({ rentals: [rental("g1", "2026-05-01", "2026-12-31", { site_name: "Aurora", clients: { razao_social: "Alfa SA", nome_fantasia: null } })] });
    const tip = container.querySelector("[data-bar]")!.getAttribute("title")!;
    expect(tip).toContain("Aurora · Alfa SA");
    expect(tip).toContain("01/05/2026 a 31/12/2026");
    expect(tip).toMatch(/R\$\s10\.000,00\/mês/);
  });

  it("linha de 'hoje' e legenda", () => {
    const { container } = renderG();
    expect(container.querySelector("[data-gantt-unit] .bg-red-500")).not.toBeNull();
    const legend = screen.getByRole("list", { name: "Legenda" });
    expect(within(legend).getByText("Atrasada (ainda na obra)")).toBeInTheDocument();
    expect(within(legend).getByText("Hoje")).toBeInTheDocument();
  });

  it("sem gruas: mensagem em vez de tabela vazia", () => {
    render(<MemoryRouter><FleetGantt units={[]} rentals={[]} today={TODAY} /></MemoryRouter>);
    expect(screen.getByText("Nenhuma grua para mostrar.")).toBeInTheDocument();
  });

  it("a região rola e é acessível pelo teclado", () => {
    renderG();
    const region = screen.getByRole("region", { name: "Linha do tempo das locações" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toContain("overflow-x-auto");
  });

  it("sem link quando usada na página da própria grua", () => {
    renderG({ linkUnits: false });
    expect(screen.queryByRole("link", { name: "G1" })).not.toBeInTheDocument();
    expect(screen.getByText("G1")).toBeInTheDocument();
  });
});
