import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, UserCog, Shield, User } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Profile, AppRole } from "@/types";

interface ProfileWithRole extends Profile {
  user_roles?: { role: AppRole }[];
}

export default function Usuarios() {
  const { isAdmin } = useAuth();

  // Redirecionar se não for admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("name");

      if (profilesError) throw profilesError;

      // Buscar roles separadamente
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combinar dados
      const profilesWithRoles = profilesData.map((profile) => ({
        ...profile,
        role: rolesData.find((r) => r.user_id === profile.user_id)?.role || "operator",
      }));

      return profilesWithRoles;
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e suas permissões
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : profiles?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <UserCog className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum usuário encontrado</h3>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{profile.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={(profile as any).role === "admin" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {(profile as any).role === "admin" ? (
                          <>
                            <Shield className="h-3 w-3" />
                            Admin
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            Operador
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.is_active ? "default" : "destructive"}>
                        {profile.is_active ? "Ativo" : "Inativo"}
                      </Badge>
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
