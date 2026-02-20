import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QuoteWizardData, QuoteItemDraft } from "@/hooks/useQuoteWizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, AlertTriangle, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  data: QuoteWizardData;
  updateData: (d: Partial<QuoteWizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
  isInternationalUsd?: boolean;
  usdBrlRate?: number | null;
}

export default function StepEquipment({ data, updateData, onNext, onPrev, isInternationalUsd, usdBrlRate }: Props) {
  const [search, setSearch] = useState("");
  const [showCatalog, setShowCatalog] = useState(data.equipment.length === 0);
  const { isAdmin } = useAuth();

  const selectedCrane = data.equipment[0] ?? null;

  const { data: products } = useQuery({
    queryKey: ["products-picker", "grua", search],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("categoria", "grua")
        .order("nome");
      if (search) {
        q = q.or(`nome.ilike.%${search}%,codigo.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const formatCurrencyValue = (value: number, cur: string = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(value);

  const selectCrane = (product: any) => {
    const basePrice = isInternationalUsd ? (product.international_price_brl ?? 0) : product.preco;

    const newItem: QuoteItemDraft = {
      product_id: product.id,
      product_code: product.codigo,
      product_name: product.nome,
      product_category: "grua",
      unit_price: basePrice,
      quantity: 1,
      total_price: basePrice,
      // Auto-fill crane specs from product defaults
      grua_lanca_m: product.default_lanca_m ?? null,
      grua_altura_torre_m: product.default_altura_torre_m ?? null,
      grua_carga_maxima_kg: product.default_carga_maxima_kg ?? null,
      grua_carga_ponta_kg: product.default_carga_ponta_kg ?? null,
      grua_altura_trabalho_m: product.default_altura_trabalho_m ?? null,
    };

    updateData({ equipment: [newItem] });
    setShowCatalog(false);
  };

  const updateSpec = (field: keyof QuoteItemDraft, value: number | null) => {
    if (!selectedCrane) return;
    updateData({ equipment: [{ ...selectedCrane, [field]: value }] });
  };

  const hasGrua = selectedCrane !== null;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-sm">
        <Info className="h-4 w-4 shrink-0" />
        <span>Cada proposta permite <strong>1 grua</strong>. Para vender mais de uma grua, crie outra proposta.</span>
      </div>

      {isInternationalUsd && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Proposta internacional USD — usando preço internacional (BRL) como base.
            {usdBrlRate && ` Cotação: 1 USD = R$ ${usdBrlRate.toFixed(4)}`}
          </span>
        </div>
      )}

      {/* Selected crane card */}
      {hasGrua && !showCatalog && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">🏗️ Grua Selecionada</CardTitle>
                <Badge variant="outline" className="text-xs">{selectedCrane.product_code}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowCatalog(true)}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Trocar grua
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="font-medium">{selectedCrane.product_name}</p>
              <div className="flex items-center gap-2 mt-1">
                {isAdmin && (
                  <span className="text-sm text-muted-foreground">
                    {formatCurrencyValue(selectedCrane.unit_price, "BRL")}
                  </span>
                )}
                {isAdmin && isInternationalUsd && usdBrlRate && (
                  <span className="text-xs text-muted-foreground">
                    ≈ {formatCurrencyValue(selectedCrane.unit_price / usdBrlRate, "USD")}
                  </span>
                )}
              </div>
            </div>

            {/* Specs fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lança (m)</Label>
                <Input
                  type="number" step="0.1" placeholder="Ex: 36"
                  value={selectedCrane.grua_lanca_m ?? ""}
                  onChange={(e) => updateSpec("grua_lanca_m", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura da torre (m)</Label>
                <Input
                  type="number" step="0.1" placeholder="Ex: 27"
                  value={selectedCrane.grua_altura_torre_m ?? ""}
                  onChange={(e) => updateSpec("grua_altura_torre_m", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Carga máxima (kg)</Label>
                <Input
                  type="number" step="1" placeholder="Ex: 6000"
                  value={selectedCrane.grua_carga_maxima_kg ?? ""}
                  onChange={(e) => updateSpec("grua_carga_maxima_kg", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Carga na ponta (kg)</Label>
                <Input
                  type="number" step="1" placeholder="Ex: 1400"
                  value={selectedCrane.grua_carga_ponta_kg ?? ""}
                  onChange={(e) => updateSpec("grua_carga_ponta_kg", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura de Trabalho (m)</Label>
                <Input
                  type="number" step="0.1" placeholder="Ex: 30"
                  value={selectedCrane.grua_altura_trabalho_m ?? ""}
                  onChange={(e) => updateSpec("grua_altura_trabalho_m", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crane catalog */}
      {showCatalog && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">
            {hasGrua ? "Trocar grua — selecione uma nova:" : "Selecione a grua:"}
          </h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar grua..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-1 max-h-[350px] overflow-y-auto">
            {products?.map((p) => {
              const isSelected = selectedCrane?.product_id === p.id;
              const displayPrice = isInternationalUsd ? p.international_price_brl : p.preco;
              const noIntlPrice = isInternationalUsd && (displayPrice == null || displayPrice === 0);
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 rounded-md text-sm transition-colors hover:bg-accent/50 cursor-pointer ${
                    isSelected ? "bg-primary/10 border border-primary/30" : "border border-transparent"
                  }`}
                  onClick={() => selectCrane(p)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
                    {noIntlPrice && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          Sem preço intl.
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge className="text-[10px] px-1 py-0">Selecionada</Badge>
                      )}
                    </div>
                    <p className="font-medium truncate">{p.nome}</p>
                  </div>
                  {isAdmin && displayPrice != null && (
                    <div className="text-right ml-2 shrink-0">
                      <span className="text-sm font-medium">{formatCurrencyValue(displayPrice, "BRL")}</span>
                      {isInternationalUsd && usdBrlRate && (
                        <span className="text-xs text-muted-foreground block">
                          ≈ {formatCurrencyValue(displayPrice / usdBrlRate, "USD")}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {hasGrua && (
            <Button variant="ghost" size="sm" onClick={() => setShowCatalog(false)}>
              Cancelar troca
            </Button>
          )}
        </div>
      )}

      {/* No crane selected warning */}
      {!hasGrua && !showCatalog && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>Nenhuma grua selecionada.</p>
          <Button variant="outline" className="mt-2" onClick={() => setShowCatalog(true)}>
            Selecionar grua
          </Button>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext} disabled={!hasGrua}>
          Próximo
        </Button>
      </div>

      {!hasGrua && (
        <p className="text-xs text-destructive text-center">Selecione 1 grua para continuar.</p>
      )}
    </div>
  );
}
