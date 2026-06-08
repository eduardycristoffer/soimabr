import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Share2, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface Props {
  quoteId: string;
  ownerId: string;
}

export default function QuoteShareCard({ quoteId, ownerId }: Props) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string>("");

  const isOwner = user?.user_id === ownerId;
  if (!isOwner && !isAdmin) return null;

  const { data: shares } = useQuery({
    queryKey: ["quote-shares", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_shares")
        .select("id, shared_with_user_id")
        .eq("quote_id", quoteId);
      if (error) throw error;
      return data;
    },
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

  const sharedIds = new Set((shares || []).map((s: any) => s.shared_with_user_id));
  const available = (directory || []).filter(
    (u: any) => u.user_id !== ownerId && !sharedIds.has(u.user_id)
  );

  const addShare = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("quote_shares").insert({
        quote_id: quoteId,
        shared_with_user_id: userId,
        granted_by: user!.user_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-shares", quoteId] });
      setSelected("");
      toast({ title: "Vendedor adicionado", description: "Agora pode visualizar esta proposta." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase.from("quote_shares").delete().eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-shares", quoteId] });
      toast({ title: "Acesso removido" });
    },
  });

  const nameOf = (id: string) =>
    (directory || []).find((u: any) => u.user_id === id)?.name || "Vendedor";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Share2 className="h-4 w-4" /> Compartilhar com vendedores
        </CardTitle>
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
            size="sm"
            disabled={!selected || addShare.isPending}
            onClick={() => addShare.mutate(selected)}
          >
            {addShare.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Adicionar
          </Button>
        </div>

        {shares && shares.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {shares.map((s: any) => (
              <Badge key={s.id} variant="secondary" className="gap-1">
                {nameOf(s.shared_with_user_id)}
                <button
                  type="button"
                  className="hover:text-destructive ml-1"
                  onClick={() => removeShare.mutate(s.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Apenas você (e admins) vê esta proposta.</p>
        )}
      </CardContent>
    </Card>
  );
}
