import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClauseEditorCard } from "./ClauseEditorCard";
import type { DraftClause } from "@/lib/contractTemplateDraft";
import { buildSampleMap } from "@/lib/contractSample";

afterEach(cleanup);
const sample = buildSampleMap(new Date("2026-11-18T12:00:00Z"));
const base: DraftClause = { uid: "a", id: "a", title: "OBJETO", body: "A vendedora {{vendedora_razao_social}} vende a grua.", is_core: true, clause_key: null };

function props(over: Partial<React.ComponentProps<typeof ClauseEditorCard>> = {}) {
  return {
    clause: base, index: 1, total: 3, active: true, dirty: false, sample,
    onActivate: vi.fn(), onChange: vi.fn(), onMove: vi.fn(), onRemove: vi.fn(), ...over,
  } as React.ComponentProps<typeof ClauseEditorCard>;
}

/** Versão com estado, para testar digitação de verdade. */
function Harness({ initial, onSpy }: { initial: DraftClause; onSpy?: (c: DraftClause) => void }) {
  const [c, setC] = useState(initial);
  return (
    <ClauseEditorCard clause={c} index={1} total={3} active dirty={false} sample={sample} onActivate={() => {}}
      onChange={(p) => setC((x) => { const n = { ...x, ...p }; onSpy?.(n); return n; })} onMove={() => {}} onRemove={() => {}} />
  );
}

describe("cartão de edição da cláusula", () => {
  it("fechado: mostra número, título e um resumo com o nome dos campos (não {{códigos}})", () => {
    render(<ClauseEditorCard {...props({ active: false })} />);
    expect(screen.getByText("OBJETO")).toBeInTheDocument();
    expect(screen.getByText("A vendedora [Razão social] vende a grua.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Título da cláusula")).not.toBeInTheDocument();
  });

  it("fechado: clicar abre a edição", () => {
    const p = props({ active: false });
    render(<ClauseEditorCard {...p} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar cláusula 1\. OBJETO/ }));
    expect(p.onActivate).toHaveBeenCalledTimes(1);
  });

  it("primeira cláusula mostra '•' (sem número); as outras mostram a posição", () => {
    const { rerender } = render(<ClauseEditorCard {...props({ index: 0, active: false })} />);
    expect(screen.getByTitle(/não recebe número/)).toHaveTextContent("•");
    rerender(<ClauseEditorCard {...props({ index: 4, active: false })} />);
    expect(screen.getByTitle("Cláusula 4")).toHaveTextContent("4");
  });

  it("selos: Nova (sem id), Alterada (mudou), Opcional", () => {
    const { rerender } = render(<ClauseEditorCard {...props({ active: false, clause: { ...base, id: undefined } })} />);
    expect(screen.getByText("Nova")).toBeInTheDocument();
    rerender(<ClauseEditorCard {...props({ active: false, dirty: true })} />);
    expect(screen.getByText("Alterada")).toBeInTheDocument();
    rerender(<ClauseEditorCard {...props({ active: false, clause: { ...base, is_core: false, clause_key: "operador" } })} />);
    expect(screen.getByText("Opcional")).toBeInTheDocument();
  });

  it("aberto: digitar no título e no texto avisa o que mudou", () => {
    const p = props();
    render(<ClauseEditorCard {...p} />);
    fireEvent.change(screen.getByLabelText("Título da cláusula"), { target: { value: "OBJETO DO CONTRATO" } });
    expect(p.onChange).toHaveBeenLastCalledWith({ title: "OBJETO DO CONTRATO" });
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "novo texto" } });
    expect(p.onChange).toHaveBeenLastCalledWith({ body: "novo texto" });
  });

  it("título vazio mostra o erro no campo", () => {
    render(<ClauseEditorCard {...props({ problem: "Dê um título à cláusula." })} />);
    expect(screen.getByText("Dê um título à cláusula.")).toBeInTheDocument();
    expect(screen.getByLabelText("Título da cláusula")).toHaveAttribute("aria-invalid", "true");
  });

  it("Inserir campo automático coloca {{chave}} onde está o cursor", () => {
    let last: DraftClause | undefined;
    render(<Harness initial={{ ...base, body: "CNPJ: ." }} onSpy={(c) => (last = c)} />);
    const ta = screen.getByLabelText("Texto") as HTMLTextAreaElement;
    ta.focus();
    ta.setSelectionRange(6, 6); // entre "CNPJ: " e "."
    fireEvent.select(ta);
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "inscrição estadual" } });
    fireEvent.click(screen.getByText("Inscrição estadual"));
    expect(last!.body).toBe("CNPJ: {{vendedora_ie}}.");
  });

  it("Inserir campo no lugar do trecho selecionado", () => {
    let last: DraftClause | undefined;
    render(<Harness initial={{ ...base, body: "valor XXXX fim" }} onSpy={(c) => (last = c)} />);
    const ta = screen.getByLabelText("Texto") as HTMLTextAreaElement;
    ta.setSelectionRange(6, 10);
    fireEvent.select(ta);
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "valor total em números" } });
    fireEvent.click(screen.getByText("Valor total (em números)"));
    expect(last!.body).toBe("valor {{valor_total_numerico}} fim");
  });

  it("Negrito envolve o trecho selecionado com **", () => {
    let last: DraftClause | undefined;
    render(<Harness initial={{ ...base, body: "um dois três" }} onSpy={(c) => (last = c)} />);
    const ta = screen.getByLabelText("Texto") as HTMLTextAreaElement;
    ta.setSelectionRange(3, 7);
    fireEvent.select(ta);
    fireEvent.click(screen.getByRole("button", { name: "Negrito" }));
    expect(last!.body).toBe("um **dois** três");
  });

  it("Lista coloca '- ' nas linhas selecionadas", () => {
    let last: DraftClause | undefined;
    render(<Harness initial={{ ...base, body: "A\nB" }} onSpy={(c) => (last = c)} />);
    const ta = screen.getByLabelText("Texto") as HTMLTextAreaElement;
    ta.setSelectionRange(0, 3);
    fireEvent.select(ta);
    fireEvent.click(screen.getByRole("button", { name: "Lista" }));
    expect(last!.body).toBe("- A\n- B");
  });

  it("lista, com o nome em português, os campos que o texto usa (sem repetir; desconhecidos ficam só no alerta)", () => {
    render(<ClauseEditorCard {...props({ clause: { ...base, body: "{{vendedora_cnpj}} e {{vendedora_cnpj}} e {{valor_total_numerico}} e {{inventado}}" } })} />);
    const row = screen.getByLabelText("Campos automáticos usados neste texto");
    expect(row).toHaveTextContent("Preenchidos sozinhos:CNPJValor total (em números)");
    expect(row).not.toHaveTextContent("inventado");
  });

  it("sem campos no texto, a linha dos campos não aparece", () => {
    render(<ClauseEditorCard {...props({ clause: { ...base, body: "só texto" } })} />);
    expect(screen.queryByLabelText("Campos automáticos usados neste texto")).not.toBeInTheDocument();
  });

  it("campo desconhecido gera alerta em vermelho listando o código; texto só com campos conhecidos, não", () => {
    const { rerender } = render(<ClauseEditorCard {...props({ clause: { ...base, body: "x {{inventado}} y" } })} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("O sistema não preenche este campo");
    expect(alert).toHaveTextContent("{{inventado}}");
    rerender(<ClauseEditorCard {...props()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("alerta com mais de um campo desconhecido usa o plural", () => {
    render(<ClauseEditorCard {...props({ clause: { ...base, body: "{{a1}} {{b2}}" } })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("estes campos");
  });

  it("opção 'Cláusula opcional' só existe para cláusulas com chave interna e inverte is_core", () => {
    const p = props();
    const { rerender } = render(<ClauseEditorCard {...p} />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    const keyed = { ...base, clause_key: "operador", is_core: true };
    const p2 = props({ clause: keyed });
    rerender(<ClauseEditorCard {...p2} />);
    const sw = screen.getByRole("switch", { name: "Cláusula opcional" });
    expect(sw).not.toBeChecked();
    fireEvent.click(sw);
    expect(p2.onChange).toHaveBeenLastCalledWith({ is_core: false });
    expect(screen.getByText(/Cláusulas de operador/)).toBeInTheDocument();
  });

  it("subir/descer: bloqueados nas pontas e chamam onMove com -1/+1", () => {
    const p = props({ index: 1, total: 3 });
    const { rerender } = render(<ClauseEditorCard {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Subir cláusula" }));
    fireEvent.click(screen.getByRole("button", { name: "Descer cláusula" }));
    expect(p.onMove).toHaveBeenNthCalledWith(1, -1);
    expect(p.onMove).toHaveBeenNthCalledWith(2, 1);
    rerender(<ClauseEditorCard {...props({ index: 0, total: 3 })} />);
    expect(screen.getByRole("button", { name: "Subir cláusula" })).toBeDisabled();
    rerender(<ClauseEditorCard {...props({ index: 2, total: 3 })} />);
    expect(screen.getByRole("button", { name: "Descer cláusula" })).toBeDisabled();
  });

  it("remover pede confirmação e só então chama onRemove", () => {
    const p = props();
    render(<ClauseEditorCard {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover cláusula" }));
    expect(screen.getByText("Remover esta cláusula?")).toBeInTheDocument();
    expect(p.onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Manter" }));
    expect(p.onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remover cláusula" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(p.onRemove).toHaveBeenCalledTimes(1);
  });
});
