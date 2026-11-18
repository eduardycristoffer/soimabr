import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WizardHeaderStep {
  id: number;
  title: string;
  description?: string;
}

interface Props {
  title: string;
  steps: WizardHeaderStep[];
  /** etapa atual (começa em 1) */
  current: number;
  onBack: () => void;
  /** só etapas já concluídas podem ser reabertas */
  onGoTo: (id: number) => void;
}

/**
 * Cabeçalho das propostas (venda, locação e serviço): título, "Etapa N de M", barra de progresso fina
 * e a lista de etapas. Visual limpo: o que importa é a etapa atual.
 */
export default function WizardHeader({ title, steps, current, onBack, onGoTo }: Props) {
  const total = steps.length;
  const step = steps[Math.min(Math.max(current, 1), total) - 1];
  const percent = Math.round((current / total) * 100);

  return (
    <header className="space-y-4">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" className="-ml-2 mt-0.5 h-9 w-9 shrink-0 rounded-full" onClick={onBack} aria-label="Voltar para a lista">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Etapa {current} de {total} · {step.title}
            {step.description ? <span className="hidden sm:inline"> — {step.description}</span> : null}
          </p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Progresso da proposta"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>

      <nav aria-label="Etapas da proposta" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-thin">
        {steps.map((s) => {
          const state = s.id < current ? "done" : s.id === current ? "current" : "todo";
          return (
            <button
              key={s.id}
              type="button"
              disabled={state !== "done"}
              aria-current={state === "current" ? "step" : undefined}
              onClick={() => onGoTo(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] transition-colors motion-reduce:transition-none",
                state === "current" && "bg-foreground font-medium text-background",
                state === "done" && "cursor-pointer text-foreground/80 hover:bg-muted",
                state === "todo" && "cursor-default text-muted-foreground/70",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium",
                  state === "current" && "bg-background/20",
                  state === "done" && "bg-primary/15 text-primary",
                  state === "todo" && "bg-muted",
                )}
              >
                {state === "done" ? <Check className="h-3 w-3" /> : s.id}
              </span>
              <span className={cn(state !== "current" && "hidden sm:inline")}>{s.title}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
