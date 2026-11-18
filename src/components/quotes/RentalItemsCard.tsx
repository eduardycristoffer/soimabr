import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GROUP_TITLE, effectiveQty, lineValue, normalizeLines, rentalTotals, shownLines, type LineGroup,
} from "@/lib/rentalProposal";
import { formatMoney } from "@/lib/quoteMoney";

interface Props {
  /** quotes.service_data da proposta de locação detalhada (kind = "locacao") */
  serviceData: any;
  months: number;
  discountPercent?: number;
  taxPercent?: number;
  /** total gravado na proposta */
  total: number;
  hidePrices?: boolean;
}

/** Detalhe de uma proposta de locação detalhada: cada custo em sua linha (só o que aparece na proposta). */
export default function RentalItemsCard({ serviceData, months, discountPercent = 0, taxPercent = 0, total, hidePrices = false }: Props) {
  const lines = normalizeLines(serviceData?.lines);
  const totals = rentalTotals(lines, months, discountPercent, taxPercent);
  const night = (["night17", "night22"] as const).filter((g) => shownLines(lines, g).length > 0);

  const block = (group: LineGroup, groupTotal: number) => {
    const rows = shownLines(lines, group);
    if (rows.length === 0) return null;
    return (
      <div className="space-y-2" key={group}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{GROUP_TITLE[group]}</p>
        {rows.map((l) => {
          const q = effectiveQty(l, months);
          return (
            <div key={l.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
              <div className="min-w-0">
                <span>{l.description}</span>
                <p className="text-xs text-muted-foreground">
                  {q > 0 ? `${q.toLocaleString("pt-BR")} ${l.unit}` : `valor por ${l.unit.toLowerCase()}`}
                  {l.note ? ` · ${l.note}` : ""}
                </p>
              </div>
              {!hidePrices && (
                <div className="shrink-0 text-right">
                  <div className="font-medium">{q > 0 ? formatMoney(lineValue(l, months)) : formatMoney(Number(l.unit_price))}</div>
                  {q > 0 && <div className="text-[10px] text-muted-foreground">{formatMoney(Number(l.unit_price))} cada</div>}
                </div>
              )}
            </div>
          );
        })}
        {!hidePrices && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total — {GROUP_TITLE[group].toLowerCase()}</span>
            <span className="tabular-nums">{formatMoney(groupTotal)}</span>
          </div>
        )}
      </div>
    );
  };

  const hasRows = shownLines(lines, "ebl").length + shownLines(lines, "cmo").length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Quadro de preços</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!hasRows && <p className="text-xs text-muted-foreground">Nenhum item com valor nesta proposta.</p>}
        {block("ebl", totals.ebl)}
        {block("cmo", totals.cmo)}
        {night.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Inclui {night.length === 1 ? "a tabela" : "as tabelas"} de manutenção corretiva fora do horário comercial (valor por hora, com campo de adesão).
          </p>
        )}
        <div className="space-y-1 border-t pt-2">
          {!hidePrices && (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor total estimado por equipamento</span><span className="font-medium">{formatMoney(totals.subtotal)}</span></div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-destructive"><span>Desconto ({discountPercent}%)</span><span>-{formatMoney(totals.discount)}</span></div>
              )}
              {totals.tax > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Impostos ({taxPercent}%)</span><span>{formatMoney(totals.tax)}</span></div>
              )}
            </>
          )}
          <div className="flex justify-between pt-1 text-lg">
            <span className="font-bold">Total</span>
            <span className="font-bold">{formatMoney(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
