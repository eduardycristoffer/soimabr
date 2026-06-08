import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export default function GlobalAccessManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string>("");

  const { data: accesses } = useQuery({
    queryKey: ["user-quote-access", user?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_quote_access")
        .select("id, viewer_id")
        .eq("owner_id", user!.user_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.user_id,
  });

  const { data: directory } = useQuery({
    queryKey: ["profiles-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_directory")
        .select("user_id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const grantedIds = new Set((accesses || []).map((a: any) => a.viewer_id));
  const available = (directory || []).filter(
    (u: any) => u.user_id !== user?.user_id && !grantedIds.has(u.user_id)
  );

  const grant = useMutation({
    mutationFn: async (viewerId: string) => {
      const { error } = await supabase.from("user_quote_access").insert({
        owner_id: user!.user_id,
        viewer_id: viewerId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-quote-access", user?.user_id] });
      setSelected("");
      toast({ title: "Acesso concedido", description: "Esse vendedor agora vê todas as suas propostas." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_quote_access").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-quote-access", user?.user_id] });
      toast({ title: "Acesso revogado" });
    },
  });

  const nameOf = (id: string) =>
    (directory || []).find((u: any) => u.user_id === id)?.name || "Vendedor";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Vendedores com acesso às minhas propostas
        </CardTitle>
        <CardDescription>
          Quem você listar aqui passa a ver <strong>todas as suas propostas</strong> (atuais e futuras).
          Para compartilhar uma proposta específica, use o botão "Compartilhar" dentro da proposta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um vendedor..." />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">Nenhum vendedor disponível</div>
              ) : (
                available.map((u: any) => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            disabled={!selected || grant.isPending}
            onClick={() => grant.mutate(selected)}
          >
            {grant.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Conceder acesso
          </Button>
        </div>

        {accesses && accesses.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {accesses.map((a: any) => (
              <Badge key={a.id} variant="secondary" className="gap-1">
                {nameOf(a.viewer_id)}
                <button
                  type="button"
                  className="hover:text-destructive ml-1"
                  onClick={() => revoke.mutate(a.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum vendedor com acesso global.</p>
        )}
      </CardContent>
    </Card>
  );
}
