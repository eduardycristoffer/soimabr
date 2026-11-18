import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRefreshFleet } from "@/hooks/useFleet";
import { fleetErrorMessage, finishRental, extendRental, type RentalRow } from "@/lib/fleetApi";
import { brl, dateBR, daysLabel, moneyInput, parseMoney } from "@/lib/fleetFormat";
import { diffDays, plannedTotal, rentalRevenue } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "./parts";

interface Props {
  open: boolean;
  onClose: () => void;
  rental: RentalRow | null;
  unitCode: string;
  today: string;
}

/** Registra a volta da grua: data da devolução e (se mudou) a desmobilização. A grua volta a ficar livre. */
export function ReturnRentalDialog({ open, onClose, rental, unitCode, today }: Props) {
  const refresh = useRefreshFleet();
  const [date, setDate] = useState(today);
  const [demob, setDemob] = useState("");
  useEffect(() => {
    if (open && rental) { setDate(today); setDemob(moneyInput(rental.demobilization_value)); }
  }, [open, rental, today]);

  const demobValue = parseMoney(demob);
  const invalidDate = !!rental && (!date || date < rental.start_date);
  const invalidDemob = demob.trim() !== "" && (demobValue == null || demobValue < 0);

  const final = rental && !invalidDate && !invalidDemob
    ? rentalRevenue({ ...rental, actual_end_date: date, demobilization_value: demobValue ?? 0 }, date, today)
    : null;
  const delta = rental && date ? diffDays(rental.planned_end_date, date) : 0;

  const save = useMutation({
    mutationFn: () => finishRental(rental!.id, date, demobValue ?? 0),
    onSuccess: () => { refresh(); toast({ title: "Devolução registrada", description: `${unitCode} voltou e está livre.` }); onClose(); },
    onError: (e) => toast({ title: "Não foi possível registrar", description: fleetErrorMessage(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar devolução — {unitCode}</DialogTitle>
          <DialogDescription>Informe o dia em que a grua saiu da obra. A locação é encerrada e a grua volta a ficar livre.</DialogDescription>
        </DialogHeader>
        <Field id="ret-date" label="Data da devolução *" error={invalidDate ? "A devolução não pode ser antes do início da locação." : null}>
          <Input id="ret-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field id="ret-demob" label="Desmobilização cobrada (R$)" error={invalidDemob ? "Valor inválido." : null}>
          <Input id="ret-demob" inputMode="decimal" value={demob} onChange={(e) => setDemob(e.target.value)} />
        </Field>
        {rental && final && (
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            {delta === 0 ? "Devolvida no prazo previsto." : delta < 0 ? <>Devolvida <strong>{daysLabel(-delta)} antes</strong> do prazo ({dateBR(rental.planned_end_date)}).</> : <>Devolvida <strong>{daysLabel(delta)} depois</strong> do prazo ({dateBR(rental.planned_end_date)}).</>}
            <span className="block">Receita final desta locação: <strong>{brl(final.accrued)}</strong> <span className="text-xs text-muted-foreground">(previsto: {brl(plannedTotal(rental))})</span></span>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || invalidDate || invalidDemob}>
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Registrar devolução
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Prorrogação: novo término previsto (o contrato continua o mesmo). */
export function ExtendRentalDialog({ open, onClose, rental, unitCode }: Omit<Props, "today">) {
  const refresh = useRefreshFleet();
  const [end, setEnd] = useState("");
  useEffect(() => {
    if (open && rental) setEnd(rental.planned_end_date);
  }, [open, rental]);

  const invalid = !!rental && (!end || end < rental.start_date);
  const added = rental && end ? diffDays(rental.planned_end_date, end) : 0;
  const extraValue = rental && end && !invalid && added !== 0
    ? plannedTotal({ ...rental, planned_end_date: end }) - plannedTotal(rental)
    : 0;

  const save = useMutation({
    mutationFn: () => extendRental(rental!.id, end),
    onSuccess: () => { refresh(); toast({ title: "Prazo atualizado", description: `${unitCode}: novo término em ${dateBR(end)}.` }); onClose(); },
    onError: (e) => toast({ title: "Não foi possível alterar o prazo", description: fleetErrorMessage(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prorrogar locação — {unitCode}</DialogTitle>
          <DialogDescription>Defina o novo término previsto. Lembre de formalizar o aditivo com o cliente.</DialogDescription>
        </DialogHeader>
        <Field id="ext-end" label="Novo término previsto *" error={invalid ? "A data não pode ser antes do início." : null}>
          <Input id="ext-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        {rental && !invalid && added !== 0 && (
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            {added > 0 ? <>Mais <strong>{daysLabel(added)}</strong> de locação.</> : <>O contrato fica <strong>{daysLabel(-added)}</strong> mais curto.</>}
            <span className="block">Valor previsto: {extraValue >= 0 ? "+" : "−"} {brl(Math.abs(extraValue))}</span>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || invalid || added === 0}>
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Salvar novo prazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
