import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Percent, Pencil, Loader2, Check, X } from "lucide-react";

export default function RegrasDesconto() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [newLimit, setNewLimit] = useState("");

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const { data: operatorRule, isLoading } = useQuery({
    queryKey: ["discount-rules", "operator"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_rules")
        .select("*")
        .eq("role", "operator")
        .eq("requires_approval", false)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (maxPercent: number) => {
      if (!operatorRule) throw new Error("Regra não encontrada");
      const { error } = await supabase
        .from("discount_rules")
        .update({ max_discount_percent: maxPercent })
        .eq("id", operatorRule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Limite atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["discount-rules"] });
      setEditing(false);
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const startEdit = () => {
    setNewLimit(String(operatorRule?.max_discount_percent || 5));
    setEditing(true);
  };

  const confirmEdit = () => {
    const val = parseFloat(newLimit);
    if (isNaN(val) || val <= 0 || val > 100) {
      toast({ title: "Valor inválido", description: "Insira um valor entre 0 e 100.", variant: "destructive" });
      return;
    }
    updateMutation.mutate(val);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Regras de Desconto</h1>
        <p className="text-muted-foreground">Configuração de limites de desconto por perfil</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin card - informativo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Administrador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">Desconto livre</p>
              <p className="text-sm text-muted-foreground mt-1">
                Administradores podem aplicar qualquer percentual de desconto sem restrições.
              </p>
            </CardContent>
          </Card>

          {/* Operator card - editável */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                Operador
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Limite máximo (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0.5}
                        max={100}
                        step={0.5}
                        value={newLimit}
                        onChange={(e) => setNewLimit(e.target.value)}
                        className="w-32"
                        autoFocus
                      />
                      <Button size="icon" onClick={confirmEdit} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">Até {operatorRule?.max_discount_percent || 0}%</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Desconto acima deste limite será bloqueado automaticamente.
                    </p>
                  </div>
                  <Button variant="outline" size="icon" onClick={startEdit}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
