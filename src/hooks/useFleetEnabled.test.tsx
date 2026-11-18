import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ hasColumn: vi.fn(async (_t: string, _c: string) => true) }));
vi.mock("@/lib/dbFeatures", () => ({ hasColumn: h.hasColumn }));

import { useFleetEnabled, useFleetStatus } from "./useFleetEnabled";

const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
beforeEach(() => { h.hasColumn.mockReset().mockResolvedValue(true); });

describe("a frota só liga quando as três tabelas existem", () => {
  it("começa carregando e vira 'ready' quando todas existem", async () => {
    const { result } = renderHook(() => useFleetStatus(), { wrapper });
    expect(result.current).toBe("loading");
    await waitFor(() => expect(result.current).toBe("ready"));
    expect(h.hasColumn.mock.calls.map((c) => c[0]).sort()).toEqual(["fleet_costs", "fleet_rentals", "fleet_units"]);
  });

  it("falta uma tabela só: continua desligada ('missing')", async () => {
    h.hasColumn.mockImplementation(async (t: string) => t !== "fleet_costs");
    const { result } = renderHook(() => useFleetStatus(), { wrapper });
    await waitFor(() => expect(result.current).toBe("missing"));
  });

  it("para quem não é administrador não consulta o banco e fica desligada", () => {
    const { result } = renderHook(() => useFleetEnabled(false), { wrapper });
    expect(result.current).toBe(false);
    expect(h.hasColumn).not.toHaveBeenCalled();
  });

  it("useFleetEnabled é só um 'sim/não' do status", async () => {
    const { result } = renderHook(() => useFleetEnabled(), { wrapper });
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });
});
