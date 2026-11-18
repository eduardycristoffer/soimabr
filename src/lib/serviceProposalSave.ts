import { buildServiceQuotePayload, toQuoteItemRows, type ServiceQuoteInput } from "@/lib/serviceProposal";

export type SaveMode = "draft" | "finalized" | "keep";

export interface SaveQuoteArgs {
  mode: SaveMode;
  /** proposta que está sendo editada (vazio ao criar ou duplicar) */
  editingQuoteId?: string | null;
  /** status da proposta editada (para "manter finalizada") */
  originalStatus?: string | null;
  userId: string;
  /** colunas de `quotes` (sem status e datas, que dependem do botão usado) */
  payload: Record<string, any>;
  /** linhas de `quote_items` para o id da proposta (lista vazia = nenhuma linha) */
  rowsFor: (quoteId: string) => Array<Record<string, any>>;
}

export interface SaveServiceArgs {
  mode: SaveMode;
  /** proposta que está sendo editada (vazio ao criar ou duplicar) */
  editingQuoteId?: string | null;
  /** status da proposta editada (para "manter finalizada") */
  originalStatus?: string | null;
  userId: string;
  input: ServiceQuoteInput;
}

export interface SaveServiceResult {
  quoteId: string;
  quoteNumber: string;
}

/** Só o que usamos do cliente do Supabase — facilita testar sem banco. */
type Db = { from: (table: string) => any };

/**
 * Grava uma proposta com suas linhas de preço (quotes + quote_items). Serve à proposta de serviço e à de locação.
 *
 * Cuidado com a ordem: o banco não tem transação aqui, então cada passo é feito de modo que uma
 * falha no meio não deixe a proposta SEM itens nem com itens duplicados:
 *  - criar: grava a proposta, depois os itens; se os itens falharem, apaga a proposta recém-criada;
 *  - editar: guarda o histórico, grava os itens NOVOS, atualiza a proposta e só então apaga os
 *    itens ANTIGOS; se a atualização falhar, os itens novos são desfeitos e os antigos continuam.
 */
export async function saveQuoteWithItems(db: Db, a: SaveQuoteArgs): Promise<SaveServiceResult> {
  const { mode, editingQuoteId, originalStatus, userId, rowsFor } = a;

  const finalStatus =
    mode === "keep" ? (originalStatus === "finalized" ? "finalized" : "draft") : mode === "finalized" ? "finalized" : "draft";
  const payload: Record<string, any> = { ...a.payload, status: finalStatus };

  if (editingQuoteId) {
    const { data: current, error: readErr } = await db
      .from("quotes")
      .select("*, quote_items(*)")
      .eq("id", editingQuoteId)
      .single();
    if (readErr || !current) throw readErr || new Error("Proposta não encontrada.");

    // histórico: como a proposta estava antes desta alteração
    const { count } = await db.from("quote_versions").select("id", { count: "exact", head: true }).eq("quote_id", editingQuoteId);
    const { error: versionErr } = await db.from("quote_versions").insert({
      quote_id: editingQuoteId,
      version_number: (count || 0) + 1,
      snapshot: current,
      edited_by: userId,
    });
    if (versionErr) throw versionErr;

    const oldIds: string[] = (current.quote_items || []).map((r: any) => r.id);
    let newIds: string[] = [];
    const newRows = rowsFor(editingQuoteId);
    if (newRows.length > 0) {
      const { data: inserted, error: insErr } = await db.from("quote_items").insert(newRows).select("id");
      if (insErr) throw insErr;
      newIds = (inserted || []).map((r: any) => r.id);
    }

    const { error: updateErr } = await db
      .from("quotes")
      .update({
        ...payload,
        finalized_at:
          finalStatus === "finalized"
            ? (mode === "keep" && current.finalized_at ? current.finalized_at : new Date().toISOString())
            : null,
      })
      .eq("id", editingQuoteId);
    if (updateErr) {
      if (newIds.length) await db.from("quote_items").delete().in("id", newIds); // desfaz os itens novos
      throw updateErr;
    }

    if (oldIds.length) await db.from("quote_items").delete().in("id", oldIds);
    return { quoteId: editingQuoteId, quoteNumber: current.quote_number || "" };
  }

  const { data: quote, error: quoteErr } = await db
    .from("quotes")
    .insert({
      ...payload,
      quote_number: "", // o banco preenche (PROaaNNNN)
      created_by: userId,
      finalized_at: finalStatus === "finalized" ? new Date().toISOString() : null,
    })
    .select("id, quote_number")
    .single();
  if (quoteErr || !quote) throw quoteErr || new Error("Não foi possível criar a proposta.");

  const rows = rowsFor(quote.id);
  if (rows.length > 0) {
    const { error: itemsErr } = await db.from("quote_items").insert(rows);
    if (itemsErr) {
      await db.from("quotes").delete().eq("id", quote.id); // não deixa proposta sem itens para trás
      throw itemsErr;
    }
  }
  return { quoteId: quote.id, quoteNumber: quote.quote_number };
}

/** Grava a proposta de serviço (quotes + quote_items). */
export function saveServiceProposal(db: Db, a: SaveServiceArgs): Promise<SaveServiceResult> {
  const { input, ...rest } = a;
  return saveQuoteWithItems(db, {
    ...rest,
    payload: buildServiceQuotePayload(input),
    rowsFor: (quoteId) => toQuoteItemRows(quoteId, input.items),
  });
}
