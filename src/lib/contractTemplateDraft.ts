/**
 * Edição de um modelo de contrato: rascunho local, o que mudou em relação ao que está salvo,
 * avisos úteis e a gravação em si.
 *
 * Por que rascunho: antes, cada campo gravava no banco ao sair dele (sem aviso, sem desfazer).
 * Agora as mudanças ficam na tela, aparecem na visualização do contrato e só vão para o banco
 * quando a pessoa clica em "Salvar alterações".
 */

export interface ServerClause {
  id: string;
  order_index: number;
  title: string;
  body: string;
  is_core: boolean;
  clause_key: string | null;
}

export interface DraftClause {
  /** chave estável na tela (id do banco, ou "novo-N" para cláusula ainda não salva) */
  uid: string;
  /** id do banco; ausente em cláusula nova */
  id?: string;
  title: string;
  body: string;
  is_core: boolean;
  clause_key: string | null;
}

let counter = 0;

export function toDraft(rows: ServerClause[] | null | undefined): DraftClause[] {
  return [...(rows || [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map((r) => ({ uid: r.id, id: r.id, title: r.title, body: r.body, is_core: r.is_core, clause_key: r.clause_key ?? null }));
}

export function newClause(partial: Partial<DraftClause> = {}): DraftClause {
  counter += 1;
  return { uid: `novo-${counter}`, title: "Nova cláusula", body: "", is_core: true, clause_key: null, ...partial };
}

export function moveClause<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[to]] = [copy[to], copy[index]];
  return copy;
}

/**
 * Número que a cláusula recebe no contrato: a primeira (qualificação das partes) não é numerada,
 * as demais seguem a posição — igual ao PDF do contrato.
 */
export const displayNumber = (index: number): string => (index === 0 ? "" : String(index));

export type ClauseMode = "core" | "optional" | "always";

/**
 * - core: sempre entra no contrato;
 * - optional: sem ser "núcleo" e com chave interna → vira caixa de seleção ao gerar o contrato;
 * - always: sem ser "núcleo" mas sem chave interna → entra sempre (o gerador só filtra as que têm chave).
 */
export function clauseMode(c: Pick<DraftClause, "is_core" | "clause_key">): ClauseMode {
  if (c.is_core) return "core";
  return c.clause_key ? "optional" : "always";
}

// ───────────────────────── o que mudou ─────────────────────────

export interface SavePlan {
  deletes: string[];
  updates: Array<{ id: string; patch: Partial<Pick<ServerClause, "title" | "body" | "is_core" | "order_index">> }>;
  inserts: Array<{ title: string; body: string; is_core: boolean; clause_key: string | null; order_index: number }>;
}

/**
 * Compara o rascunho com o que está salvo.
 * `order_index` só é regravado quando a ordem muda ou entra cláusula nova — assim, abrir e fechar o
 * editor sem mexer em nada nunca aparece como "alteração".
 */
export function planSave(server: ServerClause[], draft: DraftClause[]): SavePlan {
  const byId = new Map(server.map((s) => [s.id, s]));
  const draftIds = new Set(draft.filter((d) => d.id).map((d) => d.id as string));

  const deletes = server.filter((s) => !draftIds.has(s.id)).map((s) => s.id);

  const serverOrder = [...server].sort((a, b) => a.order_index - b.order_index).map((s) => s.id).filter((id) => draftIds.has(id));
  const draftOrder = draft.filter((d) => d.id).map((d) => d.id as string);
  const hasNew = draft.some((d) => !d.id);
  const renumber = hasNew || serverOrder.join("|") !== draftOrder.join("|");

  const updates: SavePlan["updates"] = [];
  draft.forEach((d, position) => {
    if (!d.id) return;
    const s = byId.get(d.id);
    if (!s) return;
    const patch: SavePlan["updates"][number]["patch"] = {};
    if (d.title !== s.title) patch.title = d.title;
    if (d.body !== s.body) patch.body = d.body;
    if (d.is_core !== s.is_core) patch.is_core = d.is_core;
    if (renumber && position !== s.order_index) patch.order_index = position;
    if (Object.keys(patch).length) updates.push({ id: d.id, patch });
  });

  const inserts: SavePlan["inserts"] = [];
  draft.forEach((d, position) => {
    if (d.id) return;
    inserts.push({ title: d.title, body: d.body, is_core: d.is_core, clause_key: d.clause_key, order_index: position });
  });

  return { deletes, updates, inserts };
}

export const countChanges = (p: SavePlan) => p.deletes.length + p.updates.length + p.inserts.length;
export const hasChanges = (p: SavePlan) => countChanges(p) > 0;

/** A cláusula mudou em relação ao salvo? (para o aviso "não salva" no cartão) */
export function clauseIsDirty(server: ServerClause[], c: DraftClause): boolean {
  if (!c.id) return true;
  const s = server.find((x) => x.id === c.id);
  return !s || s.title !== c.title || s.body !== c.body || s.is_core !== c.is_core;
}

// ───────────────────────── avisos ─────────────────────────

/** Números de cláusula citados num texto: "Cláusula 4", "Cláusulas 7 e 8", "cláusulas 1, 2 e 3". */
export function clauseReferences(body: string): number[] {
  const out = new Set<number>();
  const rx = /cl[áa]usulas?\s+(\d+(?:\s*(?:,|e|a|ou)\s*\d+)*)/gi;
  for (const m of (body || "").matchAll(rx)) for (const n of m[1].match(/\d+/g) || []) out.add(Number(n));
  return [...out].sort((a, b) => a - b);
}

export interface ReferenceWarning {
  title: string;
  refs: number[];
}

/**
 * Os textos citam outras cláusulas pelo NÚMERO (ex.: "nos termos da Cláusula 4"). Se a ordem mudou
 * ou entrou/saiu cláusula, esses números podem passar a apontar para a cláusula errada.
 */
export function referenceWarnings(server: ServerClause[], draft: DraftClause[]): ReferenceWarning[] {
  const serverOrder = [...server].sort((a, b) => a.order_index - b.order_index).map((s) => s.id);
  const draftOrder = draft.map((d) => d.id ?? d.uid);
  if (serverOrder.join("|") === draftOrder.join("|")) return [];
  return draft
    .map((d) => ({ title: d.title, refs: clauseReferences(d.body) }))
    .filter((w) => w.refs.length > 0);
}

// ───────────────────────── gravação ─────────────────────────

type Db = { from: (table: string) => any };

/**
 * Grava o plano. Sem transação no banco, então a ordem é: apagar, atualizar, inserir — e se algum passo
 * falhar a gravação para e o erro volta; como o plano é refeito a partir do que está salvo, é seguro tentar de novo.
 */
export async function saveTemplateChanges(db: Db, templateId: string, plan: SavePlan): Promise<void> {
  if (plan.deletes.length) {
    const { error } = await db.from("contract_clauses").delete().in("id", plan.deletes);
    if (error) throw error;
  }
  for (const u of plan.updates) {
    const { error } = await db.from("contract_clauses").update(u.patch).eq("id", u.id);
    if (error) throw error;
  }
  if (plan.inserts.length) {
    const rows = plan.inserts.map((r) => ({ template_id: templateId, ...r }));
    const { error } = await db.from("contract_clauses").insert(rows);
    if (error) throw error;
  }
}

// ───────────────────────── validação e recuperação ─────────────────────────

export interface DraftProblem { uid: string; message: string }

/** Impede salvar cláusula sem título (o PDF e a lista ficariam com uma linha vazia). */
export function validateDraft(draft: DraftClause[]): DraftProblem[] {
  return draft.filter((c) => !c.title.trim()).map((c) => ({ uid: c.uid, message: "Dê um título à cláusula." }));
}

/**
 * Rascunho guardado no navegador (para recuperar se a pessoa sair da página sem salvar).
 * Valida o formato: o que vem do armazenamento local nunca é confiado às cegas.
 */
export function parseStoredDraft(raw: string | null): DraftClause[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const list = Array.isArray(data?.draft) ? data.draft : null;
    if (!list) return null;
    const out: DraftClause[] = [];
    for (const c of list) {
      if (!c || typeof c.uid !== "string" || typeof c.title !== "string" || typeof c.body !== "string" || typeof c.is_core !== "boolean") return null;
      out.push({
        uid: c.uid,
        id: typeof c.id === "string" ? c.id : undefined,
        title: c.title,
        body: c.body,
        is_core: c.is_core,
        clause_key: typeof c.clause_key === "string" ? c.clause_key : null,
      });
    }
    return out;
  } catch {
    return null;
  }
}

export const serializeDraft = (draft: DraftClause[], now: Date = new Date()): string => JSON.stringify({ savedAt: now.toISOString(), draft });

/** Reaproveita um rascunho guardado só se ele ainda faz sentido: cláusulas salvas que sumiram do banco invalidam o resto. */
export function reconcileStoredDraft(server: ServerClause[], stored: DraftClause[] | null): DraftClause[] | null {
  if (!stored) return null;
  const ids = new Set(server.map((s) => s.id));
  if (stored.some((c) => c.id && !ids.has(c.id))) return null;
  return hasChanges(planSave(server, stored)) ? stored : null;
}

/** Ao duplicar uma versão: copia tudo (inclusive a chave interna das cláusulas opcionais). */
export function cloneClauseRows(rows: ServerClause[], templateId: string) {
  return [...rows]
    .sort((a, b) => a.order_index - b.order_index)
    .map((c, i) => ({ template_id: templateId, order_index: i, title: c.title, body: c.body, is_core: c.is_core, clause_key: c.clause_key }));
}

// ───────────────────────── versões do modelo ─────────────────────────

export interface TemplateRowLite { id: string; version: number; is_active: boolean }

/** A versão que o sistema usa nos contratos novos: a mais nova entre as ativas (mesma regra de GenerateContractDialog). */
export function templateInUse<T extends TemplateRowLite>(list: T[]): T | undefined {
  return [...list].filter((t) => t.is_active).sort((a, b) => b.version - a.version)[0];
}

/** Aviso quando há mais de uma versão ativa: só a mais nova vale, e isso confunde quem não sabe. */
export function multipleActiveWarning(list: TemplateRowLite[]): string | null {
  const active = list.filter((t) => t.is_active);
  if (active.length < 2) return null;
  const top = templateInUse(list)!;
  return `Há ${active.length} versões ativas. Os contratos novos usam só a mais nova (v${top.version}); as outras ficam de reserva.`;
}

export interface ActivationImpact { title: string; message: string; danger: boolean }

/** O que muda ao ligar/desligar uma versão — mostrado antes de confirmar. */
export function describeActivation(list: TemplateRowLite[], id: string, next: boolean, typeLabel: string): ActivationImpact {
  const target = list.find((t) => t.id === id);
  if (!target) return { title: "Versão não encontrada", message: "", danger: false };
  const t = typeLabel.toLowerCase();
  const current = templateInUse(list);
  const keep = " Contratos já gerados não mudam.";

  if (next) {
    if (current && current.id !== id && current.version > target.version) {
      return { title: `Ativar a v${target.version}?`, danger: false, message: `A v${current.version} continua sendo a usada nos contratos novos, porque é mais nova. A v${target.version} fica de reserva.${keep}` };
    }
    if (current && current.id !== id) {
      return { title: `Ativar a v${target.version}?`, danger: false, message: `A v${target.version} passa a ser a usada nos contratos novos de ${t}, no lugar da v${current.version}.${keep}` };
    }
    return { title: `Ativar a v${target.version}?`, danger: false, message: `A v${target.version} passa a ser a usada nos contratos novos de ${t}.${keep}` };
  }

  if (current && current.id === id) {
    const others = list.filter((x) => x.is_active && x.id !== id);
    const fallback = templateInUse(others);
    if (fallback) {
      return { title: `Desativar a v${target.version}?`, danger: false, message: `A v${fallback.version} volta a ser a usada nos contratos novos de ${t}.${keep}` };
    }
    return { title: `Desativar a v${target.version}?`, danger: true, message: `Nenhuma versão ficará ativa: não será possível gerar contratos de ${t} até ativar uma.${keep}` };
  }
  return { title: `Desativar a v${target.version}?`, danger: false, message: `Nada muda nos contratos novos: a v${current?.version ?? "?"} continua sendo a usada.${keep}` };
}

/** Versão a mostrar ao abrir: a que está em uso; se nenhuma estiver ativa, a mais nova. */
export function defaultTemplate<T extends TemplateRowLite>(list: T[]): T | undefined {
  return templateInUse(list) ?? [...list].sort((a, b) => b.version - a.version)[0];
}
