import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen, within } from "@testing-library/react";
import { cost, crane, fleetData, rental, unit, TODAY } from "@/test/fleetFixtures";
import { FleetPanorama } from "./FleetPanorama";

afterEach(cleanup);
const nb = (s: string | null) => (s ?? "").replace(/ /g, " ");

const data = fleetData({
  units: [
    unit("g1", { acquisition_cost: 500_000 }),
    unit("g2", { acquisition_cost: 600_000 }),
    unit("g3", { acquisition_cost: 400_000, acquisition_date: "2025-01-01", product_id: "gt45" }),
  ],
  rentals: [
    rental("g1", "2026-01-01", "2026-12-31", { monthly_value: 20000, client_id: "k1", clients: { razao_social: "Alfa SA", nome_fantasia: null }, site_name: "Obra Alfa", contract_id: "c1", contracts: { contract_number: "C1", status: "signed", signed_at: "2026-01-02", signed_pdf_url: null } }),
    rental("g2", "2026-01-01", "2026-06-10", { monthly_value: 30000, client_id: "k2", clients: { razao_social: "Beta Ltda", nome_fantasia: null }, site_name: "Obra Beta", contract_id: "c2", contracts: { contract_number: "C2", status: "sent", signed_at: null, signed_pdf_url: null } }),
    rental("g2", "2026-06-20", "2026-12-20", { monthly_value: 28000, client_id: "k3", site_name: "Obra Gama" }),
  ],
  costs: [cost("g1", "manutencao", 10_000, "2026-02-01")],
  catalog: [crane("gt45", { rental_monthly_price: 22000 })],
  clients: [{ id: "k3", name: "Gama Ltda" }],
});

const renderP = (d = data) => render(<MemoryRouter><FleetPanorama data={d} today={TODAY} /></MemoryRouter>);

describe("panorama da frota", () => {
  it("números-chave: gruas por situação, receita recorrente, valor empregado e capital parado", () => {
    renderP();
    const kpis = screen.getByRole("region", { name: "Números da frota" });
    const text = nb(kpis.textContent);
    expect(text).toContain("Gruas na frota3");
    expect(text).toContain("2 em obra · 1 livre");
    expect(text).not.toContain("1 livres");
    expect(text).toContain("Receita mensal recorrenteR$ 50 mil");
    expect(text).toContain("Valor empregadoR$ 1,5 mi");
    expect(text).toContain("Capital paradoR$ 400 mil");
    expect(text).toContain("renderiam ~R$ 22 mil/mês");
    expect(text).toContain("Utilização (12 meses)");
    expect(text).toContain("Rentabilidade (ROI)");
  });

  it("alertas: cliente esperando, devolução atrasada e contrato sem assinatura, com link para a grua", () => {
    renderP();
    const list = screen.getByRole("list", { name: "Alertas da frota" });
    const items = within(list).getAllByRole("listitem");
    const titles = items.map((li) => nb(li.querySelector("p")!.textContent));
    expect(titles).toEqual([
      "Urgente: G2: cliente esperando a grua",
      "Urgente: G2: devolução atrasada 5 dias",
      "Urgente: G2: grua em obra sem contrato assinado",
      "Atenção: G2: locação perto de começar sem contrato assinado",
      "Aviso: G3: parada há 530 dias",
    ]);
    expect(within(items[0]).getByRole("link")).toHaveAttribute("href", "/frota/gruas/g2");
    expect(items[0].textContent).toContain("Gama Ltda espera desde 20/06");
  });

  it("sem alertas: mensagem positiva", () => {
    renderP(fleetData({ units: [unit("g1")], rentals: [rental("g1", "2026-01-01", "2026-12-31", { contract_id: "c", contracts: { contract_number: "C", status: "signed", signed_at: "2026-01-01", signed_pdf_url: null } })] }));
    expect(screen.getByText(/Tudo em dia/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Alertas da frota" })).not.toBeInTheDocument();
  });

  it("linha do tempo, gráficos de receita e ranking por grua presentes", () => {
    renderP();
    expect(screen.getByRole("region", { name: "Linha do tempo das locações" })).toBeInTheDocument();
    expect(screen.getByText("Receita por mês")).toBeInTheDocument();
    expect(screen.getByText("Receita prevista")).toBeInTheDocument();
    const rank = screen.getByText("Receita acumulada por grua").closest("[class*='rounded-lg']") as HTMLElement;
    const rows = within(rank).getAllByRole("listitem").map((li) => nb(li.textContent));
    expect(rows[0]).toContain("G2"); // 2 locações: a que mais rendeu
    expect(rows.some((x) => x.includes("G1") && x.includes("ROI"))).toBe(true);
    expect(rows.some((x) => x.includes("G3"))).toBe(false); // sem receita
  });

  it("frota sem receita: ranking explica o que fazer", () => {
    renderP(fleetData({ units: [unit("g1")] }));
    expect(screen.getByText("Ainda não há receita registrada. Aloque uma grua a uma obra.")).toBeInTheDocument();
  });
});
