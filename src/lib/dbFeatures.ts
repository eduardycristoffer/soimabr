import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, boolean>();

/**
 * Informa se uma coluna já existe no banco.
 *
 * O Lovable não roda migrations vindas do git: elas só passam a valer depois de aplicadas
 * pelo chat do Lovable ou pelo SQL editor. Este detector deixa o código novo conviver com o
 * banco antigo — a funcionalidade que depende da coluna só liga quando ela existir.
 *
 * O resultado é guardado em memória; erros de rede NÃO são guardados (tenta de novo depois).
 */
export async function hasColumn(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const { error } = await (supabase.from(table as any) as any).select(column).limit(0);
  if (!error) {
    cache.set(key, true);
    return true;
  }
  const msg = String(error.message || "");
  const missing = error.code === "42703" || error.code === "PGRST204" || /does not exist|could not find/i.test(msg);
  if (missing) cache.set(key, false);
  return false;
}
