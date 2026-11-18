import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CloseQuoteDialog, { type CloseQuoteTarget } from "./CloseQuoteDialog";
import { todayBR } from "@/lib/quoteClosing";

const h = vi.hoisted(() => ({
  calls: [] as Array<{ op: string; args: any[] }>,
  result: { data: [{ id: "q1" }] as any, error: null as any },
  user: { data: { user: { id: "user-1" } } as any, error: null as any },
  toasts: [] as any[],
}));

vi.mock("@/hooks/use-toast", () => ({ toast: (t: any) => h.toasts.push(t) }));
vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    update: (p: any) => { h.calls.push({ op: "update", args: [p] }); return builder; },
    eq: (...a: any[]) => { h.calls.push({ op: "eq", args: a }); return builder; },
    is: (...a: any[]) => { h.calls.push({ op: "is", args: a }); return builder; },
    not: (...a: any[]) => { h.calls.push({ op: "not", args: a }); return builder; },
    select: (...a: any[]) => { h.calls.push({ op: "select", args: a }); return builder; },
    then: (res: any, rej: any) => Promise.resolve(h.result).then(res, rej),
  };
  return { supabase: { auth: { getUser: async () => h.user }, from: () => builder } };
});

const quote: CloseQuoteTarget = {
  id: "q1", quote_number: "PRO262746", project_name: "Obra Corporate", total: 570120, currency: "BRL",
  created_at: "2026-01-02T12:00:00Z", clients: { razao_social: "Construtora Santos Ltda", nome_fantasia: "Santos" },
};

function setup(over: Partial<{ mode: "close" | "undo"; quote: CloseQuoteTarget }> = {}) {
  const onClose = vi.fn();
  const onDone = vi.fn();
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <CloseQuoteDialog quote={over.quote ?? quote} mode={over.mode ?? "close"} open onClose={onClose} onDone={onDone} />
    </QueryClientProvider>,
  );
  return { onClose, onDone };
}
const ops = () => h.calls.map((c) => c.op);

beforeEach(() => {
  h.calls.length = 0;
  h.toasts.length = 0;
  h.result = { data: [{ id: "q1" }], error: null };
  h.user = { data: { user: { id: "user-1" } }, error: null };
});
afterEach(cleanup);

describe("confirmar fechamento", () => {
  it("mostra o resumo da proposta e a data de hoje", () => {
    setup();
    expect(screen.getByText("Confirmar fechamento", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("PRO262746")).toBeInTheDocument();
    expect(screen.getByText("Santos")).toBeInTheDocument();
    expect(screen.getByText(/570\.120,00/)).toBeInTheDocument();
    expect((screen.getByLabelText("Data do fechamento") as HTMLInputElement).value).toBe(todayBR());
  });

  it("grava o fechamento só se a proposta ainda estiver finalizada e em aberto", async () => {
    const { onClose, onDone } = setup();
    fireEvent.change(screen.getByLabelText(/Observação/), { target: { value: "  pedido de compra 123  " } });
    fireEvent.change(screen.getByLabelText("Data do fechamento"), { target: { value: "2026-02-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar fechamento" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const upd = h.calls.find((c) => c.op === "update")!.args[0];
    expect(upd).toEqual({ closed_at: "2026-02-10T15:00:00.000Z", closed_by: "user-1", closing_note: "pedido de compra 123" });
    expect(h.calls.filter((c) => c.op === "eq").map((c) => c.args)).toEqual([["id", "q1"], ["status", "finalized"]]);
    expect(h.calls.find((c) => c.op === "is")!.args).toEqual(["closed_at", null]);
    expect(onDone).toHaveBeenCalled();
    expect(h.toasts[0]).toMatchObject({ title: "Fechamento confirmado" });
  });

  it("observação vazia vira nulo", async () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar fechamento" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(h.calls.find((c) => c.op === "update")!.args[0].closing_note).toBeNull();
  });

  it("data no futuro: mostra o motivo, bloqueia o botão e não grava", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Data do fechamento"), { target: { value: "2099-01-01" } });
    expect(screen.getByText(/não pode ser no futuro/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar fechamento" })).toBeDisabled();
    expect(ops()).toEqual([]);
  });

  it("data anterior à criação da proposta é recusada", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Data do fechamento"), { target: { value: "2025-12-31" } });
    expect(screen.getByText(/anterior à criação/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar fechamento" })).toBeDisabled();
  });

  it("proposta que já foi fechada por outra pessoa: avisa e não fecha a janela como se tivesse dado certo", async () => {
    h.result = { data: [], error: null };
    const { onClose, onDone } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar fechamento" }));
    await waitFor(() => expect(h.toasts.length).toBe(1));
    expect(h.toasts[0]).toMatchObject({ title: "Não foi possível salvar", variant: "destructive" });
    expect(h.toasts[0].description).toMatch(/já foi fechada/);
    expect(onClose).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("erro do banco aparece e nada é dado como feito", async () => {
    h.result = { data: null, error: { message: "permissão negada" } };
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar fechamento" }));
    await waitFor(() => expect(h.toasts.length).toBe(1));
    expect(h.toasts[0].description).toBe("permissão negada");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sessão expirada: orienta a entrar de novo e não toca no banco", async () => {
    h.user = { data: { user: null }, error: null };
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar fechamento" }));
    await waitFor(() => expect(h.toasts.length).toBe(1));
    expect(h.toasts[0].description).toMatch(/Sessão expirada/);
    expect(ops()).toEqual([]);
  });
});

describe("desfazer fechamento", () => {
  const closed = { ...quote, closed_at: "2026-02-10T15:00:00.000Z", closing_note: "pedido 123" };

  it("mostra quando foi fechada e a observação, sem pedir data", () => {
    setup({ mode: "undo", quote: closed });
    expect(screen.getByText("Desfazer fechamento", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("10/02/2026")).toBeInTheDocument();
    expect(screen.getByText("pedido 123")).toBeInTheDocument();
    expect(screen.queryByLabelText("Data do fechamento")).not.toBeInTheDocument();
  });

  it("limpa os três campos, só em proposta que está fechada", async () => {
    const { onClose } = setup({ mode: "undo", quote: closed });
    fireEvent.click(screen.getByRole("button", { name: "Desfazer fechamento" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(h.calls.find((c) => c.op === "update")!.args[0]).toEqual({ closed_at: null, closed_by: null, closing_note: null });
    expect(h.calls.find((c) => c.op === "not")!.args).toEqual(["closed_at", "is", null]);
    expect(h.toasts[0]).toMatchObject({ title: "Fechamento desfeito" });
  });
});
