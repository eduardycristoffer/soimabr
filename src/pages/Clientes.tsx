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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Building2, Globe, MoreHorizontal, Pencil, Eye, Trash2 } from "lucide-react";
import { Client } from "@/types";
import ClientFormModal from "@/components/clients/ClientFormModal";
import ClientDetailModal from "@/components/clients/ClientDetailModal";

export default function Clientes() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Fetch clients - RLS handles visibility (operator sees only own, admin sees all)
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

  // Fetch profiles for admin view (created_by/assigned_to names)
  const userIds = isAdmin && clients
    ? [...new Set([...clients.map(c => c.created_by), ...clients.map(c => (c as any).assigned_to)].filter(Boolean))]
    : [];

  const { data: profilesMap } = useQuery({
    queryKey: ["profiles-map", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles_directory")
        .select("user_id, name")
        .in("user_id", userIds);
      return Object.fromEntries((data || []).map(p => [p.user_id, p.name])) as Record<string, string>;
    },
    enabled: isAdmin && userIds.length > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("clients")
        .update({ is_active: false })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cliente excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteOpen(false);
      setSelectedClient(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormOpen(true);
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setDetailOpen(true);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteOpen(true);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Clientes</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Todos os clientes da empresa" : "Seus clientes cadastrados"}
          </p>
        </div>
        <Button onClick={handleNewClient} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <ClientFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        client={selectedClient}
      />
      <ClientDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        client={selectedClient}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente <strong>{selectedClient?.razao_social}</strong> será desativado. 
              Esta ação pode ser revertida por um administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClient && deleteMutation.mutate(selectedClient.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade/Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  {isAdmin && <TableHead>Cadastrado por</TableHead>}
                  {isAdmin && <TableHead>Atribuído a</TableHead>}
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
                    <TableCell>{client.cnpj || "-"}</TableCell>
                    <TableCell>
                      {client.cidade && client.estado
                        ? `${client.cidade}/${client.estado}`
                        : client.pais}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.client_type === "nacional" ? "default" : "secondary"}>
                        {client.client_type === "nacional" ? (
                          <><Building2 className="mr-1 h-3 w-3" />Nacional</>
                        ) : (
                          <><Globe className="mr-1 h-3 w-3" />Internacional</>
                        )}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-xs text-muted-foreground">
                        {profilesMap?.[client.created_by || ""] || "-"}
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell className="text-xs text-muted-foreground">
                        {profilesMap?.[(client as any).assigned_to || ""] || "-"}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(client)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(client)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
