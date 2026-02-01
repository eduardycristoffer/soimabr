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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Globe } from "lucide-react";
import { Client } from "@/types";

export default function Clientes() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*")
        .eq("is_active", true)
        .order("razao_social");

      if (search) {
        query = query.or(
          `razao_social.ilike.%${search}%,nome_fantasia.ilike.%${search}%,cnpj.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes nacionais e internacionais
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : clients?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground">
                Comece adicionando seu primeiro cliente
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Cidade/Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.razao_social}
                    </TableCell>
                    <TableCell>{client.nome_fantasia || "-"}</TableCell>
                    <TableCell>
                      {client.cnpj || client.cpf || client.tax_id || "-"}
                    </TableCell>
                    <TableCell>
                      {client.cidade && client.estado
                        ? `${client.cidade}/${client.estado}`
                        : client.pais}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.client_type === "nacional" ? "default" : "secondary"}>
                        {client.client_type === "nacional" ? (
                          <>
                            <Building2 className="mr-1 h-3 w-3" />
                            Nacional
                          </>
                        ) : (
                          <>
                            <Globe className="mr-1 h-3 w-3" />
                            Internacional
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Ver
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
