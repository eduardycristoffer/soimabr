import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileSignature, Eye } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  sent: { label: "Enviado", variant: "outline" },
  signed: { label: "Assinado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function Contratos() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["contracts", search],
    queryFn: async () => {
      let q = supabase
        .from("contracts")
        .select("*, quotes(quote_number, quote_type, clients(razao_social, nome_fantasia))")
        .order("created_at", { ascending: false });
      if (search) q = q.ilike("contract_number", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
        <p className="text-muted-foreground">Contratos gerados a partir de propostas finalizadas</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : contracts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileSignature className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum contrato encontrado</h3>
              <p className="text-muted-foreground">Gere contratos a partir de propostas finalizadas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Proposta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts?.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.contract_number}</TableCell>
                    <TableCell className="font-mono">{c.quotes?.quote_number}</TableCell>
                    <TableCell>{c.quotes?.clients?.nome_fantasia || c.quotes?.clients?.razao_social || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.quotes?.quote_type === "locacao" ? "Locação" : "Venda"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[c.status]?.variant}>{statusConfig[c.status]?.label}</Badge>
                    </TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/contratos/${c.id}`)}>
                        <Eye className="h-4 w-4" />
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
