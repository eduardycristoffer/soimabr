import { RentalWizardData } from "@/hooks/useRentalWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";

interface Props {
  data: RentalWizardData;
  rentalSubtotal: number;
  additionalCosts: number;
  subtotal: number;
  discountValue: number;
  taxValue: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

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

export default function RentalStepSummary({ data, rentalSubtotal, additionalCosts, subtotal, discountValue, taxValue, total, onNext, onPrev }: Props) {
  const extras = [
    data.rental_operator_included && "Operador incluso",
    data.rental_maintenance_included && "Manutenção inclusa",
    data.rental_insurance_included && "Seguro incluso",
    data.rental_technical_assistance && "Assistência técnica",
  ].filter(Boolean);

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
            {data.rental_work_type && <p className="text-xs">Tipo: {workTypeLabels[data.rental_work_type] || data.rental_work_type}</p>}
            {data.rental_terrain_condition && <p className="text-xs">Terreno: {terrainLabels[data.rental_terrain_condition] || data.rental_terrain_condition}</p>}
            {data.rental_special_foundation && <Badge variant="outline" className="text-[10px] mt-1">Fundação especial necessária</Badge>}
          </CardContent>
        </Card>
      </div>

      {/* Extras */}
      {extras.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">✅ Serviços Inclusos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {extras.map((e, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {e}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown Financeiro */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">💰 Breakdown Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Valor Mensal × {data.rental_duration_months || 0} meses</span>
            <span className="font-medium">{fmt(rentalSubtotal)}</span>
          </div>
          <Separator />
          {data.rental_mobilization > 0 && <div className="flex justify-between text-muted-foreground"><span>Mobilização</span><span>{fmt(data.rental_mobilization)}</span></div>}
          {data.rental_demobilization > 0 && <div className="flex justify-between text-muted-foreground"><span>Desmobilização</span><span>{fmt(data.rental_demobilization)}</span></div>}
          {data.rental_freight > 0 && <div className="flex justify-between text-muted-foreground"><span>Frete</span><span>{fmt(data.rental_freight)}</span></div>}
          {data.rental_assembly > 0 && <div className="flex justify-between text-muted-foreground"><span>Montagem</span><span>{fmt(data.rental_assembly)}</span></div>}
          {data.rental_disassembly > 0 && <div className="flex justify-between text-muted-foreground"><span>Desmontagem</span><span>{fmt(data.rental_disassembly)}</span></div>}
          {additionalCosts > 0 && (
            <>
              <Separator />
              <div className="flex justify-between font-medium"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            </>
          )}
          {data.discount_percent > 0 && (
            <div className="flex justify-between text-destructive"><span>Desconto ({data.discount_percent}%)</span><span>-{fmt(discountValue)}</span></div>
          )}
          {data.rental_tax_percent > 0 && (
            <div className="flex justify-between text-muted-foreground"><span>Impostos ({data.rental_tax_percent}%)</span><span>+{fmt(taxValue)}</span></div>
          )}
          <Separator />
          <div className="flex justify-between text-xl font-bold text-primary">
            <span>TOTAL</span>
            <span>{fmt(total)}</span>
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
