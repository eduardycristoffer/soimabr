import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VersionBar, type CompanyRow, type TemplateRow } from "./VersionBar";

afterEach(cleanup);
const T = (id: string, version: number, is_active: boolean, company_id: string | null = "c1"): TemplateRow => ({ id, name: `Contrato (v${version})`, version, is_active, company_id });
const companies: CompanyRow[] = [{ id: "c1", razao_social: "SOIMA Ltda", company_name: "SOIMA" }, { id: "c2", razao_social: null, company_name: "Outra" }];

function setup(over: Partial<React.ComponentProps<typeof VersionBar>> = {}) {
  const p = {
    typeLabel: "Venda", templates: [T("t2", 2, true), T("t1", 1, false)], activeId: "t2", companies, busy: false, dirty: false,
    onSelect: vi.fn(), onNewVersion: vi.fn(), onToggleActive: vi.fn(), onChangeCompany: vi.fn(), ...over,
  };
  render(<VersionBar {...p} />);
  return p;
}

describe("barra de versões do modelo", () => {
  it("mostra cada versão com sua situação (em uso, reserva, inativa)", () => {
    setup({ templates: [T("t3", 3, true), T("t2", 2, true), T("t1", 1, false)], activeId: "t3" });
    const v3 = screen.getByRole("button", { name: /v3/ });
    const v2 = screen.getByRole("button", { name: /v2/ });
    const v1 = screen.getByRole("button", { name: /v1/ });
    expect(v3).toHaveTextContent("Em uso");
    expect(v2).toHaveTextContent("Reserva");
    expect(v1).toHaveTextContent("inativa");
    expect(v3).toHaveAttribute("aria-pressed", "true");
    expect(v1).toHaveAttribute("aria-pressed", "false");
  });

  it("escolher outra versão avisa quem controla a tela", () => {
    const p = setup();
    fireEvent.click(screen.getByRole("button", { name: /v1/ }));
    expect(p.onSelect).toHaveBeenCalledWith("t1");
  });

  it("duas versões ativas: aviso explica qual vale", () => {
    setup({ templates: [T("t2", 2, true), T("t1", 1, true)] });
    expect(screen.getByText(/Há 2 versões ativas/)).toBeInTheDocument();
  });

  it("uma versão ativa: sem aviso", () => {
    setup();
    expect(screen.queryByText(/versões ativas/)).not.toBeInTheDocument();
  });

  it("ativar: mostra o que muda e só aplica depois de confirmar", () => {
    const p = setup({ templates: [T("t2", 2, false), T("t1", 1, true)], activeId: "t2" });
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Ativar a v2?")).toBeInTheDocument();
    expect(screen.getByText(/no lugar da v1/)).toBeInTheDocument();
    expect(p.onToggleActive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ativar" }));
    expect(p.onToggleActive).toHaveBeenCalledWith(true);
  });

  it("cancelar a confirmação não muda nada", () => {
    const p = setup({ templates: [T("t2", 2, false), T("t1", 1, true)], activeId: "t2" });
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(p.onToggleActive).not.toHaveBeenCalled();
    expect(screen.queryByText("Ativar a v2?")).not.toBeInTheDocument();
  });

  it("desativar a única versão ativa avisa que ninguém conseguirá gerar contrato", () => {
    const p = setup();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Desativar a v2?")).toBeInTheDocument();
    expect(screen.getByText(/não será possível gerar contratos de venda/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    expect(p.onToggleActive).toHaveBeenCalledWith(false);
  });

  it("Nova versão: chama a ação; com alterações não salvas fica bloqueada e explica por quê", () => {
    const p = setup();
    fireEvent.click(screen.getByRole("button", { name: /Nova versão/ }));
    expect(p.onNewVersion).toHaveBeenCalledTimes(1);
    cleanup();
    const q = setup({ dirty: true });
    expect(screen.getByRole("button", { name: /Nova versão/ })).toBeDisabled();
    expect(screen.getByText(/salve ou descarte as alterações/i)).toBeInTheDocument();
    expect(q.onNewVersion).not.toHaveBeenCalled();
  });

  it("empresa: lista com nome, troca avisa; '— nenhuma —' vira null", () => {
    const p = setup();
    const sel = screen.getByLabelText("Empresa que assina o contrato") as HTMLSelectElement;
    expect(sel.value).toBe("c1");
    expect(Array.from(sel.options).map((o) => o.textContent)).toEqual(["— nenhuma —", "SOIMA Ltda", "Outra"]);
    fireEvent.change(sel, { target: { value: "c2" } });
    expect(p.onChangeCompany).toHaveBeenLastCalledWith("c2");
    fireEvent.change(sel, { target: { value: "" } });
    expect(p.onChangeCompany).toHaveBeenLastCalledWith(null);
  });

  it("sem empresa: aviso de que os dados da vendedora ficam em branco", () => {
    setup({ templates: [T("t2", 2, true, null)] });
    expect(screen.getByText(/Sem empresa, os dados da vendedora/)).toBeInTheDocument();
  });

  it("ocupado desabilita as ações", () => {
    setup({ busy: true });
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByLabelText("Empresa que assina o contrato")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Nova versão/ })).toBeDisabled();
  });
});
