import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRefreshFleet } from "@/hooks/useFleet";
import { fetchQuoteForRental, fetchRentalContracts, fleetErrorMessage, saveRental, type FleetData, type RentalRow } from "@/lib/fleetApi";
import { brl, dateBR, monthsLabel, moneyInput, parseMoney } from "@/lib/fleetFormat";
import {
  compatibility, endDateForMonths, findOverlap, monthsBetween, addDays, plannedMonths, plannedTotal, rentalDraftFromQuote, validateRental,
  type RentalDraft, type Requirements,
} from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, specsLine } from "./parts";

interface Props {
  open: boolean;
  onClose: () => void;
  data: FleetData;
  /** editar uma locação existente */
  rental?: RentalRow | null;
  /** grua já escolhida (vindo da página da grua) */
  presetUnitId?: string | null;
  /** contrato fixo (vindo da tela do contrato) */
  contractId?: string | null;
  /** dados da proposta para pré-preencher */
  draft?: RentalDraft | null;
  /** o contrato fixo já foi assinado? (null/undefined = não sei) */
  contractSigned?: boolean | null;
  onSaved?: () => void;
}

interface Form {
  unit_id: string; contract_id: string; quote_id: string; client_id: string;
  site_name: string; site_location: string; start: string; end: string; months: string;
  monthly: string; mob: string; demob: string; notes: string;
}

const blank: Form = { unit_id: "", contract_id: "", quote_id: "", client_id: "", site_name: "", site_location: "", start: "", end: "", months: "", monthly: "", mob: "", demob: "", notes: "" };

function monthsText(start: string, end: string): string {
  if (!start || !end || end < start) return "";
  return String(Math.round(monthsBetween(start, addDays(end, 1)) * 10) / 10).replace(".", ",");
}

export function RentalFormDialog({ open, onClose, data, rental, presetUnitId, contractId, draft, contractSigned, onSaved }: Props) {
  const refresh = useRefreshFleet();
  const [f, setF] = useState<Form>(blank);
  const [req, setReq] = useState<Requirements>({});
  const [notes, setNotes] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const lockedContract = !!contractId;

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (rental) {
      setF({
        unit_id: rental.unit_id, contract_id: rental.contract_id ?? "", quote_id: rental.quote_id ?? "", client_id: rental.client_id ?? "",
        site_name: rental.site_name ?? "", site_location: rental.site_location ?? "", start: rental.start_date, end: rental.planned_end_date,
        months: monthsText(rental.start_date, rental.planned_end_date),
        monthly: moneyInput(rental.monthly_value), mob: moneyInput(rental.mobilization_value), demob: moneyInput(rental.demobilization_value), notes: rental.notes ?? "",
      });
      setReq({}); setNotes([]);
    } else {
      setF({
        ...blank,
        unit_id: presetUnitId ?? "", contract_id: contractId ?? "",
        ...(draft
          ? {
              quote_id: draft.quote_id, client_id: draft.client_id ?? "", site_name: draft.site_name, site_location: draft.site_location,
              start: draft.start_date, end: draft.planned_end_date, months: monthsText(draft.start_date, draft.planned_end_date),
              monthly: moneyInput(draft.monthly_value), mob: moneyInput(draft.mobilization_value), demob: moneyInput(draft.demobilization_value),
            }
          : {}),
      });
      setReq(draft?.requirements ?? {});
      setNotes(draft?.notes ?? []);
    }
  }, [open, rental, presetUnitId, contractId, draft]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  // Contratos de locação para ligar (quando não veio fixo de uma tela de contrato)
  const { data: contractOptions = [] } = useQuery({ queryKey: ["fleet-rental-contracts"], queryFn: fetchRentalContracts, enabled: open && !lockedContract, staleTime: 60_000 });
  const chosenContract = contractOptions.find((c) => c.id === f.contract_id);

  const pickContract = async (id: string) => {
    set("contract_id", id);
    const c = contractOptions.find((x) => x.id === id);
    if (!c) return;
    try {
      const q = await fetchQuoteForRental(c.quote_id);
      const d = rentalDraftFromQuote(q, c.signed_at ? c.signed_at.slice(0, 10) : null);
      setF((x) => ({
        ...x, contract_id: id, quote_id: d.quote_id, client_id: d.client_id ?? x.client_id,
        site_name: d.site_name || x.site_name, site_location: d.site_location || x.site_location,
        start: d.start_date || x.start, end: d.planned_end_date || x.end, months: monthsText(d.start_date || x.start, d.planned_end_date || x.end),
        monthly: d.monthly_value ? moneyInput(d.monthly_value) : x.monthly, mob: d.mobilization_value ? moneyInput(d.mobilization_value) : x.mob, demob: d.demobilization_value ? moneyInput(d.demobilization_value) : x.demob,
      }));
      setReq(d.requirements);
      setNotes(d.notes);
    } catch (e) {
      toast({ title: "Não foi possível ler a proposta do contrato", description: fleetErrorMessage(e), variant: "destructive" });
    }
  };

  const onStart = (v: string) => setF((x) => ({ ...x, start: v, end: x.months && parseMoney(x.months) && v ? endDateForMonths(v, parseMoney(x.months) as number) : x.end }));
  const onMonths = (v: string) => {
    const m = parseMoney(v);
    setF((x) => ({ ...x, months: v, end: m && m > 0 && x.start ? endDateForMonths(x.start, m) : x.end }));
  };
  const onEnd = (v: string) => setF((x) => ({ ...x, end: v, months: monthsText(x.start, v) }));

  const monthly = parseMoney(f.monthly);
  const mob = parseMoney(f.mob);
  const demob = parseMoney(f.demob);
  const problems = useMemo(
    () => validateRental(
      { unit_id: f.unit_id, start_date: f.start, planned_end_date: f.end, monthly_value: monthly ?? 0, mobilization_value: mob ?? 0, demobilization_value: demob ?? 0 },
      data.rentals, rental?.id,
    ),
    [f.unit_id, f.start, f.end, monthly, mob, demob, data.rentals, rental?.id],
  );
  const err = (field: string) => (touched ? problems.find((p) => p.field === field)?.message ?? null : null);

  const unit = data.units.find((u) => u.id === f.unit_id);
  const compat = unit ? compatibility(unit, req) : null;
  const preview = f.start && f.end && f.end >= f.start
    ? (() => {
        const r = { id: "x", unit_id: f.unit_id, contract_id: null, quote_id: null, client_id: null, site_name: null, site_location: null, start_date: f.start, planned_end_date: f.end, actual_end_date: null, cancelled_at: null, monthly_value: monthly ?? 0, mobilization_value: mob ?? 0, demobilization_value: demob ?? 0, notes: null };
        return { months: plannedMonths(r), total: plannedTotal(r) };
      })()
    : null;

  // gruas para escolher: livres e compatíveis primeiro
  const options = useMemo(() => {
    const list = data.units
      .filter((u) => u.status !== "retired" || u.id === f.unit_id)
      .map((u) => {
        const busy = f.start && f.end && f.end >= f.start ? findOverlap(data.rentals, { unit_id: u.id, start_date: f.start, planned_end_date: f.end, ignoreId: rental?.id }) : undefined;
        const c = compatibility(u, req);
        const tags = [busy && `ocupada até ${dateBR(busy.actual_end_date ?? busy.planned_end_date)}`, u.status === "maintenance" && "em manutenção", !c.ok && "não atende à obra"].filter(Boolean) as string[];
        const rank = (busy ? 2 : 0) + (u.status === "maintenance" ? 2 : 0) + (c.ok ? 0 : 1);
        return { u, tags, rank };
      });
    return list.sort((a, b) => a.rank - b.rank || a.u.code.localeCompare(b.u.code, "pt-BR"));
  }, [data.units, data.rentals, f.start, f.end, f.unit_id, rental?.id, req]);

  const save = useMutation({
    mutationFn: () =>
      saveRental({
        id: rental?.id, unit_id: f.unit_id, contract_id: f.contract_id || null, quote_id: f.quote_id || null, client_id: f.client_id || null,
        site_name: f.site_name.trim() || null, site_location: f.site_location.trim() || null, start_date: f.start, planned_end_date: f.end,
        monthly_value: monthly ?? 0, mobilization_value: mob ?? 0, demobilization_value: demob ?? 0, notes: f.notes.trim() || null,
      }),
    onSuccess: () => {
      refresh();
      toast({ title: rental ? "Locação atualizada" : "Grua alocada à obra", description: unit?.code });
      onSaved?.();
      onClose();
    },
    onError: (e) => toast({ title: "Não foi possível salvar a locação", description: fleetErrorMessage(e), variant: "destructive" }),
  });

  const submit = () => {
    setTouched(true);
    if (problems.length === 0) save.mutate();
  };

  const unsigned = lockedContract ? contractSigned === false : !!chosenContract && chosenContract.status !== "signed";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rental ? "Editar locação" : "Alocar grua a uma obra"}</DialogTitle>
          <DialogDescription>Registre qual grua vai para qual obra, por quanto tempo e por quanto. O prazo e a rentabilidade passam a ser acompanhados no painel da frota.</DialogDescription>
        </DialogHeader>

        {!lockedContract && !rental && (
          <Field id="r-contract" label="Contrato de locação" hint="Escolha para preencher cliente, obra, prazo e valores a partir da proposta. Opcional.">
            <NativeSelect id="r-contract" value={f.contract_id} onChange={(e) => pickContract(e.target.value)}>
              <option value="">— sem contrato (registrar depois) —</option>
              {contractOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.contract_number} — {c.client_name || "sem cliente"} ({c.status === "signed" ? "assinado" : "não assinado"})</option>
              ))}
            </NativeSelect>
          </Field>
        )}
        {unsigned && (
          <div role="status" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Este contrato ainda não foi assinado. Dá para alocar a grua, mas a locação fica com alerta até a assinatura.
          </div>
        )}
        {notes.map((n) => (
          <div key={n} className="flex gap-2 rounded-md border bg-muted/50 p-2.5 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {n}</div>
        ))}

        <Field id="r-unit" label="Grua *" error={err("unit_id")}>
          <NativeSelect id="r-unit" value={f.unit_id} onChange={(e) => set("unit_id", e.target.value)} aria-invalid={!!err("unit_id")}>
            <option value="">Escolha a grua…</option>
            {options.map(({ u, tags }) => (
              <option key={u.id} value={u.id}>{u.code}{u.model_name ? ` — ${u.model_name}` : ""}{specsLine(u) ? ` (${specsLine(u)})` : ""}{tags.length ? ` · ${tags.join(" · ")}` : ""}</option>
            ))}
          </NativeSelect>
        </Field>
        {compat && !compat.ok && (
          <div role="alert" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <div>Esta grua pode não atender à obra:<ul className="mt-0.5 list-disc pl-4">{compat.reasons.map((r) => (<li key={r}>{r}</li>))}</ul></div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="r-client" label="Cliente">
            <NativeSelect id="r-client" value={f.client_id} onChange={(e) => set("client_id", e.target.value)}>
              <option value="">— sem cliente —</option>
              {data.clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </NativeSelect>
          </Field>
          <Field id="r-site" label="Obra"><Input id="r-site" value={f.site_name} onChange={(e) => set("site_name", e.target.value)} placeholder="Ex.: Edifício Aurora" /></Field>
          <Field id="r-loc" label="Local da obra" className="sm:col-span-2"><Input id="r-loc" value={f.site_location} onChange={(e) => set("site_location", e.target.value)} placeholder="Cidade/UF ou endereço" /></Field>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field id="r-start" label="Início *" error={err("start_date")}><Input id="r-start" type="date" value={f.start} onChange={(e) => onStart(e.target.value)} /></Field>
          <Field id="r-months" label="Duração (meses)" hint="Preenche o término."><Input id="r-months" inputMode="decimal" value={f.months} onChange={(e) => onMonths(e.target.value)} /></Field>
          <Field id="r-end" label="Término previsto *" error={err("planned_end_date")} className="col-span-2 sm:col-span-1"><Input id="r-end" type="date" value={f.end} onChange={(e) => onEnd(e.target.value)} /></Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field id="r-monthly" label="Valor mensal (R$)" error={err("monthly_value")}><Input id="r-monthly" inputMode="decimal" value={f.monthly} onChange={(e) => set("monthly", e.target.value)} /></Field>
          <Field id="r-mob" label="Mobilização (R$)" error={err("mobilization_value")}><Input id="r-mob" inputMode="decimal" value={f.mob} onChange={(e) => set("mob", e.target.value)} /></Field>
          <Field id="r-demob" label="Desmobilização (R$)" error={err("demobilization_value")}><Input id="r-demob" inputMode="decimal" value={f.demob} onChange={(e) => set("demob", e.target.value)} /></Field>
        </div>

        {preview && (
          <div className="rounded-md bg-muted/60 p-3 text-sm" data-testid="rental-summary">
            <strong>{monthsLabel(preview.months)}</strong> de locação · valor total previsto <strong>{brl(preview.total)}</strong>
            <span className="block text-xs text-muted-foreground">Mensalidade × meses + mobilização + desmobilização.</span>
          </div>
        )}

        <Field id="r-notes" label="Observações"><Textarea id="r-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {rental ? "Salvar alterações" : "Alocar grua"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
