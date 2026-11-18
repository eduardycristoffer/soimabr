import { HTML_CLOSE, HTML_OPEN, stripHtmlSentinels } from "@/lib/contractPlaceholders";
import { isKnownField } from "@/lib/contractFields";

/**
 * Transforma o texto de uma cláusula no que será mostrado na visualização, seguindo as mesmas regras do
 * PDF do contrato (supabase/functions/generate-contract-pdf → `md()`):
 *   - linha em branco separa parágrafos;
 *   - linha começando com "- " vira item de lista;
 *   - **negrito** e _itálico_;
 *   - tabelas automáticas (itens inclusos) vêm como bloco HTML.
 * Diferença: cada campo automático preenchido é marcado, para a pessoa ver o que muda sozinho.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "field"; key: string; value: string; known: boolean; empty: boolean }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] };

export type Block =
  | { kind: "p" | "li"; children: Inline[] }
  | { kind: "blank" }
  | { kind: "html"; html: string; key: string };

// Marcadores privados (nunca aparecem em texto digitado)
const F_OPEN = "";
const F_MID = "";
const F_CLOSE = "";
const B_OPEN = "";
const B_CLOSE = "";

const FIELD_RX = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

interface FieldRef { key: string; known: boolean; empty: boolean }

/** Primeiro passo: troca {{campo}} pelo valor, marcando onde cada valor começa e termina. */
function substitute(body: string, map: Record<string, string>) {
  const fields: FieldRef[] = [];
  const blocks: Array<{ html: string; key: string }> = [];

  const text = (body || "").replace(FIELD_RX, (_m, key: string) => {
    const known = isKnownField(key) && Object.prototype.hasOwnProperty.call(map, key);
    const raw = known ? map[key] : undefined;
    const empty = raw == null || raw === "";
    const value = empty ? "—" : (raw as string);

    if (!empty && value.includes(HTML_OPEN)) {
      blocks.push({ html: stripHtmlSentinels(value), key });
      return `${B_OPEN}${blocks.length - 1}${B_CLOSE}`;
    }
    fields.push({ key, known, empty });
    const idx = fields.length - 1;
    // Valor com várias linhas: cada linha leva o seu próprio par de marcadores
    return value
      .split("\n")
      .map((piece) => (piece === "" ? "" : `${F_OPEN}${idx}${F_MID}${piece}${F_CLOSE}`)) // linha vazia continua vazia
      .join("\n");
  });
  return { text, fields, blocks };
}

/**
 * Transforma uma linha com marcadores em "texto puro" + de qual campo cada caractere veio.
 * Assim o negrito/itálico (que age sobre o texto puro) pode atravessar o limite de um campo sem
 * deixar marcador sobrando — ex.: o valor "1. **Entrada** — R$ 100" das condições de pagamento.
 */
function flatten(line: string): { plain: string; owner: number[] } {
  let plain = "";
  const owner: number[] = [];
  let current = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === F_OPEN) {
      let j = i + 1;
      let num = "";
      while (j < line.length && line[j] !== F_MID) num += line[j++];
      current = Number(num);
      i = j; // pula até o F_MID
    } else if (ch === F_CLOSE) {
      current = -1;
    } else {
      plain += ch;
      owner.push(current);
    }
  }
  return { plain, owner };
}

/** Junta caracteres seguidos do mesmo dono em pedaços de texto ou de campo. */
function runs(plain: string, owner: number[], start: number, end: number, fields: FieldRef[]): Inline[] {
  const out: Inline[] = [];
  let i = start;
  while (i < end) {
    let j = i;
    while (j < end && owner[j] === owner[i]) j++;
    const piece = plain.slice(i, j);
    if (owner[i] >= 0) {
      const f = fields[owner[i]];
      out.push({ type: "field", key: f.key, value: piece, known: f.known, empty: f.empty });
    } else {
      out.push({ type: "text", text: piece });
    }
    i = j;
  }
  return out;
}

/** **negrito** e _itálico_, como no PDF (mesmas expressões). */
function parseRange(plain: string, owner: number[], start: number, end: number, fields: FieldRef[]): Inline[] {
  const rx = /\*\*(.+?)\*\*|_([^_\n]+)_/;
  const m = rx.exec(plain.slice(start, end));
  if (!m) return runs(plain, owner, start, end, fields);
  const mStart = start + m.index;
  const mEnd = mStart + m[0].length;
  const out: Inline[] = [];
  if (mStart > start) out.push(...runs(plain, owner, start, mStart, fields));
  const isBold = m[1] !== undefined;
  const innerStart = mStart + (isBold ? 2 : 1);
  const innerEnd = mEnd - (isBold ? 2 : 1);
  const children = parseRange(plain, owner, innerStart, innerEnd, fields);
  out.push(isBold ? { type: "strong", children } : { type: "em", children });
  if (mEnd < end) out.push(...parseRange(plain, owner, mEnd, end, fields));
  return out;
}

function parseInline(line: string, fields: FieldRef[]): Inline[] {
  const { plain, owner } = flatten(line);
  return parseRange(plain, owner, 0, plain.length, fields);
}

export function buildPreviewBlocks(body: string, map: Record<string, string>): Block[] {
  const { text, fields, blocks } = substitute(body, map);
  const out: Block[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const blockOnly = line.trim().match(new RegExp(`^${B_OPEN}(\\d+)${B_CLOSE}$`));
    if (blockOnly) {
      const b = blocks[Number(blockOnly[1])];
      out.push({ kind: "html", html: b.html, key: b.key });
      continue;
    }
    // bloco HTML no meio de um texto: o PDF também o coloca à parte
    const cleaned = line.replace(new RegExp(`${B_OPEN}(\\d+)${B_CLOSE}`, "g"), "");
    if (cleaned !== line) {
      const m = line.match(new RegExp(`${B_OPEN}(\\d+)${B_CLOSE}`));
      if (m) out.push({ kind: "html", html: blocks[Number(m[1])].html, key: blocks[Number(m[1])].key });
    }
    if (/^\s*-\s+/.test(cleaned)) out.push({ kind: "li", children: parseInline(cleaned.replace(/^\s*-\s+/, ""), fields) });
    else if (!cleaned.trim()) out.push({ kind: "blank" });
    else out.push({ kind: "p", children: parseInline(cleaned, fields) });
  }

  // não deixa linhas em branco no começo e no fim, nem repetidas
  const compact: Block[] = [];
  for (const b of out) {
    if (b.kind === "blank" && (compact.length === 0 || compact[compact.length - 1].kind === "blank")) continue;
    compact.push(b);
  }
  while (compact.length && compact[compact.length - 1].kind === "blank") compact.pop();
  return compact;
}

export { HTML_OPEN, HTML_CLOSE };
