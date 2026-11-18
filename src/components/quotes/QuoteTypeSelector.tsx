import { type LucideIcon, CalendarClock, ChevronRight, ShoppingCart, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type QuoteKind = "venda" | "locacao" | "servico";

interface Props {
  open: boolean;
  onSelect: (type: QuoteKind) => void;
  onClose: () => void;
  /**
   * Só liga depois que o SQL da proposta de serviço foi aplicado no banco.
   * Desligado, a lista mostra só Venda e Locação, como sempre.
   */
  serviceEnabled?: boolean;
}

interface Option {
  kind: QuoteKind;
  title: string;
  description: string;
  icon: LucideIcon;
  tint: string;
}

const OPTIONS: Option[] = [
  {
    kind: "venda",
    title: "Venda",
    description: "Venda de equipamento",
    icon: ShoppingCart,
    tint: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
  },
  {
    kind: "locacao",
    title: "Locação",
    description: "Aluguel de grua",
    icon: CalendarClock,
    tint: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
  },
  {
    kind: "servico",
    title: "Serviço",
    description: "Montagem, manutenção e operação",
    icon: Wrench,
    tint: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
];

/** Escolha do tipo de proposta: lista limpa, uma linha por tipo (ícone, nome, descrição). */
export default function QuoteTypeSelector({ open, onSelect, onClose, serviceEnabled = false }: Props) {
  const options = OPTIONS.filter((o) => o.kind !== "servico" || serviceEnabled);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-2xl sm:rounded-3xl">
        <DialogHeader className="space-y-1 px-7 pb-1 pt-8 text-left">
          <DialogTitle className="text-2xl font-semibold tracking-tight">Nova proposta</DialogTitle>
          <DialogDescription className="text-[15px]">Que tipo de proposta você quer criar?</DialogDescription>
        </DialogHeader>

        <ul className="mx-5 mb-6 mt-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-muted/50">
          {options.map((o) => (
            <li key={o.kind}>
              <button
                type="button"
                onClick={() => onSelect(o.kind)}
                className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-muted/80 motion-reduce:transition-none"
              >
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]", o.tint)}>
                  <o.icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold leading-tight">{o.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{o.description}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
