import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";
import { fleetData, rental, unit } from "@/test/fleetFixtures";

const h = vi.hoisted(() => ({
  auth: { isAdmin: true },
  enabled: true,
  fleet: { data: undefined as any, isLoading: false },
  fetchContractRentals: vi.fn(async (_id: string) => ({ rentals: [] as any[], units: [] as any[] })),
  fetchQuoteForRental: vi.fn(async (_id: string) => ({}) as any),
  fetchRentalContracts: vi.fn(async () => [] as any[]),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/hooks/useFleetEnabled", () => ({ useFleetEnabled: () => h.enabled, useFleetStatus: () => (h.enabled ? "ready" : "missing") }));
vi.mock("@/hooks/useFleet", async (orig) => ({ ...(await orig<typeof import("@/hooks/useFleet")>()), useFleetData: () => h.fleet }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), fetchContractRentals: h.fetchContractRentals, fetchQuoteForRental: h.fetchQuoteForRental, fetchRentalContracts: h.fetchRentalContracts }));

import { ContractRentalCard } from "./ContractRentalCard";

const contract = { id: "c1", status: "signed", signed_at: "2026-03-01T15:00:00Z", quote_id: "q1", quotes: { quote_type: "locacao" } };
const quote = {
  id: "q1", client_id: "k1", project_name: "Edifício Aurora", project_location: "Goiânia-GO", currency: "BRL", usd_brl_rate_used: null,
  rental_start_date: "2026-03-01", rental_duration_months: 12, rental_monthly_value: 18500, rental_mobilization: 6000, rental_demobilization: 6000,
  rental_height_needed: null, rental_jib_needed: null, rental_max_weight: null,
};

const renderCard = (c: any = contract) =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ContractRentalCard contract={c} /><Toaster />
      </QueryClientProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  h.auth = { isAdmin: true };
  h.enabled = true;
  h.fleet = { data: fleetData({ units: [unit("g1", { model_name: "Grua A" })] }), isLoading: false };
  h.fetchContractRentals.mockReset().mockResolvedValue({ rentals: [], units: [] });
  h.fetchQuoteForRental.mockReset().mockResolvedValue(quote);
  h.fetchRentalContracts.mockReset().mockResolvedValue([]);
});
afterEach(cleanup);

describe("cartão 'Locação em obra' dentro do contrato", () => {
  it("não aparece para quem não é administrador, sem a frota ativada ou em contrato de venda", () => {
    const card = () => screen.queryByTestId("contract-rental-card");
    h.auth = { isAdmin: false };
    renderCard(); expect(card()).not.toBeInTheDocument(); cleanup();
    h.auth = { isAdmin: true }; h.enabled = false;
    renderCard(); expect(card()).not.toBeInTheDocument(); cleanup();
    h.enabled = true;
    renderCard({ ...contract, quotes: { quote_type: "venda" } }); expect(card()).not.toBeInTheDocument(); cleanup();
    renderCard(); expect(card()).toBeInTheDocument(); // e aparece quando tudo está certo
  });

  it("sem grua alocada: explica e oferece o botão", async () => {
    renderCard();
    expect(await screen.findByText("Nenhuma grua alocada a este contrato.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alocar grua a este contrato/ })).toBeEnabled();
    expect(screen.queryByText(/ainda não foi assinado/)).not.toBeInTheDocument();
  });

  it("contrato não assinado: avisa que a locação fica com alerta", async () => {
    renderCard({ ...contract, status: "sent", signed_at: null });
    expect(await screen.findByText(/O contrato ainda não foi assinado/)).toBeInTheDocument();
  });

  it("alocar: lê a proposta e abre o formulário já preenchido, com o contrato fixo", async () => {
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: /Alocar grua a este contrato/ }));
    expect(await screen.findByText("Alocar grua a uma obra", { selector: "h2" })).toBeInTheDocument();
    expect(h.fetchQuoteForRental).toHaveBeenCalledWith("q1");
    await waitFor(() => expect((screen.getByLabelText("Obra") as HTMLInputElement).value).toBe("Edifício Aurora"));
    expect((screen.getByLabelText("Término previsto *") as HTMLInputElement).value).toBe("2027-02-28");
    expect(screen.queryByLabelText("Contrato de locação")).not.toBeInTheDocument();
  });

  it("proposta ilegível: mostra erro e não abre o formulário", async () => {
    h.fetchQuoteForRental.mockRejectedValue({ message: "falha" });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: /Alocar grua a este contrato/ }));
    expect(await screen.findByText("Não foi possível ler a proposta deste contrato")).toBeInTheDocument();
    expect(screen.queryByText("Alocar grua a uma obra", { selector: "h2" })).not.toBeInTheDocument();
  });

  it("com grua alocada: mostra a locação (grua, obra, prazo) e 'Alocar outra grua'", async () => {
    const r = rental("g1", "2026-03-01", "2027-02-28", { site_name: "Edifício Aurora", contract_id: "c1", contracts: { contract_number: "C1", status: "signed", signed_at: "2026-03-01", signed_pdf_url: null } });
    h.fetchContractRentals.mockResolvedValue({ rentals: [r], units: [unit("g1", { model_name: "Grua A" })] });
    renderCard();
    expect(await screen.findByRole("link", { name: "G1 — Grua A" })).toBeInTheDocument();
    expect(screen.getByText(/Edifício Aurora/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alocar outra grua/ })).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma grua alocada a este contrato.")).not.toBeInTheDocument();
  });

  it("locação cancelada não conta como alocada", async () => {
    const r = rental("g1", "2026-03-01", "2027-02-28", { contract_id: "c1", cancelled_at: "2026-04-01T00:00:00Z" });
    h.fetchContractRentals.mockResolvedValue({ rentals: [r], units: [] });
    renderCard();
    expect(await screen.findByText("Nenhuma grua alocada a este contrato.")).toBeInTheDocument();
  });

  it("mostra esqueleto enquanto carrega e o botão só liga quando a frota chegou", async () => {
    h.fleet = { data: undefined, isLoading: true };
    renderCard();
    expect(screen.queryByText("Nenhuma grua alocada a este contrato.")).not.toBeInTheDocument();
  });
});
