import { RentalWizardData } from "@/hooks/useRentalWizard";
import {
  GROUP_TITLE, effectiveQty, linesWithoutValue, lineValue, shownLines, type LineGroup, type RentalTotals,
} from "@/lib/rentalProposal";
import { formatMoney } from "@/lib/quoteMoney";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EyeOff } from "lucide-react";

interface Props {
  data: RentalWizardData;
  months: number;
  totals: RentalTotals;
  onNext: () => void;
  onPrev: () => void;
}

const terrainLabels: Record<string, string> = {
  plano: "Plano",
  inclinado: "Inclinado",
  dificil_acesso: "Difícil Acesso",
};

const workTypeLabels: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  industrial: "Industrial",
};

const qtyText = (n: number) => n.toLocaleString("pt-BR");

function GroupTable({ group, data, months, subtotal }: { group: LineGroup; data: RentalWizardData; months: number; subtotal: number }) {
  const rows = shownLines(data.lines, group);
  if (rows.length === 0) return null;
  const showUnit = !data.hide_unit_prices;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-[13px] sm:text-sm" aria-label={GROUP_TITLE[group]}>
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left sm:px-3">{GROUP_TITLE[group]}</th>
            <th className="px-2 py-2 text-right sm:px-3">Qtd</th>
            {showUnit && <th className="hidden px-2 py-2 text-right sm:table-cell sm:px-3">Valor unit.</th>}
            <th className="px-2 py-2 text-right sm:px-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const q = effectiveQty(l, months);
            return (
              <tr key={l.id} className="border-t align-top">
                <td className="px-2 py-2 sm:px-3">{l.description}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right sm:px-3">{q > 0 ? `${qtyText(q)} ${l.unit}` : "—"}</td>
                {showUnit && <td className="hidden whitespace-nowrap px-2 py-2 text-right sm:table-cell sm:px-3">{formatMoney(Number(l.unit_price))}</td>}
                <td className="whitespace-nowrap px-2 py-2 text-right sm:px-3">{q > 0 ? formatMoney(lineValue(l, months)) : "—"}</td>
              </tr>
            );
          })}
          <tr className="border-t bg-muted/30 font-semibold">
            <td className="px-2 py-2 sm:px-3" colSpan={showUnit ? 3 : 2}>Total — {GROUP_TITLE[group].toLowerCase()}</td>
            <td className="whitespace-nowrap px-2 py-2 text-right sm:px-3">{formatMoney(subtotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function RentalStepSummary({ data, months, totals, onNext, onPrev }: Props) {
  const hidden = linesWithoutValue(data.lines);
  const hasNight = data.lines.some((l) => (l.group === "night17" || l.group === "night22") && l.enabled && Number(l.unit_price) > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Equipamento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🏗️ Equipamento Selecionado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{data.selected_crane_name}</p>
            <p className="text-xs text-muted-foreground font-mono">{data.selected_crane_code}</p>
            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
              {data.grua_lanca_m && <span>Lança: {data.grua_lanca_m}m</span>}
              {data.grua_altura_torre_m && <span>Altura: {data.grua_altura_torre_m}m</span>}
              {data.grua_carga_maxima_kg && <span>Carga Máx: {Number(data.grua_carga_maxima_kg).toLocaleString("pt-BR")}kg</span>}
              {data.grua_carga_ponta_kg && <span>Ponta: {Number(data.grua_carga_ponta_kg).toLocaleString("pt-BR")}kg</span>}
            </div>
          </CardContent>
        </Card>

        {/* Dados da Obra */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">📍 Dados da Obra</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{data.project_name}</p>
            {data.project_location && <p className="text-xs text-muted-foreground">{data.project_location}</p>}
            {data.rental.attention && <p className="text-xs">Att.: {data.rental.attention}</p>}
            {months > 0 && <p className="text-xs">Período: {months} {months === 1 ? "mês" : "meses"}</p>}
            {data.rental_work_type && <p className="text-xs">Tipo: {workTypeLabels[data.rental_work_type] || data.rental_work_type}</p>}
            {data.rental_terrain_condition && <p className="text-xs">Terreno: {terrainLabels[data.rental_terrain_condition] || data.rental_terrain_condition}</p>}
            {data.rental_special_foundation && <Badge variant="outline" className="text-[10px] mt-1">Fundação especial necessária</Badge>}
          </CardContent>
        </Card>
      </div>

      {/* Quadro de preços: só o que aparece na proposta */}
      <GroupTable group="ebl" data={data} months={months} subtotal={totals.ebl} />
      <GroupTable group="cmo" data={data} months={months} subtotal={totals.cmo} />
      {hasNight && (
        <p className="text-xs text-muted-foreground">
          A proposta inclui também as tabelas de manutenção corretiva fora do horário comercial (valor por hora, com campo de adesão).
        </p>
      )}

      {hidden.length > 0 && (
        <Alert>
          <EyeOff className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <p className="mb-1 font-medium">Estes itens estão marcados, mas ficaram sem valor e <u>não aparecem</u> na proposta:</p>
            <ul className="list-disc pl-5 text-xs">
              {hidden.map((l) => <li key={l.id}>{l.description || "Item sem descrição"}</li>)}
            </ul>
            <p className="mt-1 text-xs">Para incluir algum, volte à etapa Preços e informe o valor.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Totais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">💰 Totais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!data.hide_unit_prices && (
            <>
              <div className="flex justify-between text-muted-foreground"><span>Locação de bens móveis</span><span>{formatMoney(totals.ebl)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Serviços de mão-de-obra</span><span>{formatMoney(totals.cmo)}</span></div>
              <div className="flex justify-between border-t pt-2 font-medium"><span>Valor total estimado por equipamento</span><span>{formatMoney(totals.subtotal)}</span></div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-destructive"><span>Desconto ({data.discount_percent}%)</span><span>-{formatMoney(totals.discount)}</span></div>
              )}
              {data.rental_tax_percent > 0 && (
                <div className="flex justify-between text-muted-foreground"><span>Impostos ({data.rental_tax_percent}%)</span><span>+{formatMoney(totals.tax)}</span></div>
              )}
            </>
          )}
          <div className="flex justify-between border-t pt-2 text-xl font-bold text-primary">
            <span>TOTAL</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext}>Próximo</Button>
      </div>
    </div>
  );
}
