import { describe, it, expect } from "vitest";
import {
  clauseIsDirty, clauseMode, clauseReferences, countChanges, displayNumber, hasChanges, moveClause, newClause, planSave,
  referenceWarnings, saveTemplateChanges, toDraft, type ServerClause,
  cloneClauseRows, defaultTemplate, describeActivation, multipleActiveWarning, templateInUse, parseStoredDraft, reconcileStoredDraft, serializeDraft, validateDraft,
} from "./contractTemplateDraft";

const S = (id: string, order_index: number, extra: Partial<ServerClause> = {}): ServerClause => ({
  id, order_index, title: `Título ${id}`, body: `Corpo ${id}`, is_core: true, clause_key: null, ...extra,
});
const server = [S("a", 0), S("b", 1), S("c", 2), S("d", 3)];

describe("rascunho", () => {
  it("vem ordenado pela posição salva", () => {
    expect(toDraft([S("c", 2), S("a", 0), S("b", 1)]).map((d) => d.id)).toEqual(["a", "b", "c"]);
    expect(toDraft(null)).toEqual([]);
  });

  it("cláusula nova começa obrigatória, sem id e com chave própria", () => {
    const n = newClause();
    const m = newClause();
    expect(n.id).toBeUndefined();
    expect(n.is_core).toBe(true);
    expect(n.uid).not.toBe(m.uid);
  });

  it("mover respeita as pontas e não altera a lista original", () => {
    const l = ["x", "y", "z"];
    expect(moveClause(l, 1, -1)).toEqual(["y", "x", "z"]);
    expect(moveClause(l, 0, -1)).toBe(l);
    expect(moveClause(l, 2, 1)).toBe(l);
    expect(l).toEqual(["x", "y", "z"]);
  });

  it("numeração do contrato: a primeira não leva número (igual ao PDF)", () => {
    expect([0, 1, 2, 15].map(displayNumber)).toEqual(["", "1", "2", "15"]);
  });

  it("tipo da cláusula", () => {
    expect(clauseMode({ is_core: true, clause_key: null })).toBe("core");
    expect(clauseMode({ is_core: true, clause_key: "operador" })).toBe("core");
    expect(clauseMode({ is_core: false, clause_key: "operador" })).toBe("optional");
    expect(clauseMode({ is_core: false, clause_key: null })).toBe("always");
  });
});

describe("o que mudou (plano de gravação)", () => {
  it("rascunho igual ao salvo: nada a gravar", () => {
    expect(hasChanges(planSave(server, toDraft(server)))).toBe(false);
  });

  it("ordem salva com 'buracos' (0,1,5,9) não vira alteração se ninguém mexeu", () => {
    const gaps = [S("a", 0), S("b", 1), S("c", 5), S("d", 9)];
    expect(hasChanges(planSave(gaps, toDraft(gaps)))).toBe(false);
  });

  it("editar título, texto e tipo grava só o que mudou", () => {
    const d = toDraft(server);
    d[1] = { ...d[1], title: "Novo título" };
    d[2] = { ...d[2], body: "Novo corpo", is_core: false };
    const p = planSave(server, d);
    expect(p.updates).toEqual([
      { id: "b", patch: { title: "Novo título" } },
      { id: "c", patch: { body: "Novo corpo", is_core: false } },
    ]);
    expect(p.deletes).toEqual([]);
    expect(p.inserts).toEqual([]);
  });

  it("trocar a ordem regrava a posição das cláusulas que mudaram", () => {
    const d = moveClause(toDraft(server), 2, -1); // a, c, b, d
    const p = planSave(server, d);
    expect(p.updates).toEqual([
      { id: "c", patch: { order_index: 1 } },
      { id: "b", patch: { order_index: 2 } },
    ]);
  });

  it("remover só apaga; as demais mantêm a posição (sem regravar tudo)", () => {
    const d = toDraft(server).filter((x) => x.id !== "b");
    const p = planSave(server, d);
    expect(p.deletes).toEqual(["b"]);
    expect(p.updates).toEqual([]);
  });

  it("cláusula nova entra na posição em que foi colocada e renumera as que vêm depois", () => {
    const d = toDraft(server);
    d.splice(2, 0, newClause({ title: "Nova", body: "Texto" }));
    const p = planSave(server, d);
    expect(p.inserts).toEqual([{ title: "Nova", body: "Texto", is_core: true, clause_key: null, order_index: 2 }]);
    expect(p.updates).toEqual([
      { id: "c", patch: { order_index: 3 } },
      { id: "d", patch: { order_index: 4 } },
    ]);
  });

  it("contagem de alterações", () => {
    const d = toDraft(server).filter((x) => x.id !== "a");
    d[0] = { ...d[0], title: "x" };
    d.push(newClause());
    expect(countChanges(planSave(server, d))).toBeGreaterThanOrEqual(3);
  });

  it("marca como 'não salva' só a cláusula alterada", () => {
    const d = toDraft(server);
    d[1] = { ...d[1], body: "mudou" };
    expect(d.map((c) => clauseIsDirty(server, c))).toEqual([false, true, false, false]);
    expect(clauseIsDirty(server, newClause())).toBe(true);
  });
});

describe("avisos de citação entre cláusulas", () => {
  it("acha números citados", () => {
    expect(clauseReferences("nos termos da Cláusula 4, e das Cláusulas 7 e 8; veja cláusula 12.")).toEqual([4, 7, 8, 12]);
    expect(clauseReferences("conforme Cláusulas 1, 2 e 3")).toEqual([1, 2, 3]);
    expect(clauseReferences("Clausula 9")).toEqual([9]);
    expect(clauseReferences("sem citação, mas com 4.1.1 e 15 dias")).toEqual([]);
  });

  it("só avisa quando a ordem mudou", () => {
    const s = [S("a", 0), S("b", 1, { body: "nos termos da Cláusula 4" }), S("c", 2)];
    expect(referenceWarnings(s, toDraft(s))).toEqual([]);
    const moved = moveClause(toDraft(s), 2, -1);
    expect(referenceWarnings(s, moved)).toEqual([{ title: "Título b", refs: [4] }]);
  });

  it("entrar ou sair cláusula também desloca os números", () => {
    const s = [S("a", 0), S("b", 1, { body: "ver Cláusula 3" })];
    expect(referenceWarnings(s, toDraft(s).slice(0, 1).concat(toDraft(s)[1]).filter((x) => x.id !== "a"))).toHaveLength(1);
    const withNew = [...toDraft(s), newClause()];
    expect(referenceWarnings(s, withNew)).toHaveLength(1);
  });
});

describe("gravação", () => {
  const makeDb = (fail?: (c: { op: string }) => boolean) => {
    const calls: Array<{ table: string; op: string; payload?: any; filter?: any }> = [];
    const from = (table: string) => {
      const c: any = { table, op: "select" };
      const b: any = {
        delete() { c.op = "delete"; return b; },
        update(p: any) { c.op = "update"; c.payload = p; return b; },
        insert(p: any) { c.op = "insert"; c.payload = p; return b; },
        in(k: string, v: any) { c.filter = [k, v]; return b; },
        eq(k: string, v: any) { c.filter = [k, v]; return b; },
        then(res: any, rej: any) { calls.push(c); return Promise.resolve({ error: fail?.(c) ? { message: "falhou" } : null }).then(res, rej); },
      };
      return b;
    };
    return { db: { from }, calls };
  };

  it("apaga, depois atualiza, depois insere (com o id do modelo)", async () => {
    const d = toDraft(server).filter((x) => x.id !== "d");
    d[0] = { ...d[0], title: "T" };
    d.push(newClause({ title: "N", body: "B" }));
    const { db, calls } = makeDb();
    await saveTemplateChanges(db, "tpl-1", planSave(server, d));
    expect(calls.map((c) => c.op)).toEqual(["delete", "update", "insert"]);
    expect(calls[0].filter).toEqual(["id", ["d"]]);
    expect(calls[2].payload[0]).toMatchObject({ template_id: "tpl-1", title: "N", body: "B" });
  });

  it("sem mudanças não chama o banco", async () => {
    const { db, calls } = makeDb();
    await saveTemplateChanges(db, "tpl-1", planSave(server, toDraft(server)));
    expect(calls).toEqual([]);
  });

  it("se um passo falha, para e devolve o erro (nada depois é tentado)", async () => {
    const d = toDraft(server).filter((x) => x.id !== "d");
    d[0] = { ...d[0], title: "T" };
    const { db, calls } = makeDb((c) => c.op === "update");
    await expect(saveTemplateChanges(db, "tpl-1", planSave(server, d))).rejects.toMatchObject({ message: "falhou" });
    expect(calls.map((c) => c.op)).toEqual(["delete", "update"]);
  });
});

describe("validação, recuperação e cópia de versão", () => {
  it("cláusula sem título (ou só com espaços) impede salvar", () => {
    const d = [...toDraft(server)];
    expect(validateDraft(d)).toEqual([]);
    d[1] = { ...d[1], title: "   " };
    expect(validateDraft(d)).toEqual([{ uid: "b", message: "Dê um título à cláusula." }]);
  });

  it("rascunho guardado: ida e volta preserva tudo", () => {
    const d = toDraft([S("a", 0, { clause_key: "operador", is_core: false })]);
    const back = parseStoredDraft(serializeDraft(d, new Date("2026-11-18T10:00:00Z")));
    expect(back).toEqual(d);
  });

  it("rascunho guardado: lixo, formato errado e campos faltando viram null (nunca confia no armazenamento)", () => {
    expect(parseStoredDraft(null)).toBeNull();
    expect(parseStoredDraft("não é json")).toBeNull();
    expect(parseStoredDraft(JSON.stringify({ draft: "x" }))).toBeNull();
    expect(parseStoredDraft(JSON.stringify({ draft: [{ uid: "a", title: "t", body: "b" }] }))).toBeNull(); // sem is_core
    expect(parseStoredDraft(JSON.stringify({ draft: [{ uid: 1, title: "t", body: "b", is_core: true }] }))).toBeNull();
  });

  it("rascunho guardado só é oferecido se tiver diferença real e ainda couber no que está salvo", () => {
    const same = toDraft(server);
    expect(reconcileStoredDraft(server, same)).toBeNull(); // igual ao salvo: nada a recuperar
    const edited = same.map((c) => (c.uid === "b" ? { ...c, body: "novo" } : c));
    expect(reconcileStoredDraft(server, edited)).toEqual(edited);
    expect(reconcileStoredDraft(server, null)).toBeNull();
    // uma cláusula salva foi apagada por outra pessoa enquanto isso: o rascunho antigo não vale mais
    expect(reconcileStoredDraft(server.filter((s) => s.id !== "c"), edited)).toBeNull();
  });

  it("rascunho com cláusula nova (sem id) também é oferecido", () => {
    const withNew = [...toDraft(server), newClause({ title: "Extra" })];
    expect(reconcileStoredDraft(server, withNew)).toEqual(withNew);
  });

  it("nova versão copia a chave interna e a ordem corrida (0..n-1), mesmo se o original tinha buracos", () => {
    const rows = [S("b", 7, { clause_key: "operador", is_core: false }), S("a", 3)];
    expect(cloneClauseRows(rows, "T2")).toEqual([
      { template_id: "T2", order_index: 0, title: "Título a", body: "Corpo a", is_core: true, clause_key: null },
      { template_id: "T2", order_index: 1, title: "Título b", body: "Corpo b", is_core: false, clause_key: "operador" },
    ]);
  });
});

describe("versões do modelo", () => {
  const T = (id: string, version: number, is_active: boolean) => ({ id, version, is_active });

  it("em uso = a versão ativa mais nova", () => {
    expect(templateInUse([T("a", 1, true), T("b", 2, true), T("c", 3, false)])?.id).toBe("b");
    expect(templateInUse([T("a", 1, false)])).toBeUndefined();
    expect(templateInUse([])).toBeUndefined();
  });

  it("ao abrir mostra a versão em uso; sem nenhuma ativa, a mais nova", () => {
    expect(defaultTemplate([T("a", 1, true), T("b", 2, false)])?.id).toBe("a");
    expect(defaultTemplate([T("a", 1, false), T("b", 2, false)])?.id).toBe("b");
    expect(defaultTemplate([])).toBeUndefined();
  });

  it("aviso só aparece com 2+ versões ativas e cita a que vale", () => {
    expect(multipleActiveWarning([T("a", 1, true), T("b", 2, false)])).toBeNull();
    expect(multipleActiveWarning([T("a", 1, true), T("b", 2, true)])).toBe(
      "Há 2 versões ativas. Os contratos novos usam só a mais nova (v2); as outras ficam de reserva.",
    );
  });

  it("ativar uma versão mais nova que a atual troca a versão usada", () => {
    const r = describeActivation([T("a", 1, true), T("b", 2, false)], "b", true, "Venda");
    expect(r.title).toBe("Ativar a v2?");
    expect(r.message).toContain("no lugar da v1");
    expect(r.danger).toBe(false);
  });

  it("ativar uma versão mais antiga que a atual não muda nada nos contratos novos (e avisa)", () => {
    const r = describeActivation([T("a", 1, false), T("b", 2, true)], "a", true, "Venda");
    expect(r.message).toContain("A v2 continua sendo a usada");
  });

  it("ativar a primeira versão (nenhuma ativa)", () => {
    const r = describeActivation([T("a", 1, false)], "a", true, "Locação");
    expect(r.message).toBe("A v1 passa a ser a usada nos contratos novos de locação. Contratos já gerados não mudam.");
  });

  it("desativar a única ativa é perigoso: ninguém consegue gerar contrato", () => {
    const r = describeActivation([T("a", 1, true), T("b", 2, false)], "a", false, "Venda");
    expect(r.danger).toBe(true);
    expect(r.message).toContain("não será possível gerar contratos de venda");
  });

  it("desativar a usada com outra ativa de reserva: a de reserva volta", () => {
    const r = describeActivation([T("a", 1, true), T("b", 2, true)], "b", false, "Venda");
    expect(r.danger).toBe(false);
    expect(r.message).toContain("A v1 volta a ser a usada");
  });

  it("desativar uma versão de reserva não muda nada", () => {
    const r = describeActivation([T("a", 1, true), T("b", 2, true)], "a", false, "Venda");
    expect(r.message).toContain("Nada muda");
    expect(r.message).toContain("v2");
  });

  it("id desconhecido não quebra", () => {
    expect(describeActivation([T("a", 1, true)], "zzz", true, "Venda").title).toBe("Versão não encontrada");
  });
});
