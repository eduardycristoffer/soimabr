import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CalendarClock, CornerDownLeft, ExternalLink, FileText, MoreVertical, Pencil, Undo2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRefreshFleet } from "@/hooks/useFleet";
import { cancelRental, clientName, fleetErrorMessage, reopenRental, type FleetData, type RentalRow } from "@/lib/fleetApi";
import { brl, dateBR } from "@/lib/fleetFormat";
import { plannedMonths, plannedTotal, rentalPhase, rentalRevenue, type ContractInfo } from "@/lib/fleet";
import { monthsLabel } from "@/lib/fleetFormat";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContractBadge, RentalProgress, specsLine } from "./parts";
import { RentalFormDialog } from "./RentalFormDialog";
import { ExtendRentalDialog, ReturnRentalDialog } from "./ReturnRentalDialog";

interface Props {
  rentals: RentalRow[];
  data: FleetData;
  today: string;
  /** mostrar a grua em cada linha (some na página da própria grua) */
  showUnit?: boolean;
  empty?: string;
}

const contractInfo = (r: RentalRow): ContractInfo | undefined => (r.contracts ? { status: r.contracts.status, signed_at: r.contracts.signed_at } : undefined);

/** Lista de locações com as ações de cada uma (editar, prorrogar, devolver, cancelar). */
export function RentalList({ rentals, data, today, showUnit = true, empty = "Nenhuma locação aqui." }: Props) {
  const refresh = useRefreshFleet();
  const [edit, setEdit] = useState<RentalRow | null>(null);
  const [ret, setRet] = useState<RentalRow | null>(null);
  const [ext, setExt] = useState<RentalRow | null>(null);
  const [cancel, setCancel] = useState<RentalRow | null>(null);

  const unitOf = (id: string) => data.units.find((u) => u.id === id);

  const doCancel = useMutation({
    mutationFn: (id: string) => cancelRental(id),
    onSuccess: () => { refresh(); toast({ title: "Locação cancelada" }); setCancel(null); },
    onError: (e) => toast({ title: "Não foi possível cancelar", description: fleetErrorMessage(e), variant: "destructive" }),
  });
  const doReopen = useMutation({
    mutationFn: (id: string) => reopenRental(id),
    onSuccess: () => { refresh(); toast({ title: "Devolução desfeita", description: "A locação voltou a ficar em andamento." }); },
    onError: (e) => toast({ title: "Não foi possível desfazer", description: fleetErrorMessage(e), variant: "destructive" }),
  });

  if (rentals.length === 0) return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</p>;

  return (
    <>
      <ul className="space-y-3" aria-label="Locações">
        {rentals.map((r) => {
          const u = unitOf(r.unit_id);
          const phase = rentalPhase(r, today);
          const rev = rentalRevenue(r, today, today);
          const who = clientName(r.clients);
          return (
            <li key={r.id} data-rental-id={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {showUnit && u && (
                    <Link to={`/frota/gruas/${u.id}`} className="text-sm font-semibold hover:underline">{u.code}{u.model_name ? ` — ${u.model_name}` : ""}</Link>
                  )}
                  <p className={showUnit ? "text-sm text-muted-foreground" : "font-medium"}>
                    {[r.site_name, who].filter(Boolean).join(" · ") || "Obra sem nome"}
                    {r.site_location ? <span className="text-muted-foreground"> — {r.site_location}</span> : null}
                  </p>
                  {showUnit && u && specsLine(u) && <p className="text-xs text-muted-foreground">{specsLine(u)}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ContractBadge info={contractInfo(r)} className="hidden sm:inline-flex" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações da locação ${u?.code ?? ""}`}><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {r.contract_id && (
                        <DropdownMenuItem asChild><Link to={`/contratos/${r.contract_id}`}><FileText className="mr-2 h-4 w-4" /> Abrir contrato</Link></DropdownMenuItem>
                      )}
                      {showUnit && u && (
                        <DropdownMenuItem asChild><Link to={`/frota/gruas/${u.id}`}><ExternalLink className="mr-2 h-4 w-4" /> Ver a grua</Link></DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setEdit(r)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      {(phase === "active" || phase === "scheduled") && (
                        <DropdownMenuItem onClick={() => setExt(r)}><CalendarClock className="mr-2 h-4 w-4" /> Prorrogar</DropdownMenuItem>
                      )}
                      {phase === "active" && (
                        <DropdownMenuItem onClick={() => setRet(r)}><CornerDownLeft className="mr-2 h-4 w-4" /> Registrar devolução</DropdownMenuItem>
                      )}
                      {phase === "finished" && (
                        <DropdownMenuItem onClick={() => doReopen.mutate(r.id)}><Undo2 className="mr-2 h-4 w-4" /> Desfazer devolução</DropdownMenuItem>
                      )}
                      {(phase === "active" || phase === "scheduled") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setCancel(r)}><XCircle className="mr-2 h-4 w-4" /> Cancelar locação</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="mb-1.5 text-xs text-muted-foreground">
                    {dateBR(r.start_date)} → {dateBR(r.actual_end_date ?? r.planned_end_date)}
                    {r.actual_end_date ? " (devolvida)" : " (previsto)"} · {monthsLabel(plannedMonths(r))}
                  </p>
                  {phase !== "cancelled" ? <RentalProgress rental={r} today={today} /> : <p className="text-xs text-muted-foreground">Cancelada</p>}
                </div>
                <dl className="grid grid-cols-3 gap-x-5 text-sm sm:text-right">
                  <div><dt className="text-xs text-muted-foreground">Mensal</dt><dd className="font-medium tabular-nums">{brl(r.monthly_value)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Previsto</dt><dd className="font-medium tabular-nums">{brl(plannedTotal(r))}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Recebido até hoje</dt><dd className="font-medium tabular-nums">{brl(rev.accrued)}</dd></div>
                </dl>
              </div>
              <ContractBadge info={contractInfo(r)} className="mt-3 sm:hidden" />
            </li>
          );
        })}
      </ul>

      <RentalFormDialog open={!!edit} onClose={() => setEdit(null)} data={data} rental={edit} />
      <ReturnRentalDialog open={!!ret} onClose={() => setRet(null)} rental={ret} unitCode={ret ? unitOf(ret.unit_id)?.code ?? "" : ""} today={today} />
      <ExtendRentalDialog open={!!ext} onClose={() => setExt(null)} rental={ext} unitCode={ext ? unitOf(ext.unit_id)?.code ?? "" : ""} />
      <AlertDialog open={!!cancel} onOpenChange={(o) => !o && setCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta locação?</AlertDialogTitle>
            <AlertDialogDescription>
              A grua {cancel ? unitOf(cancel.unit_id)?.code : ""} fica livre para outras datas e a receita desta locação deixa de contar. O contrato, se houver, não é alterado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancel && doCancel.mutate(cancel.id)}>Cancelar locação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
