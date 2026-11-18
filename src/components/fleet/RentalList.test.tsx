import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { fleetData, rental, unit, TODAY } from "@/test/fleetFixtures";

const h = vi.hoisted(() => ({
  cancelRental: vi.fn(async (..._a: any[]) => {}), reopenRental: vi.fn(async (..._a: any[]) => {}),
  finishRental: vi.fn(async (..._a: any[]) => {}), extendRental: vi.fn(async (..._a: any[]) => {}), saveRental: vi.fn(async (..._a: any[]) => {}),
  fetchRentalContracts: vi.fn(async () => [] as any[]),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), ...h }));

import { RentalList } from "./RentalList";

const data = fleetData({ units: [unit("g1", { model_name: "Grua A" }), unit("g2")] });
const active = rental("g1", "2026-01-01", "2026-12-31", {
  site_name: "Edifício Aurora", site_location: "Goiânia-GO", client_id: "k1", clients: { razao_social: "Alfa SA", nome_fantasia: null },
  contract_id: "c1", contracts: { contract_number: "CTR1", status: "signed", signed_at: "2026-01-02", signed_pdf_url: null },
  monthly_value: 18500, mobilization_value: 6000, demobilization_value: 6000,
});
const scheduled = rental("g2", "2026-09-01", "2027-02-28", { site_name: "Torre Beta" });
const finished = rental("g2", "2025-01-01", "2025-06-30", { site_name: "Obra Antiga", actual_end_date: "2025-06-30" });

function renderList(rentals = [active], props: Partial<React.ComponentProps<typeof RentalList>> = {}) {
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}><RentalList rentals={rentals} data={data} today={TODAY} {...props} /></QueryClientProvider>
    </MemoryRouter>,
  );
}
const openMenu = (code: string) => fireEvent.keyDown(screen.getByRole("button", { name: `Ações da locação ${code}` }), { key: "Enter" });
const menuItems = () => screen.getAllByRole("menuitem").map((m) => (m.textContent ?? "").trim());

beforeEach(() => Object.values(h).forEach((f) => (f as any).mockClear?.()));
afterEach(cleanup);

describe("lista de locações", () => {
  it("mostra grua, obra, cliente, local, período, prazo, valores e o selo do contrato", () => {
    renderList();
    const li = screen.getByRole("listitem");
    expect(within(li).getByRole("link", { name: "G1 — Grua A" })).toHaveAttribute("href", "/frota/gruas/g1");
    expect(li.textContent).toContain("Edifício Aurora · Alfa SA");
    expect(li.textContent).toContain("Goiânia-GO");
    expect(li.textContent).toContain("01/01/2026 → 31/12/2026 (previsto) · 12 meses");
    expect(within(li).getByText("Faltam 199 dias · termina em 31/12/2026")).toBeInTheDocument();
    expect(li.textContent).toMatch(/Mensal\s*R\$\s18\.500,00/);
    expect(li.textContent).toMatch(/Previsto\s*R\$\s234\.000,00/);
    expect(li.textContent).toMatch(/Recebido até hoje\s*R\$\s/);
    expect(within(li).getAllByText("Contrato assinado").length).toBeGreaterThan(0);
  });

  it("sem contrato ligado: selo 'Sem contrato'", () => {
    renderList([scheduled]);
    expect(screen.getAllByText("Sem contrato").length).toBeGreaterThan(0);
  });

  it("vazio mostra a mensagem recebida", () => {
    renderList([], { empty: "Nenhuma grua em obra no momento." });
    expect(screen.getByText("Nenhuma grua em obra no momento.")).toBeInTheDocument();
  });

  it("na página da grua, a linha não repete o nome da grua", () => {
    renderList([active], { showUnit: false });
    expect(screen.queryByRole("link", { name: /G1/ })).not.toBeInTheDocument();
  });

  it("menu de uma locação em andamento: contrato, grua, editar, prorrogar, devolver e cancelar", () => {
    renderList();
    openMenu("G1");
    expect(menuItems()).toEqual(["Abrir contrato", "Ver a grua", "Editar", "Prorrogar", "Registrar devolução", "Cancelar locação"]);
    expect(screen.getByRole("menuitem", { name: "Abrir contrato" })).toHaveAttribute("href", "/contratos/c1");
  });

  it("menu de uma locação agendada: sem devolução; encerrada: pode desfazer a devolução e não cancelar", () => {
    renderList([scheduled]);
    openMenu("G2");
    expect(menuItems()).toEqual(["Ver a grua", "Editar", "Prorrogar", "Cancelar locação"]);
    cleanup();
    renderList([finished]);
    openMenu("G2");
    expect(menuItems()).toEqual(["Ver a grua", "Editar", "Desfazer devolução"]);
  });

  it("cancelar pede confirmação e só então cancela", async () => {
    renderList();
    openMenu("G1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Cancelar locação" }));
    expect(await screen.findByText("Cancelar esta locação?")).toBeInTheDocument();
    expect(h.cancelRental).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Manter" }));
    expect(h.cancelRental).not.toHaveBeenCalled();
    openMenu("G1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Cancelar locação" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar locação" }));
    await waitFor(() => expect(h.cancelRental).toHaveBeenCalledWith(active.id));
  });

  it("desfazer devolução chama a ação direto", async () => {
    renderList([finished]);
    openMenu("G2");
    fireEvent.click(screen.getByRole("menuitem", { name: "Desfazer devolução" }));
    await waitFor(() => expect(h.reopenRental).toHaveBeenCalledWith(finished.id));
  });

  it("registrar devolução e prorrogar abrem as telas certas", async () => {
    renderList();
    openMenu("G1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Registrar devolução" }));
    expect(await screen.findByText("Registrar devolução — G1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByText("Registrar devolução — G1")).not.toBeInTheDocument());
    openMenu("G1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Prorrogar" }));
    expect(await screen.findByText("Prorrogar locação — G1")).toBeInTheDocument();
  });

  it("editar abre o formulário já com os dados da locação", async () => {
    renderList();
    openMenu("G1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(await screen.findByText("Editar locação")).toBeInTheDocument();
    expect((screen.getByLabelText("Obra") as HTMLInputElement).value).toBe("Edifício Aurora");
  });

  it("cancelada aparece como cancelada e sem barra de prazo", () => {
    renderList([rental("g1", "2026-01-01", "2026-12-31", { cancelled_at: "2026-02-01T00:00:00Z", site_name: "X" })]);
    expect(screen.getAllByText("Cancelada").length).toBeGreaterThan(0);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
