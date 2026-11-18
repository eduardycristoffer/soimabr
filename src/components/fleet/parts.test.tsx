import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ContractBadge, RentalProgress, UnitStateBadge, specsLine, unitTitle } from "./parts";
import { rental, TODAY } from "@/test/fleetFixtures";

afterEach(cleanup);

describe("peças da frota", () => {
  it("selo da situação da grua em português", () => {
    render(<><UnitStateBadge state="rented" /><UnitStateBadge state="available" /><UnitStateBadge state="maintenance" /></>);
    expect(screen.getByText("Em obra")).toBeInTheDocument();
    expect(screen.getByText("Disponível")).toBeInTheDocument();
    expect(screen.getByText("Em manutenção")).toBeInTheDocument();
  });

  it("selo do contrato: assinado, aguardando, sem contrato", () => {
    const { rerender } = render(<ContractBadge info={{ status: "signed", signed_at: "2026-01-02" }} />);
    expect(screen.getByText("Contrato assinado")).toBeInTheDocument();
    rerender(<ContractBadge info={{ status: "sent", signed_at: null }} />);
    expect(screen.getByText("Aguardando assinatura")).toBeInTheDocument();
    rerender(<ContractBadge info={null} />);
    expect(screen.getByText("Sem contrato")).toBeInTheDocument();
  });

  it("barra de prazo: percentual decorrido e a frase", () => {
    render(<RentalProgress rental={rental("g1", "2026-06-01", "2026-06-30")} today="2026-06-10" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "33");
    expect(bar).toHaveAccessibleName("Prazo: 33% decorrido");
    expect(screen.getByText("Faltam 20 dias · termina em 30/06")).toBeInTheDocument();
  });

  it("atrasada fica vermelha e diz quantos dias; perto do fim fica amarela", () => {
    const { container, rerender } = render(<RentalProgress rental={rental("g1", "2026-01-01", "2026-06-10")} today={TODAY} />);
    expect(screen.getByText(/Atrasada 5 dias/)).toHaveClass("text-red-600");
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
    rerender(<RentalProgress rental={rental("g1", "2026-01-01", "2026-07-05")} today={TODAY} />);
    expect(screen.getByText(/Faltam 20 dias/)).toHaveClass("text-amber-700");
    expect(container.querySelector(".bg-amber-500")).not.toBeNull();
  });

  it("nunca passa de 100%", () => {
    render(<RentalProgress rental={rental("g1", "2026-01-01", "2026-03-01")} today={TODAY} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("especificação em uma linha, só com o que está cadastrado", () => {
    expect(specsLine({ lanca_m: 45, altura_torre_m: 27, carga_maxima_kg: 2500, carga_ponta_kg: 1000 })).toBe("Lança 45 m · Altura 27 m · Carga 2.500 kg · Ponta 1.000 kg");
    expect(specsLine({ lanca_m: 45, altura_torre_m: null, carga_maxima_kg: null, carga_ponta_kg: null })).toBe("Lança 45 m");
    expect(specsLine({ lanca_m: null, altura_torre_m: null, carga_maxima_kg: null, carga_ponta_kg: null })).toBe("");
  });

  it("título da grua: código e modelo", () => {
    expect(unitTitle({ code: "GRU-1", model_name: "Torre X" })).toBe("GRU-1 — Torre X");
    expect(unitTitle({ code: "GRU-1", model_name: null }, "Catálogo")).toBe("GRU-1 — Catálogo");
    expect(unitTitle({ code: "GRU-1", model_name: null })).toBe("GRU-1");
  });
});
