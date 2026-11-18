import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HowItWorks } from "./HowItWorks";

function memoryStorage(initial: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(initial));
  return { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 };
}
const stubWidth = (wide: boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: wide, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));

beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("painel 'Como funciona'", () => {
  it("primeira visita em tela grande: começa aberto", () => {
    stubWidth(true);
    render(<HowItWorks />);
    expect(screen.getByText(/Clique numa cláusula/)).toBeVisible();
  });

  it("primeira visita no celular: começa fechado (não ocupa a tela)", () => {
    stubWidth(false);
    render(<HowItWorks />);
    expect(screen.queryByText(/Clique numa cláusula/)).not.toBeInTheDocument();
  });

  it("lembra a escolha: fechado de propósito continua fechado mesmo em tela grande, e vice-versa", () => {
    stubWidth(true);
    vi.stubGlobal("localStorage", memoryStorage({ "soima:contract-templates:help-open": "0" }));
    const a = render(<HowItWorks />);
    expect(screen.queryByText(/Clique numa cláusula/)).not.toBeInTheDocument();
    a.unmount();
    stubWidth(false);
    vi.stubGlobal("localStorage", memoryStorage({ "soima:contract-templates:help-open": "1" }));
    render(<HowItWorks />);
    expect(screen.getByText(/Clique numa cláusula/)).toBeInTheDocument();
  });

  it("abrir e fechar grava a escolha", () => {
    stubWidth(true);
    render(<HowItWorks />);
    fireEvent.click(screen.getByRole("button", { name: /Como funciona/ }));
    expect(localStorage.getItem("soima:contract-templates:help-open")).toBe("0");
    expect(screen.queryByText(/Clique numa cláusula/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Como funciona/ }));
    expect(localStorage.getItem("soima:contract-templates:help-open")).toBe("1");
  });

  it("sem armazenamento local (navegação privada): funciona, só não lembra", () => {
    stubWidth(true);
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } });
    render(<HowItWorks />);
    fireEvent.click(screen.getByRole("button", { name: /Como funciona/ }));
    expect(screen.queryByText(/Clique numa cláusula/)).not.toBeInTheDocument();
  });
});
