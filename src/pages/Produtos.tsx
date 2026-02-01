import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { Product, ProductCategory } from "@/types";
import { Navigate } from "react-router-dom";

const categoryLabels: Record<ProductCategory, string> = {
  grua: "🏗️ Gruas",
  configuracao: "⚙️ Configurações",
  torre: "🗼 Torres",
  tramo: "📐 Tramos",
  chassis: "🔧 Chassis",
  acessorio: "🔩 Acessórios",
};

const categoryOrder: ProductCategory[] = [
  "grua",
  "configuracao",
  "torre",
  "tramo",
  "chassis",
  "acessorio",
];

export default function Produtos() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");

  // Redirecionar se não for admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, category],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("categoria")
        .order("nome");

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

  const needsReviewCount = products?.filter((p) => p.needs_review).length || 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Produtos</h1>
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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

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
            <Tabs
              value={category}
              onValueChange={(v) => setCategory(v as ProductCategory | "all")}
              className="w-full md:w-auto"
            >
              <TabsList className="flex-wrap">
                <TabsTrigger value="all">Todos</TabsTrigger>
                {categoryOrder.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((product) => (
                  <TableRow key={product.id}>
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
