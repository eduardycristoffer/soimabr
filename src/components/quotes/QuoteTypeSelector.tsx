import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, CalendarClock, Wrench } from "lucide-react";

export type QuoteKind = "venda" | "locacao" | "servico";

interface Props {
  open: boolean;
  onSelect: (type: QuoteKind) => void;
  onClose: () => void;
  /**
   * Só liga depois que o SQL da proposta de serviço foi aplicado no banco.
   * Desligado, a janela é idêntica à de sempre (Venda e Locação).
   */
  serviceEnabled?: boolean;
}

export default function QuoteTypeSelector({ open, onSelect, onClose, serviceEnabled = false }: Props) {
  // com 3 opções os textos precisam quebrar linha; com 2 a janela fica idêntica à de sempre
  const wrap = serviceEnabled ? " whitespace-normal px-2" : "";
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={serviceEnabled ? "max-w-xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle>Nova Proposta</DialogTitle>
          <DialogDescription>Selecione o tipo de proposta que deseja criar</DialogDescription>
        </DialogHeader>
        <div className={serviceEnabled ? "grid grid-cols-1 gap-4 py-4 sm:grid-cols-3" : "grid grid-cols-2 gap-4 py-4"}>
          <Button
            variant="outline"
            className={"h-32 flex flex-col gap-3 hover:border-primary hover:bg-accent/50" + wrap}
            onClick={() => onSelect("venda")}
          >
            <ShoppingCart className="h-8 w-8 text-primary" />
            <div className="text-center">
              <p className="font-semibold">Venda</p>
              <p className="text-xs text-muted-foreground">Proposta de venda de equipamento</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className={"h-32 flex flex-col gap-3 hover:border-primary hover:bg-accent/50" + wrap}
            onClick={() => onSelect("locacao")}
          >
            <CalendarClock className="h-8 w-8 text-primary" />
            <div className="text-center">
              <p className="font-semibold">Locação</p>
              <p className="text-xs text-muted-foreground">Proposta de aluguel de grua</p>
            </div>
          </Button>
          {serviceEnabled && (
            <Button
              variant="outline"
              className={"h-32 flex flex-col gap-3 hover:border-primary hover:bg-accent/50" + wrap}
              onClick={() => onSelect("servico")}
            >
              <Wrench className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="font-semibold">Serviço</p>
                <p className="text-xs text-muted-foreground">Montagem, manutenção e operação</p>
              </div>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
