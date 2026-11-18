import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { itemKind, itemLineValue, itemNumber, itemsFromRows, serviceTotals } from "@/lib/serviceProposal";
import { formatMoney } from "@/lib/quoteMoney";

interface Props {
  /** linhas de quote_items da proposta de serviço */
  rows: any[];
  hidePrices?: boolean;
  /** quem emite (para mostrar no detalhe) */
  issuerName?: string | null;
}

/** Detalhe de uma proposta de serviço: tabela de preços e total. */
export default function ServiceItemsCard({ rows, hidePrices = false, issuerName }: Props) {
  const items = itemsFromRows(rows);
  const totals = serviceTotals(items);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Serviços ({items.length})</CardTitle>
        {issuerName && <p className="text-xs text-muted-foreground">Emitida por {issuerName}</p>}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item de preço nesta proposta.</p>}
        {items.map((it, i) => {
          const kind = itemKind(it);
          const line = itemLineValue(it);
          return (
            <div key={it.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{itemNumber(i)}</span>
                  <span>{it.description}</span>
                  {kind === "optional" && <Badge variant="outline" className="text-[10px]">Opcional</Badge>}
                  {kind === "measured" && <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-800">Sob medição</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {it.quantity ? `${it.quantity} ` : ""}{it.unit}
                  {it.note ? ` · ${it.note}` : ""}
                </p>
              </div>
              {!hidePrices && (
                <div className="shrink-0 text-right">
                  <div className="font-medium">{kind === "fixed" ? formatMoney(line) : formatMoney(it.unit_price)}</div>
                  {kind !== "fixed" && <div className="text-[10px] text-muted-foreground">preço unitário</div>}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex justify-between border-t pt-2 text-lg">
          <span className="font-bold">Total</span>
          <span className="font-bold">{formatMoney(totals.fixedTotal)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Soma só os itens com quantidade definida. Itens sob medição e opcionais não entram no total.
        </p>
      </CardContent>
    </Card>
  );
}
