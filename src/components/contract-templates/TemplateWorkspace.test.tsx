import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Toaster } from "@/components/ui/toaster";
import TemplateWorkspace from "./TemplateWorkspace";

// ───────── banco de mentira, em memória, que registra cada gravação ─────────
const h = vi.hoisted(() => {
  const db: any = { tables: {}, ops: [] as any[], fail: null as null | ((op: any) => string | null), seq: 0 };
  const from = (table: string) => {
    const st: any = { table, op: "select", payload: null, eq: [] as any[], inn: null as any, order: null as any, single: false };
    const run = () => {
      const rows: any[] = db.tables[table] || (db.tables[table] = []);
      const entry: any = { table, op: st.op, payload: st.payload, eq: st.eq, in: st.inn };
      const msg = db.fail?.(entry);
      if (st.op !== "select") db.ops.push(entry);
      if (msg) return { data: null, error: { message: msg } };
      const match = (r: any) => st.eq.every(([c, v]: any) => r[c] === v) && (!st.inn || st.inn[1].includes(r[st.inn[0]]));
      if (st.op === "select") {
        let out = rows.filter(match);
        if (st.order) out = [...out].sort((a, b) => (a[st.order.c] < b[st.order.c] ? -1 : 1) * (st.order.asc ? 1 : -1));
        return { data: out.map((r) => ({ ...r })), error: null };
      }
      if (st.op === "update") { rows.filter(match).forEach((r) => Object.assign(r, st.payload)); return { data: null, error: null }; }
      if (st.op === "delete") { db.tables[table] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
      const list = (Array.isArray(st.payload) ? st.payload : [st.payload]).map((p: any) => ({ id: `new-${++db.seq}`, ...p }));
      rows.push(...list);
      return { data: st.single ? list[0] : list, error: null };
    };
    const b: any = {
      select: () => b,
      insert: (p: any) => { st.op = "insert"; st.payload = p; return b; },
      update: (p: any) => { st.op = "update"; st.payload = p; return b; },
      delete: () => { st.op = "delete"; return b; },
      eq: (c: string, v: any) => { st.eq.push([c, v]); return b; },
      in: (c: string, vs: any[]) => { st.inn = [c, vs]; return b; },
      order: (c: string, o?: any) => { st.order = { c, asc: o?.ascending !== false }; return b; },
      single: () => { st.single = true; return b; },
      then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  };
  return { db, from };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: h.from } }));

const clause = (id: string, order_index: number, title: string, body: string, extra: any = {}) => ({ id, template_id: "t2", order_index, title, body, is_core: true, clause_key: null, ...extra });

function seed() {
  h.db.ops = [];
  h.db.fail = null;
  h.db.seq = 0;
  h.db.tables = {
    contract_templates: [
      { id: "t2", name: "Contrato de venda (v2)", contract_type: "venda", version: 2, is_active: true, company_id: "c1" },
      { id: "t1", name: "Contrato de venda (v1)", contract_type: "venda", version: 1, is_active: false, company_id: "c1" },
      { id: "x1", name: "Locação (v1)", contract_type: "locacao", version: 1, is_active: true, company_id: "c1" },
    ],
    contract_clauses: [
      clause("a", 0, "PARTES", "A vendedora {{vendedora_razao_social}}."),
      clause("b", 1, "OBJETO", "Venda de grua."),
      clause("c", 2, "PREÇO", "Valor {{valor_total_numerico}}, conforme a Cláusula 1."),
      clause("d", 3, "OPERADOR", "Operador incluso.", { is_core: false, clause_key: "operador" }),
      { id: "o1", template_id: "t1", order_index: 0, title: "ANTIGA", body: "texto antigo", is_core: true, clause_key: null },
    ],
    company_settings: [{ id: "c1", razao_social: "SOIMA Ltda", company_name: "SOIMA" }],
  };
}
// a barra de salvar (o Toaster também usa role "status", por isso o nome)
const bar = () => screen.getByRole("status", { name: "Alterações pendentes" });
const queryBar = () => screen.queryByRole("status", { name: "Alterações pendentes" });
const ops = (op?: string) => h.db.ops.filter((o: any) => !op || o.op === op);

function renderWs(props: Partial<React.ComponentProps<typeof TemplateWorkspace>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><TemplateWorkspace type="venda" {...props} /><Toaster /></QueryClientProvider>);
}
// a cláusula existe na lista (editar) e na folha (visualização): aqui clicamos na da lista
const openClause = (name: RegExp) => fireEvent.click(within(screen.getByRole("region", { name: "Cláusulas" })).getByRole("button", { name }));

// O ambiente de teste (Node 26 + jsdom) não tem localStorage: um de memória, para testar o rascunho guardado.
function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

beforeEach(() => { seed(); vi.stubGlobal("localStorage", memoryStorage()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("editor do modelo — abrir", () => {
  it("abre a versão em uso, com as cláusulas na ordem e a visualização ao lado", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    expect(screen.getByRole("button", { name: /v2/ })).toHaveAttribute("aria-pressed", "true");
    const list = screen.getByRole("region", { name: "Cláusulas" });
    expect(within(list).getAllByRole("button", { name: /^Editar cláusula/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Editar cláusula PARTES", "Editar cláusula 1. OBJETO", "Editar cláusula 2. PREÇO", "Editar cláusula 3. OPERADOR",
    ]);
    const paper = screen.getByRole("region", { name: "Visualização do contrato" });
    expect(within(paper).getByRole("heading", { name: "2. PREÇO" })).toBeInTheDocument();
    expect(queryBar()).not.toBeInTheDocument(); // nada alterado: sem barra de salvar
  });

  it("não mostra as cláusulas de outra versão nem de outro tipo", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    expect(screen.queryByText("ANTIGA")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /v1/ })?.getAttribute("aria-pressed")).toBe("false");
  });

  it("sem nenhum modelo do tipo: oferece criar o primeiro (inativo)", async () => {
    h.db.tables.contract_templates = [];
    renderWs();
    fireEvent.click(await screen.findByRole("button", { name: /Criar modelo de venda/ }));
    await waitFor(() => expect(ops("insert")).toHaveLength(1));
    expect(ops("insert")[0].payload).toMatchObject({ contract_type: "venda", version: 1, is_active: false });
  });

  it("erro ao carregar mostra mensagem em vez de tela vazia", async () => {
    h.db.fail = (o: any) => (o.table === "contract_templates" ? "sem permissão" : null);
    renderWs();
    expect(await screen.findByText(/Não foi possível carregar os modelos/)).toHaveTextContent("sem permissão");
  });
});

describe("editor do modelo — editar e salvar", () => {
  it("editar um texto marca como alterada, mostra a barra de salvar e atualiza a visualização", async () => {
    const onDirty = vi.fn();
    renderWs({ onDirtyChange: onDirty });
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Venda de grua torre modelo X." } });
    expect(bar()).toHaveTextContent("1 alteração não salva");
    expect(bar()).toHaveTextContent("Nada muda no sistema até você salvar");
    expect(screen.getByText("Alterada")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Visualização do contrato" })).getByText("Venda de grua torre modelo X.")).toBeInTheDocument();
    expect(onDirty).toHaveBeenLastCalledWith(true);
    expect(ops()).toHaveLength(0); // nada gravado ainda
  });

  it("Salvar grava só o que mudou, volta ao estado limpo e avisa", async () => {
    const onDirty = vi.fn();
    renderWs({ onDirtyChange: onDirty });
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Novo objeto." } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    await waitFor(() => expect(queryBar()).not.toBeInTheDocument());
    expect(ops().map((o: any) => [o.table, o.op])).toEqual([["contract_clauses", "update"]]);
    expect(ops()[0].payload).toEqual({ body: "Novo objeto." });
    expect(ops()[0].eq).toEqual([["id", "b"]]);
    expect(h.db.tables.contract_clauses.find((c: any) => c.id === "b").body).toBe("Novo objeto.");
    await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false));
    expect(screen.queryByText("Alterada")).not.toBeInTheDocument();
  });

  it("adicionar cláusula nova e salvar insere com a ordem certa e sem chave interna", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar cláusula/ }));
    fireEvent.change(screen.getByLabelText("Título da cláusula"), { target: { value: "FORO" } });
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Foro de {{foro_cidade}}." } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    await waitFor(() => expect(ops("insert")).toHaveLength(1));
    expect(ops("insert")[0].payload).toEqual([{ template_id: "t2", title: "FORO", body: "Foro de {{foro_cidade}}.", is_core: true, clause_key: null, order_index: 4 }]);
    await waitFor(() => expect(queryBar()).not.toBeInTheDocument());
    expect(within(screen.getByRole("region", { name: "Visualização do contrato" })).getByRole("heading", { name: "4. FORO" })).toBeInTheDocument();
  });

  it("remover cláusula: só some do banco ao salvar", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.click(screen.getByRole("button", { name: "Remover cláusula" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.queryByRole("button", { name: /OBJETO/ })).not.toBeInTheDocument();
    expect(ops()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    await waitFor(() => expect(ops("delete")).toHaveLength(1));
    expect(ops("delete")[0].in).toEqual(["id", ["b"]]);
    // as outras não são regravadas: o número que aparece vem da posição, então um "buraco" na ordem é inofensivo
    expect(ops("update")).toHaveLength(0);
    await waitFor(() => expect(queryBar()).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "2. OPERADOR" })).toBeInTheDocument();
  });

  it("mudar a ordem avisa sobre textos que citam cláusulas por número", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.click(screen.getByRole("button", { name: "Subir cláusula" }));
    const warn = screen.getByText(/citam outras cláusulas pelo/).closest("[role=alert]")!;
    expect(warn).toHaveTextContent("“PREÇO” cita a cláusula 1");
  });

  it("título vazio bloqueia o salvamento e explica", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Título da cláusula"), { target: { value: "  " } });
    expect(screen.getByRole("button", { name: /Salvar alterações/ })).toBeDisabled();
    expect(bar()).toHaveTextContent("Dê um título a todas as cláusulas");
    expect(screen.getAllByText("Dê um título à cláusula.").length).toBeGreaterThan(0);
  });

  it("Descartar pede confirmação e volta ao que está salvo", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "mudou" } });
    fireEvent.click(screen.getByRole("button", { name: /Descartar/ }));
    expect(screen.getByText("Descartar as alterações?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(bar()).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Descartar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(queryBar()).not.toBeInTheDocument());
    expect(ops()).toHaveLength(0);
    expect(screen.getAllByText("Venda de grua.").length).toBeGreaterThan(0); // voltou ao texto salvo (na lista e na visualização)
  });

  it("falha ao salvar: mantém o que foi digitado, avisa e deixa tentar de novo", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "importante" } });
    h.db.fail = (o: any) => (o.op === "update" ? "falha de rede" : null);
    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    await waitFor(() => expect(screen.getAllByText(/Não foi possível salvar tudo/).length).toBeGreaterThan(0));
    expect((screen.getByLabelText("Texto") as HTMLTextAreaElement).value).toBe("importante");
    expect(bar()).toHaveTextContent("1 alteração não salva");
    h.db.fail = null;
    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    await waitFor(() => expect(queryBar()).not.toBeInTheDocument());
    expect(h.db.tables.contract_clauses.find((c: any) => c.id === "b").body).toBe("importante");
  });
});

describe("editor do modelo — rascunho guardado, versões e proteção", () => {
  it("o rascunho é guardado no navegador e oferecido de volta ao reabrir", async () => {
    const first = renderWs();
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "texto não salvo" } });
    await waitFor(() => expect(localStorage.getItem("soima:contract-draft:t2")).toContain("texto não salvo"));
    first.unmount();

    renderWs();
    const banner = await screen.findByText(/Você tinha alterações não salvas desta versão/);
    expect(banner).toBeInTheDocument();
    expect(queryBar()).not.toBeInTheDocument(); // ainda não recuperou
    fireEvent.click(screen.getByRole("button", { name: "Recuperar" }));
    expect(bar()).toHaveTextContent("1 alteração não salva");
    expect(screen.queryByText(/Você tinha alterações/)).not.toBeInTheDocument();
  });

  it("descartar o rascunho guardado apaga do navegador", async () => {
    localStorage.setItem("soima:contract-draft:t2", JSON.stringify({ savedAt: "x", draft: [{ uid: "a", id: "a", title: "PARTES", body: "outro", is_core: true, clause_key: null }] }));
    renderWs();
    await screen.findByText(/Você tinha alterações não salvas/);
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(localStorage.getItem("soima:contract-draft:t2")).toBeNull();
    expect(screen.queryByText(/Você tinha alterações/)).not.toBeInTheDocument();
  });

  it("rascunho guardado idêntico ao salvo não gera aviso, e salvar apaga o guardado", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    expect(screen.queryByText(/Você tinha alterações/)).not.toBeInTheDocument();
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "x" } });
    await waitFor(() => expect(localStorage.getItem("soima:contract-draft:t2")).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    await waitFor(() => expect(localStorage.getItem("soima:contract-draft:t2")).toBeNull());
  });

  it("trocar de versão com alterações pergunta antes e perde só se confirmar", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "mudou" } });
    fireEvent.click(screen.getByRole("button", { name: /v1/ }));
    expect(screen.getByText("Trocar de versão sem salvar?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ficar aqui" }));
    expect(screen.getByRole("button", { name: /v2/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /v1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Trocar e descartar" }));
    expect((await screen.findAllByText("ANTIGA")).length).toBeGreaterThan(0);
    expect(queryBar()).not.toBeInTheDocument();
    expect(localStorage.getItem("soima:contract-draft:t2")).toBeNull();
  });

  it("trocar de versão sem alterações é direto", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    fireEvent.click(screen.getByRole("button", { name: /v1/ }));
    expect((await screen.findAllByText("ANTIGA")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Trocar de versão sem salvar?")).not.toBeInTheDocument();
  });

  it("Nova versão copia as cláusulas (com a chave interna), fica inativa e abre nela", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    fireEvent.click(screen.getByRole("button", { name: /Nova versão/ }));
    await waitFor(() => expect(ops("insert")).toHaveLength(2));
    const [tpl, cls] = ops("insert");
    expect(tpl.payload).toMatchObject({ name: "Contrato de venda (v3)", version: 3, is_active: false, contract_type: "venda", company_id: "c1" });
    expect(cls.payload.map((r: any) => [r.title, r.order_index, r.clause_key])).toEqual([
      ["PARTES", 0, null], ["OBJETO", 1, null], ["PREÇO", 2, null], ["OPERADOR", 3, "operador"],
    ]);
    expect(cls.payload.every((r: any) => r.template_id === "new-1")).toBe(true); // as cópias apontam para a versão nova
    await waitFor(() => expect(screen.getByRole("button", { name: /v3/ })).toHaveAttribute("aria-pressed", "true"));
  });

  it("Nova versão: se a cópia das cláusulas falha, a versão vazia é desfeita", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    h.db.fail = (o: any) => (o.table === "contract_clauses" && o.op === "insert" ? "erro ao copiar" : null);
    fireEvent.click(screen.getByRole("button", { name: /Nova versão/ }));
    await waitFor(() => expect(ops("delete")).toHaveLength(1));
    expect(ops("delete")[0].table).toBe("contract_templates");
    expect(h.db.tables.contract_templates.some((t: any) => t.version === 3)).toBe(false);
  });

  it("ativar/desativar grava na hora, depois de confirmar", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    fireEvent.click(screen.getByRole("switch", { name: /está ativa/ }));
    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await waitFor(() => expect(ops("update")).toHaveLength(1));
    expect(ops("update")[0]).toMatchObject({ table: "contract_templates", payload: { is_active: false }, eq: [["id", "t2"]] });
  });

  it("trocar a empresa grava company_id", async () => {
    h.db.tables.company_settings.push({ id: "c2", razao_social: "Outra Ltda", company_name: "Outra" });
    renderWs();
    await screen.findByText(/Cláusulas/);
    await screen.findByRole("option", { name: "Outra Ltda" });
    fireEvent.change(screen.getByLabelText("Empresa que assina o contrato"), { target: { value: "c2" } });
    await waitFor(() => expect(ops("update")).toHaveLength(1));
    expect(ops("update")[0].payload).toEqual({ company_id: "c2" });
  });

  it("fechar a aba com alterações não salvas dispara o aviso do navegador", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    const before = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "mudou" } });
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(true);
  });

  it("campo desconhecido no texto: alerta no cartão e vermelho na visualização", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    openClause(/Editar cláusula 1\. OBJETO/);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Aluguel {{valor_mensal}}" } });
    expect(screen.getByRole("alert")).toHaveTextContent("{{valor_mensal}}");
    const paper = screen.getByRole("region", { name: "Visualização do contrato" });
    expect(paper.querySelector('[data-field-state="unknown"]')!.textContent).toBe("{{valor_mensal}}");
  });

  it("clicar na cláusula da visualização abre a edição dela", async () => {
    renderWs();
    await screen.findByText(/Cláusulas/);
    const paper = screen.getByRole("region", { name: "Visualização do contrato" });
    fireEvent.click(within(paper).getByRole("button", { name: /Editar cláusula 2\. PREÇO/ }));
    expect((screen.getByLabelText("Título da cláusula") as HTMLInputElement).value).toBe("PREÇO");
  });
});
