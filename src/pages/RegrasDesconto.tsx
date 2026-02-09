import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import { AppRole, DiscountRule } from "@/types";

export default function RegrasDesconto() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DiscountRule | null>(null);

  // Form state
  const [formRole, setFormRole] = useState<AppRole>("operator");
  const [formMax, setFormMax] = useState("");
  const [formApproval, setFormApproval] = useState(false);
  const [formDesc, setFormDesc] = useState("");

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const { data: rules, isLoading } = useQuery({
    queryKey: ["discount-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_rules")
        .select("*")
        .order("role")
        .order("max_discount_percent");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        role: formRole,
        max_discount_percent: parseFloat(formMax),
        requires_approval: formApproval,
        description: formDesc || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("discount_rules")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("discount_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Regra atualizada!" : "Regra criada!" });
      queryClient.invalidateQueries({ queryKey: ["discount-rules"] });
      closeModal();
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Regra excluída!" });
      queryClient.invalidateQueries({ queryKey: ["discount-rules"] });
      setDeleteId(null);
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormRole("operator");
    setFormMax("");
    setFormApproval(false);
    setFormDesc("");
    setModalOpen(true);
  };

  const openEdit = (rule: DiscountRule) => {
    setEditing(rule);
    setFormRole(rule.role);
    setFormMax(String(rule.max_discount_percent));
    setFormApproval(rule.requires_approval);
    setFormDesc(rule.description || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  // Group rules by role for display
  const operatorRules = rules?.filter((r) => r.role === "operator") || [];
  const adminRules = rules?.filter((r) => r.role === "admin") || [];

  const renderRuleCard = (role: string, roleRules: DiscountRule[]) => {
    const autoRule = roleRules.find((r) => !r.requires_approval);
    const approvalRule = roleRules.find((r) => r.requires_approval);
    return (
      <Card key={role}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {role === "operator" ? "Operador" : "Administrador"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {autoRule && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px]">Auto</Badge>
              <span>Até {autoRule.max_discount_percent}% sem aprovação</span>
            </div>
          )}
          {approvalRule && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">Aprovação</Badge>
              <span>Até {approvalRule.max_discount_percent}% com aprovação</span>
            </div>
          )}
          {!autoRule && !approvalRule && (
            <p className="text-muted-foreground">Nenhuma regra configurada</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regras de Desconto</h1>
          <p className="text-muted-foreground">Configure faixas de desconto por perfil</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Regra
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderRuleCard("operator", operatorRules)}
        {renderRuleCard("admin", adminRules)}
      </div>

      {/* Full table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Desconto Máximo (%)</TableHead>
                  <TableHead>Requer Aprovação</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules?.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Badge variant={rule.role === "admin" ? "default" : "secondary"}>
                        {rule.role === "admin" ? "Admin" : "Operador"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-medium">{rule.max_discount_percent}%</TableCell>
                    <TableCell>
                      {rule.requires_approval ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">Sim</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{rule.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Regra" : "Nova Regra de Desconto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Desconto Máximo (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={formMax}
                onChange={(e) => setFormMax(e.target.value)}
                placeholder="Ex: 10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formApproval} onCheckedChange={setFormApproval} />
              <Label>Requer aprovação do administrador</Label>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Ex: Faixa padrão para operadores"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !formMax || parseFloat(formMax) <= 0}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra de desconto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A regra será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
