import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Loader2, Users } from "lucide-react";

export default function SolicitacoesAcesso() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [actionModal, setActionModal] = useState<{ id: string; action: "approve" | "reject"; cnpjDigits: string; requesterId: string } | null>(null);
  const [notes, setNotes] = useState("");

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const { data: requests, isLoading } = useQuery({
    queryKey: ["client-access-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_access_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch requester profiles
      const userIds = [...new Set(data.map((r: any) => r.requester_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      return data.map((r: any) => ({
        ...r,
        requester_profile: profiles?.find((p: any) => p.user_id === r.requester_id) || null,
      }));
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, action, cnpjDigits, requesterId }: { id: string; action: "approve" | "reject"; cnpjDigits: string; requesterId: string }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      const newStatus = action === "approve" ? "approved" : "rejected";

      const { error: reqError } = await supabase
        .from("client_access_requests")
        .update({
          status: newStatus,
          decided_by: session.session.user.id,
          decided_at: new Date().toISOString(),
          decision_notes: notes || null,
        })
        .eq("id", id);
      if (reqError) throw reqError;

      // If approved, assign the client to the requester
      if (action === "approve") {
        const { error: clientError } = await supabase
          .from("clients")
          .update({ assigned_to: requesterId })
          .eq("cnpj_digits", cnpjDigits)
          .eq("is_active", true);
        if (clientError) throw clientError;
      }
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === "approve" ? "Acesso aprovado!" : "Solicitação rejeitada",
        description: action === "approve"
          ? "O operador agora pode acessar o cliente."
          : "O operador foi bloqueado.",
      });
      queryClient.invalidateQueries({ queryKey: ["client-access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setActionModal(null);
      setNotes("");
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));

  const formatCnpj = (digits: string) => {
    if (digits.length !== 14) return digits;
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  };

  const pendingRequests = requests?.filter((r: any) => r.status === "pending") || [];
  const decidedRequests = requests?.filter((r: any) => r.status !== "pending") || [];

  const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: "Pendente", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    approved: { label: "Aprovado", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
    rejected: { label: "Rejeitado", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
  };

  const renderCard = (req: any, showActions: boolean) => {
    const cfg = statusConfig[req.status];
    const Icon = cfg.icon;

    return (
      <Card key={req.id} className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-semibold text-sm">{formatCnpj(req.cnpj_digits)}</span>
                <Badge variant="outline" className={cfg.color}>
                  <Icon className="h-3 w-3 mr-1" />
                  {cfg.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Solicitado por:</span>
              <p className="font-medium">{req.requester_profile?.name || req.requester_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Data:</span>
              <p className="font-medium">{formatDate(req.created_at)}</p>
            </div>
          </div>

          {req.reason && (
            <div className="bg-muted/50 rounded p-2">
              <p className="text-xs text-muted-foreground mb-1">Motivo:</p>
              <p className="text-sm">{req.reason}</p>
            </div>
          )}

          {req.decision_notes && (
            <div className="bg-muted/50 rounded p-2">
              <p className="text-xs text-muted-foreground mb-1">Observação do admin:</p>
              <p className="text-sm">{req.decision_notes}</p>
            </div>
          )}

          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => { setActionModal({ id: req.id, action: "reject", cnpjDigits: req.cnpj_digits, requesterId: req.requester_id }); setNotes(""); }}
              >
                <XCircle className="mr-2 h-4 w-4" /> Rejeitar
              </Button>
              <Button
                className="flex-1"
                onClick={() => { setActionModal({ id: req.id, action: "approve", cnpjDigits: req.cnpj_digits, requesterId: req.requester_id }); setNotes(""); }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Solicitações de Acesso</h1>
        <p className="text-muted-foreground">Gerencie pedidos de acesso a clientes dos operadores</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pendentes ({pendingRequests.length})
            </h2>
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-green-400 mb-2" />
                  <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req: any) => renderCard(req, true))}
              </div>
            )}
          </div>

          {decidedRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Histórico</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {decidedRequests.map((req: any) => renderCard(req, false))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!actionModal} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal?.action === "approve" ? "Aprovar Acesso" : "Rejeitar Solicitação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {actionModal?.action === "approve"
                ? "Ao aprovar, o operador poderá acessar e criar propostas para este cliente."
                : "Ao rejeitar, o operador continuará sem acesso a este cliente."}
            </p>
            <Textarea
              placeholder="Observação (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancelar</Button>
            <Button
              variant={actionModal?.action === "approve" ? "default" : "destructive"}
              onClick={() => actionModal && decideMutation.mutate(actionModal)}
              disabled={decideMutation.isPending}
            >
              {decideMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionModal?.action === "approve" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
