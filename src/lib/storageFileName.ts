/**
 * Gera um nome de arquivo seguro para usar como chave no Supabase Storage.
 *
 * O Storage recusa chaves com caracteres como "[", "]", "#", "%" ou acentos
 * ("Invalid key"). Nomes vindos de plataformas de assinatura costumam ter
 * colchetes, ex.: "CONTRATO DE VENDA - [conformidade].pdf".
 *
 * - remove acentos e substitui qualquer caractere fora de A-Z a-z 0-9 . _ - por "_"
 * - preserva a extensão
 * - limita o tamanho total
 */
export function sanitizeStorageFileName(name: string, maxLength = 100): string {
  const raw = (name || "").trim() || "arquivo";
  const dot = raw.lastIndexOf(".");
  const hasExt = dot > 0 && dot < raw.length - 1 && raw.length - dot <= 8;
  const base = hasExt ? raw.slice(0, dot) : raw;
  const ext = hasExt ? raw.slice(dot + 1) : "";

  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[._-]+|[._-]+$/g, "");

  const safeExt = clean(ext).toLowerCase();
  const suffix = safeExt ? `.${safeExt}` : "";
  const safeBase = clean(base).slice(0, Math.max(1, maxLength - suffix.length)) || "arquivo";
  return `${safeBase}${suffix}`;
}
