import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FieldPicker } from "./FieldPicker";
import { buildSampleMap } from "@/lib/contractSample";

afterEach(cleanup);
const sample = buildSampleMap(new Date("2026-11-18T12:00:00Z"));

describe("menu Inserir campo automático", () => {
  it("abre com os grupos e mostra o dado de exemplo ao lado de cada campo", () => {
    render(<FieldPicker sample={sample} onPick={() => {}} />);
    expect(screen.queryByText("Nossa empresa")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    expect(screen.getByText("Nossa empresa")).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText("Valores e pagamento")).toBeInTheDocument();
    expect(screen.getAllByText(sample.vendedora_cnpj).length).toBeGreaterThan(0);
  });

  it("busca em português (CNPJ) e escolhe: devolve a chave técnica e fecha o menu", () => {
    const onPick = vi.fn();
    render(<FieldPicker sample={sample} onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "inscrição estadual" } });
    fireEvent.click(screen.getByText("Inscrição estadual"));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith("vendedora_ie");
    expect(screen.queryByPlaceholderText(/Buscar/)).not.toBeInTheDocument();
  });

  it("busca por palavra inteira (não 'parecida'): 'cidade' não traz 'Inscrição estadual'", () => {
    render(<FieldPicker sample={sample} onPick={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "cidade" } });
    expect(screen.getByText("Cidade")).toBeInTheDocument(); // Cliente · Cidade
    expect(screen.getByText("Cidade do foro")).toBeInTheDocument();
    expect(screen.queryByText("Inscrição estadual")).not.toBeInTheDocument();
  });

  it("busca ignora acento e usa várias palavras ('cnpj cliente' acha só o do cliente)", () => {
    render(<FieldPicker sample={sample} onPick={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "inscricao" } });
    expect(screen.getByText("Inscrição estadual")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "cnpj cliente" } });
    expect(screen.getByText("CNPJ ou CPF")).toBeInTheDocument();
    expect(screen.queryByText("Inscrição estadual")).not.toBeInTheDocument();
    expect(screen.queryByText("CNPJ")).not.toBeInTheDocument(); // o da nossa empresa
  });

  it("busca sem resultado mostra aviso", () => {
    render(<FieldPicker sample={sample} onPick={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "zzzzqq" } });
    expect(screen.getByText("Nenhum campo encontrado.")).toBeInTheDocument();
  });

  it("tabela de itens aparece como '(tabela)' e não como HTML", () => {
    render(<FieldPicker sample={sample} onPick={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    expect(screen.getAllByText("(tabela)").length).toBeGreaterThan(0);
    expect(document.body.innerHTML).not.toContain("%%HTML%%");
  });

  it("desabilitado não abre", () => {
    render(<FieldPicker sample={sample} onPick={() => {}} disabled />);
    fireEvent.click(screen.getByRole("button", { name: /Inserir campo automático/ }));
    expect(screen.queryByPlaceholderText(/Buscar/)).not.toBeInTheDocument();
  });
});
