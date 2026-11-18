import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RentalWizardData } from "@/hooks/useRentalWizard";
import { withLinePrice } from "@/lib/rentalProposal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Star } from "lucide-react";

interface Props {
  data: RentalWizardData;
  updateData: (d: Partial<RentalWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function RentalStepCrane({ data, updateData, onNext, onPrev }: Props) {
  const [search, setSearch] = useState("");

  const { data: cranes, isLoading } = useQuery({
    queryKey: ["cranes-rental"],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .eq("categoria", "grua")
        .eq("is_active", true)
        .order("nome");
      if (error) throw error;
      return products;
    },
  });

  const isCompatible = (crane: any) => {
    const heightOk = !data.rental_height_needed || (crane.default_altura_torre_m && crane.default_altura_torre_m >= data.rental_height_needed);
    const jibOk = !data.rental_jib_needed || (crane.default_lanca_m && crane.default_lanca_m >= data.rental_jib_needed);
    const weightOk = !data.rental_max_weight || (crane.default_carga_maxima_kg && crane.default_carga_maxima_kg >= data.rental_max_weight);
    return heightOk && jibOk && weightOk;
  };

  const getIncompatibilities = (crane: any): string[] => {
    const issues: string[] = [];
    if (data.rental_height_needed && crane.default_altura_torre_m && crane.default_altura_torre_m < data.rental_height_needed)
      issues.push(`Altura: ${crane.default_altura_torre_m}m < ${data.rental_height_needed}m`);
    if (data.rental_jib_needed && crane.default_lanca_m && crane.default_lanca_m < data.rental_jib_needed)
      issues.push(`Lança: ${crane.default_lanca_m}m < ${data.rental_jib_needed}m`);
    if (data.rental_max_weight && crane.default_carga_maxima_kg && crane.default_carga_maxima_kg < data.rental_max_weight)
      issues.push(`Carga: ${crane.default_carga_maxima_kg}kg < ${data.rental_max_weight}kg`);
    return issues;
  };

  const filteredCranes = (cranes || []).filter(
    (c: any) => !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const compatible = filteredCranes.filter(isCompatible);
  const incompatible = filteredCranes.filter((c: any) => !isCompatible(c));
  const hasRequirements = data.rental_height_needed || data.rental_jib_needed || data.rental_max_weight;

  const selectCrane = (crane: any) => {
    updateData({
      selected_crane_id: crane.id,
      selected_crane_name: crane.nome,
      selected_crane_code: crane.codigo,
      grua_lanca_m: crane.default_lanca_m ?? null,
      grua_altura_torre_m: crane.default_altura_torre_m ?? null,
      grua_carga_maxima_kg: crane.default_carga_maxima_kg ?? null,
      grua_carga_ponta_kg: crane.default_carga_ponta_kg ?? null,
      grua_altura_trabalho_m: crane.default_altura_trabalho_m ?? null,
      // valores-padrão do cadastro da grua entram nas linhas do quadro de preços (só se o cadastro tiver valor)
      lines: withLinePrice(
        withLinePrice(withLinePrice(data.lines, "rent", crane.rental_monthly_price), "mobilization", crane.rental_mobilization_default),
        "assembly",
        crane.rental_assembly_default,
      ),
    });
  };

  const renderCrane = (crane: any, recommended: boolean) => {
    const selected = data.selected_crane_id === crane.id;
    const issues = !recommended ? getIncompatibilities(crane) : [];

    return (
      <Card
        key={crane.id}
        className={`cursor-pointer transition-colors hover:bg-accent/50 ${selected ? "border-primary bg-accent/30" : ""}`}
        onClick={() => selectCrane(crane)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{crane.nome}</p>
                <span className="text-xs text-muted-foreground font-mono">{crane.codigo}</span>
                {recommended && hasRequirements && (
                  <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">
                    <Star className="h-2.5 w-2.5 mr-0.5" /> Recomendada
                  </Badge>
                )}
                {selected && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                {crane.default_lanca_m && <span>Lança: {crane.default_lanca_m}m</span>}
                {crane.default_altura_torre_m && <span>Altura: {crane.default_altura_torre_m}m</span>}
                {crane.default_carga_maxima_kg && <span>Carga Máx: {Number(crane.default_carga_maxima_kg).toLocaleString("pt-BR")}kg</span>}
                {crane.default_carga_ponta_kg && <span>Ponta: {Number(crane.default_carga_ponta_kg).toLocaleString("pt-BR")}kg</span>}
              </div>
              {issues.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {issues.map((issue, i) => (
                    <p key={i} className="text-[10px] text-destructive">⚠ {issue}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar grua por nome ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2 max-h-[450px] overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
        ) : filteredCranes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma grua encontrada</p>
        ) : (
          <>
            {hasRequirements && compatible.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Compatíveis ({compatible.length})</p>
                {compatible.map((c: any) => renderCrane(c, true))}
              </div>
            )}
            {hasRequirements && incompatible.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outras ({incompatible.length})</p>
                {incompatible.map((c: any) => renderCrane(c, false))}
              </div>
            )}
            {!hasRequirements && filteredCranes.map((c: any) => renderCrane(c, false))}
          </>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!data.selected_crane_id}>Próximo</Button>
      </div>
    </div>
  );
}
