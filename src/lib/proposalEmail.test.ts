import { describe, it, expect } from "vitest";
import { defaultProposalEmail, isValidEmail, parseEmailInput } from "@/lib/proposalEmail";

describe("parseEmailInput", () => {
  it("separa por vírgula, ponto e vírgula, espaço e quebra de linha", () => {
    const r = parseEmailInput("a@x.com, b@y.com;c@z.com\nd@w.com  e@v.com");
    expect(r.valid).toEqual(["a@x.com", "b@y.com", "c@z.com", "d@w.com", "e@v.com"]);
    expect(r.invalid).toEqual([]);
  });

  it("deixa minúsculo, remove repetidos e separa os inválidos", () => {
    const r = parseEmailInput("Cliente@X.com cliente@x.com ruim sem@dominio");
    expect(r.valid).toEqual(["cliente@x.com"]);
    expect(r.invalid).toEqual(["ruim", "sem@dominio"]);
  });

  it("texto vazio não gera nada", () => {
    expect(parseEmailInput("   ")).toEqual({ valid: [], invalid: [] });
  });
});

describe("isValidEmail", () => {
  it("aceita e recusa o básico", () => {
    expect(isValidEmail("financeiro@arteconstrutora.com")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
});

describe("defaultProposalEmail", () => {
  it("monta assunto e mensagem em português", () => {
    const m = defaultProposalEmail("pt-BR", { numero: "PRO262726", contato: "Regina", obra: "Edifício Arte", vendedor: "José Luiz" });
    expect(m.subject).toBe("Proposta comercial PRO262726 — SOIMA BR");
    expect(m.body).toContain("Olá, Regina!");
    expect(m.body).toContain("proposta comercial PRO262726 referente à obra Edifício Arte.");
    expect(m.body.endsWith("Atenciosamente,\nJosé Luiz")).toBe(true);
  });

  it("funciona sem contato, obra e vendedor (sem sobras de pontuação)", () => {
    const m = defaultProposalEmail("pt-BR", { numero: "PRO1" });
    expect(m.body.startsWith("Olá!\n\n")).toBe(true);
    expect(m.body).toContain("proposta comercial PRO1.");
    expect(m.body.endsWith("Atenciosamente,")).toBe(true);
  });

  it("usa inglês quando a proposta é em inglês", () => {
    const m = defaultProposalEmail("en", { numero: "PRO2", contato: "Hector", obra: "Syty" });
    expect(m.subject).toBe("Commercial proposal PRO2 — SOIMA BR");
    expect(m.body).toContain("Hello Hector,");
    expect(m.body).toContain("for the project Syty");
  });
});
