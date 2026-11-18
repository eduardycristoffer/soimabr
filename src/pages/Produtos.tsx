import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Package, AlertTriangle, MoreHorizontal, Pencil, Power } from "lucide-react";
import { Product, ProductCategory } from "@/types";
import { Navigate } from "react-router-dom";
import ProductFormModal from "@/components/products/ProductFormModal";

const categoryLabels: Record<ProductCategory, string> = {
  grua: "🏗️ Gruas",
  configuracao: "⚙️ Configurações",
  torre: "🗼 Torres",
  tramo: "📐 Tramos",
  chassis: "🔧 Chassis",
  acessorio: "🔩 Acessórios",
  servico: "🛠️ Serviço",
  montagem: "🔧 Montagem",
  frete: "🚚 Frete",
  transporte: "🚛 Transporte",
  operador: "👷 Operador",
  manutencao: "🧰 Manutenção",
};

const categoryOrder: ProductCategory[] = [
  "grua", "configuracao", "torre", "tramo", "chassis", "acessorio",
  "servico", "montagem", "frete", "transporte", "operador", "manutencao",
];

export default function Produtos() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, category, showInactive],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .order("categoria")
        .order("nome");
      if (!showInactive) {
        query = query.eq("is_active", true);
      }
      if (search) {
        query = query.or(`nome.ilike.%${search}%,codigo.ilike.%${search}%`);
      }
      if (category !== "all") {
        query = query.eq("categoria", category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      toast({ title: isActive ? "Produto ativado!" : "Produto desativado!" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const needsReviewCount = products?.filter((p) => p.needs_review).length || 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormOpen(true);
  };

  const handleNew = () => {
    setSelectedProduct(null);
    setFormOpen(true);
  };

  const renderProductActions = (product: Product) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(product)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toggleActiveMutation.mutate({
            id: product.id,
            isActive: !product.is_active,
          })}
        >
          <Power className="mr-2 h-4 w-4" />
          {product.is_active ? "Desativar" : "Ativar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderStatusBadge = (product: Product) => (
    <Badge
      variant={product.is_active ? "default" : "secondary"}
      className={product.is_active ? "status-badge-finalized" : "status-badge-revision"}
    >
      {product.is_active ? "Ativo" : "Inativo"}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Catálogo de Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie gruas, torres, tramos e acessórios
          </p>
        </div>
        <div className="flex items-center gap-2">
          {needsReviewCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {needsReviewCount} sem preço
            </Badge>
          )}
          <Button onClick={handleNew} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <ProductFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        product={selectedProduct}
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={showInactive} onCheckedChange={setShowInactive} />
                Inativos
              </label>
              <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory | "all")}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {categoryOrder.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : products?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">
                Ajuste os filtros ou adicione novos produtos
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Preço Intl.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product) => (
                      <TableRow key={product.id} className={!product.is_active ? "opacity-50" : ""}>
                        <TableCell className="font-mono text-sm">
                          {product.codigo}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.nome}</span>
                            {product.needs_review && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Revisar
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categoryLabels[product.categoria]}
                          </Badge>
                        </TableCell>
                        <TableCell>{product.unidade}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(product.preco)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">
                          {(product as any).international_price_brl != null
                            ? formatPrice((product as any).international_price_brl)
                            : "-"}
                        </TableCell>
                        <TableCell>{renderStatusBadge(product)}</TableCell>
                        <TableCell className="text-right">{renderProductActions(product)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {products?.map((product) => (
                  <div
                    key={product.id}
                    className={`rounded-xl border bg-card p-4 shadow-sm ${!product.is_active ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{product.nome}</p>
                        <p className="font-mono text-xs text-muted-foreground">{product.codigo}</p>
                      </div>
                      <div className="shrink-0 -mr-2 -mt-2">{renderProductActions(product)}</div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 flex-wrap">
                      {renderStatusBadge(product)}
                      <Badge variant="outline">{categoryLabels[product.categoria]}</Badge>
                      {product.needs_review && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Revisar
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="font-medium">{formatPrice(product.preco)}</span>
                      <span className="text-xs text-muted-foreground">
                        Intl.: {(product as any).international_price_brl != null
                          ? formatPrice((product as any).international_price_brl)
                          : "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
