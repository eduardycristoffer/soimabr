import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Construction, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useFleetEnabled } from "@/hooks/useFleetEnabled";
import { useFleetData } from "@/hooks/useFleet";
import { fetchContractRentals, fetchQuoteForRental, fleetErrorMessage } from "@/lib/fleetApi";
import { rentalDraftFromQuote, todayISO, type RentalDraft } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RentalFormDialog } from "./RentalFormDialog";
import { RentalList } from "./RentalList";

interface ContractLike {
  id: string;
  status: string;
  signed_at: string | null;
  quote_id: string;
  quotes?: { quote_type?: string } | null;
}

/**
 * Dentro da tela do contrato de LOCAÇÃO: qual grua atende o contrato, por quanto tempo e quanto vale.
 * Aparece só para administradores e só depois que o SQL da frota foi aplicado.
 */
export function ContractRentalCard({ contract }: { contract: ContractLike }) {
  const { isAdmin } = useAuth();
  const enabled = useFleetEnabled(isAdmin);
  if (!isAdmin || !enabled || contract.quotes?.quote_type !== "locacao") return null;
  return <Inner contract={contract} />;
}

function Inner({ contract }: { contract: ContractLike }) {
  const today = todayISO();
  const fleet = useFleetData(true);
  const { data: linked, isLoading } = useQuery({ queryKey: ["contract-rentals", contract.id], queryFn: () => fetchContractRentals(contract.id) });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RentalDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  const start = async () => {
    setLoadingDraft(true);
    try {
      const q = await fetchQuoteForRental(contract.quote_id);
      setDraft(rentalDraftFromQuote(q, contract.signed_at ? contract.signed_at.slice(0, 10) : null));
      setOpen(true);
    } catch (e) {
      toast({ title: "Não foi possível ler a proposta deste contrato", description: fleetErrorMessage(e), variant: "destructive" });
    } finally {
      setLoadingDraft(false);
    }
  };

  const rentals = (linked?.rentals ?? []).filter((r) => !r.cancelled_at);
  const signed = contract.status === "signed";

  return (
    <Card data-testid="contract-rental-card">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Construction className="h-4 w-4" aria-hidden /> Locação em obra (frota)</CardTitle>
            <CardDescription>Qual grua atende este contrato, por quanto tempo e quanto vale.</CardDescription>
          </div>
          {rentals.length > 0 && (
            <Button size="sm" variant="outline" onClick={start} disabled={loadingDraft || !fleet.data}>
              {loadingDraft ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />} Alocar outra grua
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || fleet.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : rentals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center">
            <p className="text-sm font-medium">Nenhuma grua alocada a este contrato.</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Escolha a grua, a obra e o prazo. O prazo, o valor e a rentabilidade passam a ser acompanhados na <Link to="/frota" className="underline">Frota</Link>.
              {!signed && " O contrato ainda não foi assinado: a locação ficará com alerta até a assinatura."}
            </p>
            <Button className="mt-3" onClick={start} disabled={loadingDraft || !fleet.data}>
              {loadingDraft ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />} Alocar grua a este contrato
            </Button>
          </div>
        ) : fleet.data ? (
          <RentalList rentals={rentals} data={{ ...fleet.data, units: mergeUnits(fleet.data.units, linked?.units ?? []) }} today={today} />
        ) : null}
      </CardContent>
      {fleet.data && (
        <RentalFormDialog open={open} onClose={() => setOpen(false)} data={fleet.data} contractId={contract.id} draft={draft} contractSigned={signed} />
      )}
    </Card>
  );
}

const mergeUnits = <T extends { id: string }>(a: T[], b: T[]): T[] => [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))];
