import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const KEY = "soima:contract-templates:help-open";

/** Lembra a escolha da pessoa; na primeira visita começa aberta, menos no celular (onde ocuparia a tela toda). */
function readOpen(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
  } catch {
    /* sem armazenamento local */
  }
  return typeof window !== "undefined" && !!window.matchMedia?.("(min-width: 640px)").matches;
}

/** Explicação curta de como o editor funciona. */
export function HowItWorks() {
  const [open, setOpen] = useState(readOpen);
  const change = (v: boolean) => {
    setOpen(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* sem armazenamento local: só não lembra */
    }
  };

  return (
    <Collapsible open={open} onOpenChange={change} className="rounded-lg border bg-card">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
        Como funciona
        <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li><strong className="text-foreground">Clique numa cláusula</strong> — na lista ou direto no contrato ao lado — para editar o texto.</li>
            <li>Para colocar um dado que muda a cada contrato (CNPJ, valor, prazo…), use <strong className="text-foreground">Inserir campo automático</strong>. Não precisa digitar nada técnico.</li>
            <li>O contrato ao lado mostra <strong className="text-foreground">como vai ficar</strong>, com dados de exemplo. Quando estiver bom, clique em <strong className="text-foreground">Salvar alterações</strong>: antes disso nada muda no sistema.</li>
          </ol>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <span><span className="rounded bg-sky-100 px-1 text-sky-900 ring-1 ring-sky-200">azul</span> preenchido automaticamente</span>
            <span><span className="rounded bg-amber-100 px-1 text-amber-900 ring-1 ring-amber-300">amarelo</span> sem dado (sai “—”)</span>
            <span><span className="rounded bg-red-100 px-1 text-red-800 ring-1 ring-red-300">vermelho</span> campo que o sistema não conhece</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
