import { describe, it, expect } from "vitest";
import { saveServiceProposal } from "./serviceProposalSave";
import { defaultServiceData, emptyItem } from "./serviceProposal";

interface Call {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  payload?: any;
  filters: Array<[string, string, any]>;
  single?: boolean;
  opts?: any;
}

/** Cliente falso: grava cada chamada e responde pelo roteiro do teste. */
function makeDb(respond: (c: Call) => { data?: any; error?: any; count?: number } | undefined) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const c: Call = { table, op: "select", filters: [] };
    const b: any = {
      select(_cols?: string, o?: any) { c.opts = o; return b; },
      insert(p: any) { c.op = "insert"; c.payload = p; return b; },
      update(p: any) { c.op = "update"; c.payload = p; return b; },
      delete() { c.op = "delete"; return b; },
      eq(k: string, v: any) { c.filters.push(["eq", k, v]); return b; },
      in(k: string, v: any) { c.filters.push(["in", k, v]); return b; },
      single() { c.single = true; return b; },
      then(res: any, rej: any) {
        calls.push(c);
        return Promise.resolve(respond(c) ?? { data: null, error: null }).then(res, rej);
      },
    };
    return b;
  };
  return { db: { from }, calls };
}

const input = () => ({
  client_id: "cli-1", project_name: "Obra", project_location: "Betim", validity_days: 30, notes: "",
  show_unit_prices: true, service: defaultServiceData(),
  items: [
    emptyItem({ description: "Montagem", quantity: 1, unit_price: 23000 }),
    emptyItem({ description: "Hora técnica", unit: "Hs", quantity: null, unit_price: 120 }),
  ],
});
const ops = (calls: Call[]) => calls.map((c) => `${c.op}:${c.table}`);
const boom = { message: "falhou" };

describe("criar proposta de serviço", () => {
  const happy = (c: Call) => {
    if (c.table === "quotes" && c.op === "insert") return { data: { id: "q-new", quote_number: "PRO260050" } };
  };

  it("grava a proposta e depois os itens; devolve o número gerado pelo banco", async () => {
    const { db, calls } = makeDb(happy);
    const r = await saveServiceProposal(db, { mode: "draft", userId: "u1", input: input() });
    expect(r).toEqual({ quoteId: "q-new", quoteNumber: "PRO260050" });
    expect(ops(calls)).toEqual(["insert:quotes", "insert:quote_items"]);
    const q = calls[0].payload;
    expect(q).toMatchObject({
      quote_type: "servico", status: "draft", created_by: "u1", quote_number: "", total: 23000, subtotal: 23000,
      currency: "BRL", finalized_at: null,
    });
    expect(q.service_data.version).toBe(1);
    const rows = calls[1].payload;
    expect(rows).toHaveLength(2);
    expect(rows.every((x: any) => x.quote_id === "q-new")).toBe(true);
    expect(rows.map((x: any) => x.total_price)).toEqual([23000, 0]);
  });

  it("finalizar grava status e data de finalização", async () => {
    const { db, calls } = makeDb(happy);
    await saveServiceProposal(db, { mode: "finalized", userId: "u1", input: input() });
    expect(calls[0].payload.status).toBe("finalized");
    expect(typeof calls[0].payload.finalized_at).toBe("string");
  });

  it("rascunho sem itens não tenta gravar itens", async () => {
    const { db, calls } = makeDb(happy);
    await saveServiceProposal(db, { mode: "draft", userId: "u1", input: { ...input(), items: [] } });
    expect(ops(calls)).toEqual(["insert:quotes"]);
  });

  it("se os itens falharem, apaga a proposta recém-criada (nada de proposta vazia)", async () => {
    const { db, calls } = makeDb((c) => {
      if (c.table === "quotes" && c.op === "insert") return { data: { id: "q-new", quote_number: "PRO260050" } };
      if (c.table === "quote_items") return { error: boom };
    });
    await expect(saveServiceProposal(db, { mode: "draft", userId: "u1", input: input() })).rejects.toEqual(boom);
    expect(ops(calls)).toEqual(["insert:quotes", "insert:quote_items", "delete:quotes"]);
    expect(calls[2].filters).toEqual([["eq", "id", "q-new"]]);
  });

  it("se a proposta falhar, não grava itens", async () => {
    const { db, calls } = makeDb((c) => (c.table === "quotes" ? { error: boom } : undefined));
    await expect(saveServiceProposal(db, { mode: "draft", userId: "u1", input: input() })).rejects.toEqual(boom);
    expect(ops(calls)).toEqual(["insert:quotes"]);
  });
});

describe("editar proposta de serviço", () => {
  const current = {
    id: "q-1", quote_number: "PRO260001", status: "finalized", finalized_at: "2026-06-01T10:00:00Z",
    quote_items: [{ id: "old-1" }, { id: "old-2" }],
  };
  const happy = (c: Call) => {
    if (c.table === "quotes" && c.op === "select") return { data: current };
    if (c.table === "quote_versions" && c.op === "select") return { count: 2 };
    if (c.table === "quote_items" && c.op === "insert") return { data: [{ id: "new-1" }, { id: "new-2" }] };
  };

  it("ordem segura: histórico → itens novos → atualiza proposta → só então apaga os antigos (por id)", async () => {
    const { db, calls } = makeDb(happy);
    const r = await saveServiceProposal(db, { mode: "keep", editingQuoteId: "q-1", originalStatus: "finalized", userId: "u1", input: input() });
    expect(r).toEqual({ quoteId: "q-1", quoteNumber: "PRO260001" });
    expect(ops(calls)).toEqual([
      "select:quotes", "select:quote_versions", "insert:quote_versions", "insert:quote_items", "update:quotes", "delete:quote_items",
    ]);
    const version = calls[2].payload;
    expect(version).toMatchObject({ quote_id: "q-1", version_number: 3, edited_by: "u1" });
    expect(version.snapshot).toBe(current);
    expect(calls[5].filters).toEqual([["in", "id", ["old-1", "old-2"]]]); // só os antigos, nunca "tudo da proposta"
  });

  it("'manter finalizada' preserva a data original de finalização", async () => {
    const { db, calls } = makeDb(happy);
    await saveServiceProposal(db, { mode: "keep", editingQuoteId: "q-1", originalStatus: "finalized", userId: "u1", input: input() });
    const upd = calls.find((c) => c.op === "update")!;
    expect(upd.payload.status).toBe("finalized");
    expect(upd.payload.finalized_at).toBe("2026-06-01T10:00:00Z");
  });

  it("'manter' numa proposta em rascunho continua rascunho", async () => {
    const { db, calls } = makeDb(happy);
    await saveServiceProposal(db, { mode: "keep", editingQuoteId: "q-1", originalStatus: "draft", userId: "u1", input: input() });
    const upd = calls.find((c) => c.op === "update")!;
    expect(upd.payload.status).toBe("draft");
    expect(upd.payload.finalized_at).toBeNull();
  });

  it("voltar para rascunho zera a finalização", async () => {
    const { db, calls } = makeDb(happy);
    await saveServiceProposal(db, { mode: "draft", editingQuoteId: "q-1", originalStatus: "finalized", userId: "u1", input: input() });
    expect(calls.find((c) => c.op === "update")!.payload).toMatchObject({ status: "draft", finalized_at: null });
  });

  it("se atualizar a proposta falhar: desfaz os itens NOVOS e mantém os antigos", async () => {
    const { db, calls } = makeDb((c) => {
      if (c.table === "quotes" && c.op === "update") return { error: boom };
      return happy(c);
    });
    await expect(
      saveServiceProposal(db, { mode: "keep", editingQuoteId: "q-1", originalStatus: "finalized", userId: "u1", input: input() }),
    ).rejects.toEqual(boom);
    const deletes = calls.filter((c) => c.op === "delete");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].filters).toEqual([["in", "id", ["new-1", "new-2"]]]);
  });

  it("se gravar os itens novos falhar: nada é atualizado nem apagado", async () => {
    const { db, calls } = makeDb((c) => {
      if (c.table === "quote_items" && c.op === "insert") return { error: boom };
      return happy(c);
    });
    await expect(
      saveServiceProposal(db, { mode: "keep", editingQuoteId: "q-1", originalStatus: "finalized", userId: "u1", input: input() }),
    ).rejects.toEqual(boom);
    expect(calls.some((c) => c.op === "update")).toBe(false);
    expect(calls.some((c) => c.op === "delete")).toBe(false);
  });

  it("proposta que não existe mais: erro claro, nada é gravado", async () => {
    const { db, calls } = makeDb((c) => (c.table === "quotes" && c.op === "select" ? { data: null, error: null } : undefined));
    await expect(
      saveServiceProposal(db, { mode: "draft", editingQuoteId: "q-x", userId: "u1", input: input() }),
    ).rejects.toThrow(/não encontrada/i);
    expect(calls.some((c) => c.op !== "select")).toBe(false);
  });

  it("falha ao guardar o histórico interrompe antes de mexer nos itens", async () => {
    const { db, calls } = makeDb((c) => {
      if (c.table === "quote_versions" && c.op === "insert") return { error: boom };
      return happy(c);
    });
    await expect(
      saveServiceProposal(db, { mode: "draft", editingQuoteId: "q-1", userId: "u1", input: input() }),
    ).rejects.toEqual(boom);
    expect(calls.some((c) => c.table === "quote_items")).toBe(false);
  });
});
