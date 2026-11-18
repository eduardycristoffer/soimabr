import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRefreshFleet } from "@/hooks/useFleet";
import { fleetErrorMessage, saveCost } from "@/lib/fleetApi";
import { parseMoney } from "@/lib/fleetFormat";
import { COST_KIND_LABEL, todayISO, type CostKind } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "./parts";

interface Props {
  open: boolean;
  onClose: () => void;
  unitId: string;
  unitCode: string;
}

/** Lança um investimento (aumenta o valor empregado) ou um custo de operação (reduz o resultado). */
export function CostFormDialog({ open, onClose, unitId, unitCode }: Props) {
  const refresh = useRefreshFleet();
  const [kind, setKind] = useState<CostKind>("manutencao");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) { setKind("manutencao"); setAmount(""); setDate(todayISO()); setDesc(""); setTouched(false); }
  }, [open]);

  const value = parseMoney(amount);
  const errors = {
    amount: value == null || value <= 0 ? "Informe um valor maior que zero." : null,
    date: !date ? "Informe a data." : null,
  };
  const save = useMutation({
    mutationFn: () => saveCost({ unit_id: unitId, rental_id: null, kind, amount: value ?? 0, incurred_on: date, description: desc.trim() || null }),
    onSuccess: () => { refresh(); toast({ title: "Lançamento salvo", description: unitCode }); onClose(); },
    onError: (e) => toast({ title: "Não foi possível salvar", description: fleetErrorMessage(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lançar custo ou investimento — {unitCode}</DialogTitle>
          <DialogDescription>
            <strong>Investimento</strong> (reforma, upgrade) soma ao valor empregado na grua. Os demais são custos de operação e reduzem o resultado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="c-kind" label="Tipo" className="sm:col-span-2">
            <NativeSelect id="c-kind" value={kind} onChange={(e) => setKind(e.target.value as CostKind)}>
              {(Object.keys(COST_KIND_LABEL) as CostKind[]).map((k) => (<option key={k} value={k}>{COST_KIND_LABEL[k]}</option>))}
            </NativeSelect>
          </Field>
          <Field id="c-amount" label="Valor (R$) *" error={touched ? errors.amount : null}>
            <Input id="c-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field id="c-date" label="Data *" error={touched ? errors.date : null}>
            <Input id="c-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field id="c-desc" label="Descrição" className="sm:col-span-2">
            <Input id="c-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: troca do cabo de elevação" />
          </Field>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
          <Button
            disabled={save.isPending}
            onClick={() => { setTouched(true); if (!errors.amount && !errors.date) save.mutate(); }}
          >
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
