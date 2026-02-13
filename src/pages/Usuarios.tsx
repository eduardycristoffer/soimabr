import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, UserCog, Shield, User, MoreHorizontal, Loader2, MailCheck, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { AppRole } from "@/types";
import InviteUserModal from "@/components/users/InviteUserModal";

interface ProfileWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  role: AppRole;
}

export default function Usuarios() {
  const { isAdmin, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

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

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      return profilesData.map((profile) => ({
        ...profile,
        role: (rolesData.find((r) => r.user_id === profile.user_id)?.role || "operator") as AppRole,
      })) as ProfileWithRole[];
    },
  });

  const invokeAction = async (action: string, payload: Record<string, unknown>) => {
    const key = `${action}-${payload.user_id}`;
    setActionLoading(key);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action, ...payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Operação realizada com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = (userId: string, currentRole: AppRole) => {
    const newRole = currentRole === "admin" ? "operator" : "admin";
    const label = newRole === "admin" ? "Administrador" : "Operador";
    setConfirmDialog({
      open: true,
      title: `Alterar perfil para ${label}?`,
      description: `O usuário passará a ter permissões de ${label}.`,
      onConfirm: () => invokeAction("update_role", { user_id: userId, role: newRole }),
    });
  };

  const handleToggleActive = (userId: string, isActive: boolean) => {
    const action = isActive ? "desativar" : "ativar";
    setConfirmDialog({
      open: true,
      title: `${isActive ? "Desativar" : "Ativar"} usuário?`,
      description: isActive
        ? "O usuário não poderá mais acessar o sistema."
        : "O usuário poderá acessar o sistema novamente.",
      onConfirm: () => invokeAction("toggle_active", { user_id: userId, is_active: !isActive }),
    });
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const isSelf = (userId: string) => currentUser?.user_id === userId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários e suas permissões</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                  <TableRow key={profile.id} className={!profile.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{profile.name}</span>
                          {isSelf(profile.user_id) && (
                            <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      <Badge variant={profile.role === "admin" ? "default" : "secondary"} className="gap-1">
                        {profile.role === "admin" ? (
                          <><Shield className="h-3 w-3" /> Admin</>
                        ) : (
                          <><User className="h-3 w-3" /> Operador</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.is_active ? "default" : "destructive"}>
                        {profile.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!!actionLoading}
                          >
                            {actionLoading?.includes(profile.user_id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!profile.is_active && (
                            <>
                              <DropdownMenuItem
                                onClick={async () => {
                                  setActionLoading(`resend-${profile.user_id}`);
                                  try {
                                    const { data, error } = await supabase.functions.invoke("resend-verification", {
                                      body: { user_id: profile.user_id },
                                    });
                                    if (error) throw error;
                                    if (data?.error) throw new Error(data.error);
                                    toast({ title: "Convite reenviado com sucesso" });
                                  } catch (err: any) {
                                    toast({ title: "Erro", description: err.message, variant: "destructive" });
                                  } finally {
                                    setActionLoading(null);
                                  }
                                }}
                                disabled={isSelf(profile.user_id)}
                              >
                                <MailCheck className="mr-2 h-4 w-4" />
                                Reenviar Convite
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setConfirmDialog({
                                    open: true,
                                    title: "Excluir convite pendente?",
                                    description: "O usuário será removido permanentemente do sistema. Esta ação não pode ser desfeita.",
                                    onConfirm: () => invokeAction("delete_user", { user_id: profile.user_id }),
                                  });
                                }}
                                disabled={isSelf(profile.user_id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Convite
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(profile.user_id, profile.role)}
                            disabled={isSelf(profile.user_id)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            {profile.role === "admin" ? "Tornar Operador" : "Tornar Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(profile.user_id, profile.is_active)}
                            disabled={isSelf(profile.user_id)}
                            className={profile.is_active ? "text-destructive" : ""}
                          >
                            <UserCog className="mr-2 h-4 w-4" />
                            {profile.is_active ? "Desativar Conta" : "Ativar Conta"}
                          </DropdownMenuItem>
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

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users-with-roles"] })}
      />

      <AlertDialog open={confirmDialog.open} onOpenChange={(v) => !v && setConfirmDialog((p) => ({ ...p, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              confirmDialog.onConfirm();
              setConfirmDialog((p) => ({ ...p, open: false }));
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
