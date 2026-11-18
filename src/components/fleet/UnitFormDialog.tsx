import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRefreshFleet } from "@/hooks/useFleet";
import { fleetErrorMessage, saveUnit, type CatalogCrane } from "@/lib/fleetApi";
import { moneyInput, parseMoney } from "@/lib/fleetFormat";
import type { FleetUnit, UnitStatus } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "./parts";

interface Props {
  open: boolean;
  onClose: () => void;
  unit?: FleetUnit | null;
  catalog: CatalogCrane[];
  /** códigos já usados (para avisar antes de salvar) */
  existingCodes: string[];
  onSaved?: (u: FleetUnit) => void;
}

const numText = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

interface Form {
  code: string; product_id: string; model_name: string; serial_number: string; year: string;
  lanca: string; altura: string; carga: string; ponta: string;
  cost: string; date: string; status: UnitStatus; location: string; notes: string;
}

const blank: Form = { code: "", product_id: "", model_name: "", serial_number: "", year: "", lanca: "", altura: "", carga: "", ponta: "", cost: "", date: "", status: "active", location: "", notes: "" };

const fromUnit = (u: FleetUnit): Form => ({
  code: u.code, product_id: u.product_id ?? "", model_name: u.model_name ?? "", serial_number: u.serial_number ?? "", year: u.year_manufactured ? String(u.year_manufactured) : "",
  lanca: numText(u.lanca_m), altura: numText(u.altura_torre_m), carga: numText(u.carga_maxima_kg), ponta: numText(u.carga_ponta_kg),
  cost: moneyInput(u.acquisition_cost), date: u.acquisition_date ?? "", status: u.status, location: u.location_note ?? "", notes: u.notes ?? "",
});

export function UnitFormDialog({ open, onClose, unit, catalog, existingCodes, onSaved }: Props) {
  const refresh = useRefreshFleet();
  const [f, setF] = useState<Form>(blank);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setF(unit ? fromUnit(unit) : blank);
      setTouched(false);
    }
  }, [open, unit]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const pickModel = (id: string) => {
    const p = catalog.find((c) => c.id === id);
    setF((x) => ({
      ...x,
      product_id: id,
      // medidas do catálogo só entram onde ainda não há nada digitado
      lanca: x.lanca || numText(p?.default_lanca_m),
      altura: x.altura || numText(p?.default_altura_torre_m),
      carga: x.carga || numText(p?.default_carga_maxima_kg),
      ponta: x.ponta || numText(p?.default_carga_ponta_kg),
    }));
  };

  const code = f.code.trim();
  const duplicate = !!code && existingCodes.some((c) => c.toLowerCase() === code.toLowerCase() && c.toLowerCase() !== (unit?.code ?? "").toLowerCase());
  const nums = { lanca: parseMoney(f.lanca), altura: parseMoney(f.altura), carga: parseMoney(f.carga), ponta: parseMoney(f.ponta), cost: parseMoney(f.cost) };
  const badNumber = (text: string, v: number | null) => text.trim() !== "" && (v == null || v < 0);
  const errors = {
    code: !code ? "Informe o código da grua (ex.: GRU-045)." : duplicate ? "Já existe uma grua com esse código." : null,
    lanca: badNumber(f.lanca, nums.lanca) ? "Número inválido." : null,
    altura: badNumber(f.altura, nums.altura) ? "Número inválido." : null,
    carga: badNumber(f.carga, nums.carga) ? "Número inválido." : null,
    ponta: badNumber(f.ponta, nums.ponta) ? "Número inválido." : null,
    cost: badNumber(f.cost, nums.cost) ? "Valor inválido." : null,
    year: f.year.trim() && !(Number(f.year) >= 1950 && Number(f.year) <= 2100) ? "Ano inválido." : null,
  };
  const hasError = Object.values(errors).some(Boolean);

  const save = useMutation({
    mutationFn: () =>
      saveUnit({
        id: unit?.id, code, product_id: f.product_id || null, model_name: f.model_name.trim() || null, serial_number: f.serial_number.trim() || null,
        year_manufactured: f.year.trim() ? Number(f.year) : null,
        lanca_m: nums.lanca, altura_torre_m: nums.altura, carga_maxima_kg: nums.carga, carga_ponta_kg: nums.ponta,
        acquisition_cost: nums.cost ?? 0, acquisition_date: f.date || null, status: f.status, location_note: f.location.trim() || null, notes: f.notes.trim() || null,
      }),
    onSuccess: (u) => {
      refresh();
      toast({ title: unit ? "Grua atualizada" : "Grua cadastrada", description: u.code });
      onSaved?.(u);
      onClose();
    },
    onError: (e) => toast({ title: "Não foi possível salvar a grua", description: fleetErrorMessage(e), variant: "destructive" }),
  });

  const submit = () => {
    setTouched(true);
    if (!hasError) save.mutate();
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{unit ? `Editar ${unit.code}` : "Nova grua"}</DialogTitle>
          <DialogDescription>Cadastre o equipamento físico: é ele que vai para as obras. O valor de compra entra no cálculo de rentabilidade.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="u-code" label="Código / patrimônio *" error={show("code")} hint="Como a grua é chamada aí dentro. Ex.: GRU-045">
            <Input id="u-code" value={f.code} onChange={(e) => set("code", e.target.value)} aria-invalid={!!show("code")} />
          </Field>
          <Field id="u-model" label="Modelo do catálogo" hint="Preenche as medidas para você conferir.">
            <NativeSelect id="u-model" value={f.product_id} onChange={(e) => pickModel(e.target.value)}>
              <option value="">— sem modelo do catálogo —</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="u-name" label="Nome / modelo (opcional)">
            <Input id="u-name" value={f.model_name} onChange={(e) => set("model_name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="u-serial" label="Nº de série">
              <Input id="u-serial" value={f.serial_number} onChange={(e) => set("serial_number", e.target.value)} />
            </Field>
            <Field id="u-year" label="Ano" error={show("year")}>
              <Input id="u-year" inputMode="numeric" value={f.year} onChange={(e) => set("year", e.target.value)} />
            </Field>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Especificação desta grua</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field id="u-lanca" label="Lança (m)" error={show("lanca")}><Input id="u-lanca" inputMode="decimal" value={f.lanca} onChange={(e) => set("lanca", e.target.value)} /></Field>
            <Field id="u-altura" label="Altura (m)" error={show("altura")}><Input id="u-altura" inputMode="decimal" value={f.altura} onChange={(e) => set("altura", e.target.value)} /></Field>
            <Field id="u-carga" label="Carga máx. (kg)" error={show("carga")}><Input id="u-carga" inputMode="decimal" value={f.carga} onChange={(e) => set("carga", e.target.value)} /></Field>
            <Field id="u-ponta" label="Carga na ponta (kg)" error={show("ponta")}><Input id="u-ponta" inputMode="decimal" value={f.ponta} onChange={(e) => set("ponta", e.target.value)} /></Field>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field id="u-cost" label="Valor de compra (R$)" error={show("cost")} hint="Base do valor empregado.">
            <Input id="u-cost" inputMode="decimal" value={f.cost} onChange={(e) => set("cost", e.target.value)} />
          </Field>
          <Field id="u-date" label="Data da compra"><Input id="u-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field id="u-status" label="Situação" hint="Em obra / disponível o sistema calcula pelas locações.">
            <NativeSelect id="u-status" value={f.status} onChange={(e) => set("status", e.target.value as UnitStatus)}>
              <option value="active">Ativa</option>
              <option value="maintenance">Em manutenção</option>
              <option value="retired">Baixada (fora da frota)</option>
            </NativeSelect>
          </Field>
        </div>

        <Field id="u-loc" label="Onde está quando parada"><Input id="u-loc" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Pátio, oficina..." /></Field>
        <Field id="u-notes" label="Observações"><Textarea id="u-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {unit ? "Salvar alterações" : "Cadastrar grua"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
