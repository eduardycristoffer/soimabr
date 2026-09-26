import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QuoteItemDraft } from "@/hooks/useQuoteWizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, Trash2, AlertTriangle } from "lucide-react";
import { ProductCategory } from "@/types";
import { toast } from "@/hooks/use-toast";

const categoryLabels: Record<string, string> = {
  grua: "🏗️ Grua",
  configuracao: "⚙️ Configuração",
  torre: "🗼 Torre",
  tramo: "📐 Tramo",
  chassis: "🔧 Chassis",
  acessorio: "🔩 Acessório",
  servico: "🛠️ Serviço",
  montagem: "🔧 Montagem",
  frete: "🚚 Frete",
  transporte: "🚛 Transporte",
  operador: "👷 Operador",
  manutencao: "🧰 Manutenção",
};

interface Props {
  categories: ProductCategory[];
  items: QuoteItemDraft[];
  onItemsChange: (items: QuoteItemDraft[]) => void;
  title: string;
  onNext: () => void;
  onPrev: () => void;
  currency?: string;
  hideNav?: boolean;
  isInternationalUsd?: boolean;
  usdBrlRate?: number | null;
}

export default function ProductPicker({
  categories, items, onItemsChange, title, onNext, onPrev,
  currency = "BRL", hideNav, isInternationalUsd = false, usdBrlRate,
}: Props) {
  const [search, setSearch] = useState("");
  const { isAdmin } = useAuth();

  const { data: products } = useQuery({
    queryKey: ["products-picker", categories, search],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .in("categoria", categories)
        .order("categoria")
        .order("nome");
      if (search) {
        q = q.or(`nome.ilike.%${search}%,codigo.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const formatCurrencyValue = (value: number, cur: string = currency) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(value);

  const addItem = (product: any) => {
    const basePrice = isInternationalUsd ? (product.international_price_brl ?? 0) : product.preco;

    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      onItemsChange(
        items.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total_price: i.unit_price * (i.quantity + 1) }
            : i
        )
      );
    } else {
      onItemsChange([
        ...items,
        {
          product_id: product.id,
          product_code: product.codigo,
          product_name: product.nome,
          product_category: product.categoria,
          unit_price: basePrice,
          quantity: 1,
          total_price: basePrice,
        },
      ]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    onItemsChange(
      items
        .map((i) => {
          if (i.product_id !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null;
          return { ...i, quantity: newQty, total_price: i.unit_price * newQty };
        })
        .filter(Boolean) as QuoteItemDraft[]
    );
  };

  const removeItem = (productId: string) => {
    onItemsChange(items.filter((i) => i.product_id !== productId));
  };

  const SERVICE_CATS = ["servico", "montagem", "frete", "transporte", "operador", "manutencao"];
  const updatePrice = (productId: string, price: number) => {
    onItemsChange(
      items.map((i) =>
        i.product_id === productId ? { ...i, unit_price: price, total_price: price * i.quantity } : i
      )
    );
  };

  const itemsTotal = items.reduce((sum, i) => sum + i.total_price, 0);

  const getDisplayPrice = (product: any) => {
    if (isInternationalUsd) {
      return product.international_price_brl ?? 0;
    }
    return product.preco;
  };

  return (
    <div className="space-y-4">
      {isInternationalUsd && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Proposta internacional USD — usando preço internacional (BRL) como base.
            {usdBrlRate && ` Cotação: 1 USD = R$ ${usdBrlRate.toFixed(4)}`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product catalog */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Catálogo</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-1 max-h-[350px] overflow-y-auto">
            {products?.map((p) => {
              const inCart = items.find((i) => i.product_id === p.id);
              const displayPrice = getDisplayPrice(p);
              const noIntlPrice = isInternationalUsd && (p.international_price_brl == null || p.international_price_brl === 0);
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 rounded-md text-sm transition-colors hover:bg-accent/50 cursor-pointer ${
                    inCart ? "bg-accent/30 border border-primary/20" : "border border-transparent"
                  }`}
                  onClick={() => addItem(p)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {categoryLabels[p.categoria] || p.categoria}
                      </Badge>
                      {noIntlPrice && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          Sem preço intl.
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium truncate">{p.nome}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {isAdmin && (
                      <div className="text-right">
                        <span className="text-sm font-medium">{formatCurrencyValue(displayPrice, "BRL")}</span>
                        {isInternationalUsd && usdBrlRate && (
                          <span className="text-xs text-muted-foreground block">
                            ≈ {formatCurrencyValue(displayPrice / usdBrlRate, "USD")}
                          </span>
                        )}
                      </div>
                    )}
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected items */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Itens Selecionados ({items.length})</h4>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Clique nos produtos à esquerda para adicioná-los
            </p>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {items.map((item) => (
                <Card key={item.product_id} className="p-0">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.product_code}
                          {isAdmin && ` · ${formatCurrencyValue(item.unit_price, "BRL")}/un`}
                        </p>
                        {SERVICE_CATS.includes(String(item.product_category)) && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">Preço un. (R$):</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-7 w-28 text-xs"
                              value={item.unit_price}
                              onChange={(e) => updatePrice(item.product_id, Number(e.target.value) || 0)}
                            />
                            <span className="text-[10px] text-muted-foreground">0 = embutido no total</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <div className="w-28 text-right">
                          <span className="text-sm font-semibold">{formatCurrencyValue(item.total_price, "BRL")}</span>
                          {isInternationalUsd && usdBrlRate && (
                            <span className="text-xs text-muted-foreground block">
                              ≈ {formatCurrencyValue(item.total_price / usdBrlRate, "USD")}
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product_id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <div className="text-right">
                  <span className="text-sm font-semibold">Subtotal: {formatCurrencyValue(itemsTotal, "BRL")}</span>
                  {isInternationalUsd && usdBrlRate && (
                    <span className="text-xs text-muted-foreground block">
                      ≈ {formatCurrencyValue(itemsTotal / usdBrlRate, "USD")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!hideNav && (
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>Voltar</Button>
          <Button onClick={onNext}>Próximo</Button>
        </div>
      )}
    </div>
  );
}
