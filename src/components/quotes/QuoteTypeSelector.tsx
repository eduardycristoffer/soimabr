import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, CalendarClock } from "lucide-react";

interface Props {
  open: boolean;
  onSelect: (type: "venda" | "locacao") => void;
  onClose: () => void;
}

export default function QuoteTypeSelector({ open, onSelect, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Proposta</DialogTitle>
          <DialogDescription>Selecione o tipo de proposta que deseja criar</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-32 flex flex-col gap-3 hover:border-primary hover:bg-accent/50"
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
            className="h-32 flex flex-col gap-3 hover:border-primary hover:bg-accent/50"
            onClick={() => onSelect("locacao")}
          >
            <CalendarClock className="h-8 w-8 text-primary" />
            <div className="text-center">
              <p className="font-semibold">Locação</p>
              <p className="text-xs text-muted-foreground">Proposta de aluguel de grua</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
