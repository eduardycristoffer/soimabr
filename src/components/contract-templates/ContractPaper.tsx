import { Fragment } from "react";
import { FileText } from "lucide-react";
import { buildPreviewBlocks, type Block, type Inline } from "@/lib/contractPreview";
import { clauseMode, displayNumber, type DraftClause } from "@/lib/contractTemplateDraft";
import { fieldFullLabel } from "@/lib/contractFields";

/** Estilo da tabela de itens (vem pronta como HTML do mesmo gerador usado no contrato). */
const PAPER_CSS = `
.contract-paper .scope-table{width:100%;border-collapse:collapse;font-size:11px;margin:6px 0}
.contract-paper .scope-table th,.contract-paper .scope-table td{border:1px solid #e5e7eb;padding:4px 6px;vertical-align:top;text-align:left}
.contract-paper .scope-table th{background:#f3f4f6;font-weight:600}
.contract-paper .scope-table .cat-row td{background:#eff6ff;color:#1e40af;font-weight:600}
.contract-paper .scope-table .c-idx,.contract-paper .scope-table .c-qtd{text-align:center;white-space:nowrap}
`;

function FieldChip({ node }: { node: Extract<Inline, { type: "field" }> }) {
  if (!node.known) {
    return (
      <span
        className="rounded bg-red-100 px-1 font-mono text-[11px] text-red-800 ring-1 ring-red-300"
        title="O sistema não conhece este campo: no contrato ele sairia como “—”. Troque por um campo da lista."
        data-field-state="unknown"
      >
        {`{{${node.key}}}`}
      </span>
    );
  }
  if (node.empty) {
    return (
      <span className="rounded bg-amber-100 px-1 text-amber-900 ring-1 ring-amber-300" title={`${fieldFullLabel(node.key)} — sem dado neste exemplo`} data-field-state="empty">
        {node.value}
      </span>
    );
  }
  return (
    <span className="rounded bg-sky-100 px-0.5 text-sky-900 ring-1 ring-sky-200" title={`${fieldFullLabel(node.key)} — preenchido automaticamente`} data-field-state="filled">
      {node.value}
    </span>
  );
}

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === "text") return <Fragment key={i}>{n.text}</Fragment>;
        if (n.type === "field") return <FieldChip key={i} node={n} />;
        if (n.type === "strong") return <strong key={i}><Inlines nodes={n.children} /></strong>;
        return <em key={i}><Inlines nodes={n.children} /></em>;
      })}
    </>
  );
}

type TextBlock = { kind: "p" | "li"; children: Inline[] };
type HtmlBlock = { kind: "html"; html: string; key: string };

function Blocks({ blocks }: { blocks: Block[] }) {
  const out: JSX.Element[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.kind === "li") {
      const items: TextBlock[] = [];
      while (i < blocks.length && blocks[i].kind === "li") items.push(blocks[i++] as TextBlock);
      out.push(
        <ul key={`ul${i}`} className="mb-1.5 list-disc space-y-0.5 pl-5">
          {items.map((li, k) => <li key={k}><Inlines nodes={li.children} /></li>)}
        </ul>,
      );
      continue;
    }
    if (b.kind === "p") out.push(<p key={`p${i}`} className="mb-1.5"><Inlines nodes={(b as TextBlock).children} /></p>);
    else if (b.kind === "blank") out.push(<div key={`b${i}`} className="h-2" aria-hidden />);
    else out.push(<div key={`h${i}`} className="my-1.5 overflow-x-auto" dangerouslySetInnerHTML={{ __html: (b as HtmlBlock).html }} />);
    i++;
  }
  return <>{out}</>;
}

interface Props {
  clauses: DraftClause[];
  sample: Record<string, string>;
  activeUid: string | null;
  onSelect: (uid: string) => void;
}

/**
 * "Folha" do contrato: mostra o texto como ele vai sair, com dados de exemplo. Cada cláusula é clicável
 * (abre a edição dela). A folha é sempre branca, como o papel do PDF, mesmo no tema escuro.
 */
export function ContractPaper({ clauses, sample, activeUid, onSelect }: Props) {
  const hasScopeTable = clauses.some((c) => /itens_inclusos_tabela/i.test(c.body || ""));

  return (
    <div className="contract-paper rounded-lg border bg-white p-5 text-[13px] leading-relaxed text-neutral-900 shadow-sm sm:p-7">
      <style>{PAPER_CSS}</style>

      <div className="mb-5 flex items-start justify-between gap-3 border-b border-neutral-200 pb-3 text-[11px] text-neutral-500">
        <div>
          <div className="font-semibold text-neutral-700">{sample.numero_contrato || "—"}</div>
          <div>{sample.vendedora_razao_social || ""}</div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
          <FileText className="h-3 w-3" /> exemplo
        </div>
      </div>
      <h2 className="mb-0.5 text-center text-xl font-bold text-neutral-900">Contrato</h2>
      <div className="mb-6 text-center text-xs text-neutral-500">Nº {sample.numero_contrato || "—"}</div>

      {clauses.length === 0 && (
        <p className="py-10 text-center text-sm text-neutral-500">Este modelo ainda não tem cláusulas. Adicione a primeira ao lado.</p>
      )}

      <div className="space-y-1">
        {clauses.map((c, idx) => {
          const mode = clauseMode(c);
          const active = c.uid === activeUid;
          const num = displayNumber(idx);
          const blocks = buildPreviewBlocks(c.body, sample);
          return (
            <section
              key={c.uid}
              data-preview-uid={c.uid}
              role="button"
              tabIndex={0}
              aria-label={`Editar cláusula ${num ? num + ". " : ""}${c.title}`}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(c.uid)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(c.uid);
                }
              }}
              className={[
                "group relative -mx-2 cursor-pointer rounded-md px-2 py-2 outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-blue-500",
                active ? "bg-blue-50 ring-2 ring-blue-500" : "hover:bg-neutral-50",
                mode === "optional" ? "border border-dashed border-neutral-300" : "",
              ].join(" ")}
            >
              {mode === "optional" && (
                <span className="absolute right-2 top-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                  Opcional
                </span>
              )}
              <h3 className="mb-1.5 border-b border-neutral-200 pb-1 pr-16 text-[13px] font-bold text-blue-800">
                {num ? `${num}. ` : ""}{c.title || <span className="font-normal italic text-neutral-400">(sem título)</span>}
              </h3>
              <div className="text-justify">
                {blocks.length ? <Blocks blocks={blocks} /> : <p className="italic text-neutral-400">(sem texto)</p>}
              </div>
              <span className="pointer-events-none absolute -top-2 left-2 hidden rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white group-hover:block">
                Clique para editar
              </span>
            </section>
          );
        })}
      </div>

      {clauses.length > 0 && !hasScopeTable && (
        <p className="mt-4 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-center text-[11px] text-neutral-500">
          Nenhuma cláusula usa a tabela de itens: o sistema acrescenta “ESCOPO — ITENS INCLUSOS” ao final do contrato.
        </p>
      )}
    </div>
  );
}
