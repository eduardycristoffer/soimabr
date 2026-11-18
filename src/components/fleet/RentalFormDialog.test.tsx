import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";
import { fleetData, rental, unit } from "@/test/fleetFixtures";
import type { RentalDraft } from "@/lib/fleet";

const h = vi.hoisted(() => ({
  saveRental: vi.fn(async (_: any) => {}),
  fetchRentalContracts: vi.fn(async () => [] as any[]),
  fetchQuoteForRental: vi.fn(async (_: string) => ({}) as any),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/fleetApi", async (orig) => ({ ...(await orig<typeof import("@/lib/fleetApi")>()), saveRental: h.saveRental, fetchRentalContracts: h.fetchRentalContracts, fetchQuoteForRental: h.fetchQuoteForRental }));

import { RentalFormDialog } from "./RentalFormDialog";

const data = fleetData({
  units: [unit("g1", { model_name: "Grua A" }), unit("g2", { altura_torre_m: 20 }), unit("g3", { status: "maintenance" }), unit("g4", { status: "retired" })],
  rentals: [rental("g1", "2026-06-01", "2026-08-31", { site_name: "Obra X" })],
});

const draft = (over: Partial<RentalDraft> = {}): RentalDraft => ({
  client_id: "k1", quote_id: "q1", site_name: "Edifício Aurora", site_location: "Goiânia-GO",
  start_date: "2026-09-01", planned_end_date: "2027-08-31", monthly_value: 18500, mobilization_value: 6000, demobilization_value: 6000,
  requirements: {}, notes: [], ...over,
});

function renderDialog(props: Partial<React.ComponentProps<typeof RentalFormDialog>> = {}) {
  const onClose = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RentalFormDialog open onClose={onClose} data={data} {...props} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { onClose };
}
const optionTexts = () => Array.from((screen.getByLabelText("Grua *") as HTMLSelectElement).options).map((o) => o.textContent);

beforeEach(() => { h.saveRental.mockClear(); h.fetchRentalContracts.mockReset().mockResolvedValue([]); h.fetchQuoteForRental.mockReset(); });
afterEach(cleanup);

describe("alocar grua a uma obra", () => {
  it("pré-preenche pela proposta: cliente, obra, datas, valores e o resumo do contrato", () => {
    renderDialog({ draft: draft(), contractId: "c1" });
    expect((screen.getByLabelText("Obra") as HTMLInputElement).value).toBe("Edifício Aurora");
    expect((screen.getByLabelText("Início *") as HTMLInputElement).value).toBe("2026-09-01");
    expect((screen.getByLabelText("Término previsto *") as HTMLInputElement).value).toBe("2027-08-31");
    expect((screen.getByLabelText("Duração (meses)") as HTMLInputElement).value).toBe("12");
    expect((screen.getByLabelText("Valor mensal (R$)") as HTMLInputElement).value).toBe("18500");
    expect((screen.getByLabelText("Cliente") as HTMLSelectElement).value).toBe("k1");
    expect(screen.getByTestId("rental-summary").textContent).toContain("12 meses de locação");
    expect(screen.getByTestId("rental-summary").textContent).toContain("234.000,00");
  });

  it("lista só gruas da frota (baixada fora) e marca a que está ocupada, em manutenção ou não atende", () => {
    renderDialog({ draft: draft({ start_date: "2026-08-15", planned_end_date: "2026-12-31", requirements: { height_m: 30 } }), contractId: "c1" });
    const t = optionTexts();
    expect(t.some((x) => x?.startsWith("G4"))).toBe(false);
    expect(t.find((x) => x?.startsWith("G1"))).toContain("ocupada até 31/08/2026");
    expect(t.find((x) => x?.startsWith("G2"))).toContain("não atende à obra");
    expect(t.find((x) => x?.startsWith("G3"))).toContain("em manutenção");
    // livre e compatível primeiro; a incompatível antes das ocupadas
    expect(t.slice(1).map((x) => x?.slice(0, 2))).toEqual(["G2", "G1", "G3"]);
  });

  it("grua ocupada no período: avisa e não grava", async () => {
    renderDialog({ draft: draft({ start_date: "2026-08-15", planned_end_date: "2026-12-31" }), contractId: "c1" });
    fireEvent.change(screen.getByLabelText("Grua *"), { target: { value: "g1" } });
    fireEvent.click(screen.getByRole("button", { name: "Alocar grua" }));
    expect(await screen.findByText("Esta grua já está ocupada de 01/06 até 31/08 (Obra X).")).toBeInTheDocument();
    expect(h.saveRental).not.toHaveBeenCalled();
  });

  it("campos obrigatórios aparecem como erro ao tentar salvar", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Alocar grua" }));
    expect(await screen.findByText("Escolha a grua.")).toBeInTheDocument();
    expect(screen.getByText("Informe a data de início.")).toBeInTheDocument();
    expect(screen.getByText("Informe o término previsto.")).toBeInTheDocument();
    expect(h.saveRental).not.toHaveBeenCalled();
  });

  it("grua que não atende às exigências da obra: alerta explicando, sem bloquear", () => {
    renderDialog({ draft: draft({ requirements: { height_m: 30 } }), contractId: "c1" });
    fireEvent.change(screen.getByLabelText("Grua *"), { target: { value: "g2" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Altura: a grua tem 20 m, a obra pede 30 m");
  });

  it("grava com os dados certos (valores em número, contrato e proposta ligados)", async () => {
    const { onClose } = renderDialog({ draft: draft(), contractId: "c1" });
    fireEvent.change(screen.getByLabelText("Grua *"), { target: { value: "g1" } });
    fireEvent.click(screen.getByRole("button", { name: "Alocar grua" }));
    await waitFor(() => expect(h.saveRental).toHaveBeenCalledTimes(1));
    expect(h.saveRental.mock.calls[0][0]).toEqual({
      id: undefined, unit_id: "g1", contract_id: "c1", quote_id: "q1", client_id: "k1",
      site_name: "Edifício Aurora", site_location: "Goiânia-GO", start_date: "2026-09-01", planned_end_date: "2027-08-31",
      monthly_value: 18500, mobilization_value: 6000, demobilization_value: 6000, notes: null,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("aceita valores digitados no formato brasileiro", async () => {
    renderDialog({ draft: draft(), contractId: "c1" });
    fireEvent.change(screen.getByLabelText("Grua *"), { target: { value: "g1" } });
    fireEvent.change(screen.getByLabelText("Valor mensal (R$)"), { target: { value: "19.250,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Alocar grua" }));
    await waitFor(() => expect(h.saveRental).toHaveBeenCalled());
    expect(h.saveRental.mock.calls[0][0].monthly_value).toBe(19250.5);
  });

  it("duração em meses calcula o término (12 meses de 01/03 terminam em 28/02)", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Início *"), { target: { value: "2026-03-01" } });
    fireEvent.change(screen.getByLabelText("Duração (meses)"), { target: { value: "12" } });
    expect((screen.getByLabelText("Término previsto *") as HTMLInputElement).value).toBe("2027-02-28");
    fireEvent.change(screen.getByLabelText("Término previsto *"), { target: { value: "2026-08-31" } });
    expect((screen.getByLabelText("Duração (meses)") as HTMLInputElement).value).toBe("6");
  });

  it("contrato ainda não assinado: avisa; assinado: não", () => {
    renderDialog({ draft: draft(), contractId: "c1", contractSigned: false });
    expect(screen.getByText(/ainda não foi assinado/)).toBeInTheDocument();
    cleanup();
    renderDialog({ draft: draft(), contractId: "c1", contractSigned: true });
    expect(screen.queryByText(/ainda não foi assinado/)).not.toBeInTheDocument();
  });

  it("avisos da proposta (ex.: dólar convertido) aparecem para conferir", () => {
    renderDialog({ draft: draft({ notes: ["Valores convertidos de dólar para real pela cotação da proposta (5)."] }), contractId: "c1" });
    expect(screen.getByText(/convertidos de dólar para real/)).toBeInTheDocument();
  });

  it("sem contrato fixo: escolher um contrato traz os dados da proposta", async () => {
    h.fetchRentalContracts.mockResolvedValue([{ id: "c9", contract_number: "CTR260009", status: "signed", signed_at: "2026-03-01T12:00:00Z", quote_id: "q9", client_id: "k2", client_name: "Beta Ltda", quote_number: "PRO1" }]);
    h.fetchQuoteForRental.mockResolvedValue({
      id: "q9", client_id: "k2", project_name: "Torre Beta", project_location: "Anápolis-GO", currency: "BRL", usd_brl_rate_used: null,
      rental_start_date: "2026-10-01", rental_duration_months: 6, rental_monthly_value: 20000, rental_mobilization: 3000, rental_demobilization: 0,
      rental_height_needed: null, rental_jib_needed: null, rental_max_weight: null,
    });
    renderDialog();
    await screen.findByRole("option", { name: /CTR260009/ });
    fireEvent.change(screen.getByLabelText("Contrato de locação"), { target: { value: "c9" } });
    await waitFor(() => expect((screen.getByLabelText("Obra") as HTMLInputElement).value).toBe("Torre Beta"));
    expect((screen.getByLabelText("Cliente") as HTMLSelectElement).value).toBe("k2");
    expect((screen.getByLabelText("Término previsto *") as HTMLInputElement).value).toBe("2027-03-31");
    expect((screen.getByLabelText("Valor mensal (R$)") as HTMLInputElement).value).toBe("20000");
    expect((screen.getByLabelText("Mobilização (R$)") as HTMLInputElement).value).toBe("3000");
  });

  it("editar: carrega a locação e não conflita com ela mesma", async () => {
    const mine = data.rentals[0];
    renderDialog({ rental: mine });
    expect(screen.getByText("Editar locação")).toBeInTheDocument();
    expect((screen.getByLabelText("Obra") as HTMLInputElement).value).toBe("Obra X");
    expect((screen.getByLabelText("Grua *") as HTMLSelectElement).value).toBe("g1");
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(h.saveRental).toHaveBeenCalled());
    expect(h.saveRental.mock.calls[0][0].id).toBe(mine.id);
  });

  it("erro do banco vira mensagem e a tela continua aberta", async () => {
    h.saveRental.mockRejectedValueOnce({ code: "42501", message: "row-level security" });
    const { onClose } = renderDialog({ draft: draft(), contractId: "c1" });
    fireEvent.change(screen.getByLabelText("Grua *"), { target: { value: "g1" } });
    fireEvent.click(screen.getByRole("button", { name: "Alocar grua" }));
    expect(await screen.findByText("Sem permissão: só administradores gerenciam a frota.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("não mostra o seletor de contrato quando o contrato já veio fixo", () => {
    renderDialog({ draft: draft(), contractId: "c1" });
    expect(screen.queryByLabelText("Contrato de locação")).not.toBeInTheDocument();
  });

  it("grua escolhida de antemão (vinda da página da grua) já aparece selecionada", () => {
    renderDialog({ presetUnitId: "g2" });
    expect((screen.getByLabelText("Grua *") as HTMLSelectElement).value).toBe("g2");
  });
});
