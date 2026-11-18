import { describe, it, expect, vi, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ isAdmin: true, enabled: true, rows: [] as any[], error: null as any }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isAdmin: h.isAdmin }) }));
vi.mock("@/hooks/useFleetEnabled", () => ({ useFleetEnabled: (on = true) => on && h.enabled }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ in: async () => ({ data: h.rows, error: h.error }) }) }) },
}));

import { ContractFleetChip, useContractFleetMap } from "./ContractFleetChip";

afterEach(() => { cleanup(); h.isAdmin = true; h.enabled = true; h.rows = []; h.error = null; });
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;

describe("selo da frota na lista de contratos", () => {
  it("mostra o(s) código(s) da grua em obra", () => {
    render(<ContractFleetChip enabled isRental codes={["GRU-1", "GRU-2"]} />);
    expect(screen.getByText("GRU-1, GRU-2")).toBeInTheDocument();
  });
  it("locação sem grua: 'Sem grua'", () => {
    render(<ContractFleetChip enabled isRental codes={[]} />);
    expect(screen.getByText("Sem grua")).toBeInTheDocument();
  });
  it("venda ou frota desativada: nada", () => {
    const a = render(<ContractFleetChip enabled isRental={false} codes={["X"]} />);
    expect(a.container).toBeEmptyDOMElement();
    const b = render(<ContractFleetChip enabled={false} isRental codes={["X"]} />);
    expect(b.container).toBeEmptyDOMElement();
  });
});

describe("mapa contrato → gruas", () => {
  it("agrupa os códigos por contrato e ignora locação cancelada ou encerrada", async () => {
    h.rows = [
      { contract_id: "c1", cancelled_at: null, actual_end_date: null, fleet_units: { code: "GRU-1" } },
      { contract_id: "c1", cancelled_at: null, actual_end_date: null, fleet_units: { code: "GRU-2" } },
      { contract_id: "c2", cancelled_at: "2026-01-01T00:00:00Z", actual_end_date: null, fleet_units: { code: "GRU-3" } },
      { contract_id: "c3", cancelled_at: null, actual_end_date: "2026-02-01", fleet_units: { code: "GRU-4" } },
    ];
    const { result } = renderHook(() => useContractFleetMap(["c1", "c2", "c3"]), { wrapper });
    await waitFor(() => expect(result.current.map).toEqual({ c1: ["GRU-1", "GRU-2"] }));
    expect(result.current.enabled).toBe(true);
  });

  it("sem contratos na tela, ou para quem não é administrador, não consulta nada e fica desligado", async () => {
    h.isAdmin = false;
    const { result } = renderHook(() => useContractFleetMap(["c1"]), { wrapper });
    expect(result.current).toEqual({ enabled: false, map: {} });
  });

  it("erro na consulta não derruba a lista: mapa vazio", async () => {
    h.error = { message: "falha" };
    const { result } = renderHook(() => useContractFleetMap(["c1"]), { wrapper });
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.map).toEqual({});
  });
});
