import { formatDecimal } from "@/lib/numberFormat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatQuoteAmount } from "@/lib/quoteMoney";
import EmailDispatchApprovals from "@/components/quotes/EmailDispatchApprovals";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Loader2, FileText } from "lucide-react";

interface ApprovalRequest {
  id: string;
  quote_id: string;
  requested_by: string;
  requested_at: string;
  discount_percent: number;
  justification: string;
  status: "pending" | "approved" | "rejected";
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  quotes: {
    quote_number: string;
    subtotal: number;
    currency: string;
    usd_brl_rate_used?: number | null;
    project_name: string | null;
    clients: { razao_social: string; nome_fantasia: string | null } | null;
  } | null;
  requester_profile: { name: string; email: string } | null;
}

export default function Aprovacoes() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [actionModal, setActionModal] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [notes, setNotes] = useState("");

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const { data: requests, isLoading } = useQuery({
    queryKey: ["discount-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_approval_requests")
        .select("*, quotes(quote_number, subtotal, currency, usd_brl_rate_used, project_name, clients(razao_social, nome_fantasia))")
        .order("requested_at", { ascending: false });
      if (error) throw error;

      // Fetch requester profiles separately
      const userIds = [...new Set(data.map((r: any) => r.requested_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      return data.map((r: any) => ({
        ...r,
        requester_profile: profiles?.find((p) => p.user_id === r.requested_by) || null,
      })) as ApprovalRequest[];
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      const newStatus = action === "approve" ? "approved" : "rejected";

      // Update approval request
      const { error: reqError } = await supabase
        .from("discount_approval_requests")
        .update({
          status: newStatus,
          decided_by: session.session.user.id,
          decided_at: new Date().toISOString(),
          decision_notes: notes || null,
        })
        .eq("id", id);
      if (reqError) throw reqError;

      // If approved, also update the quote
      if (action === "approve") {
        const request = requests?.find((r) => r.id === id);
        if (request) {
          const { error: quoteError } = await supabase
            .from("quotes")
            .update({
              discount_approved: true,
              discount_approved_by: session.session.user.id,
              discount_approved_at: new Date().toISOString(),
            })
            .eq("id", request.quote_id);
          if (quoteError) throw quoteError;
        }
      }
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === "approve" ? "Desconto aprovado!" : "Desconto rejeitado",
        description: action === "approve"
          ? "O operador poderá finalizar a proposta."
          : "O operador será notificado para ajustar.",
      });
      queryClient.invalidateQueries({ queryKey: ["discount-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setActionModal(null);
      setNotes("");
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const decidedRequests = requests?.filter((r) => r.status !== "pending") || [];

  const statusConfig = {
    pending: { label: "Pendente", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    approved: { label: "Aprovado", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
    rejected: { label: "Rejeitado", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
  };

  const renderCard = (req: ApprovalRequest, showActions: boolean) => {
    const cfg = statusConfig[req.status];
    const Icon = cfg.icon;
    const discountVal = req.quotes ? req.quotes.subtotal * (req.discount_percent / 100) : 0;

    return (
      <Card key={req.id} className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-semibold text-sm">{req.quotes?.quote_number || "-"}</span>
                <Badge variant="outline" className={cfg.color}>
                  <Icon className="h-3 w-3 mr-1" />
                  {cfg.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {req.quotes?.clients?.nome_fantasia || req.quotes?.clients?.razao_social || "Cliente"}
                {req.quotes?.project_name && ` · ${req.quotes.project_name}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-destructive">{formatDecimal(req.discount_percent)}%</p>
              <p className="text-xs text-muted-foreground">
                -{req.quotes ? formatQuoteAmount(discountVal, req.quotes) : "-"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Solicitado por:</span>
              <p className="font-medium">{req.requester_profile?.name || req.requested_by}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Data:</span>
              <p className="font-medium">{formatDate(req.requested_at)}</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded p-2">
            <p className="text-xs text-muted-foreground mb-1">Justificativa:</p>
            <p className="text-sm">{req.justification}</p>
          </div>

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
                onClick={() => { setActionModal({ id: req.id, action: "reject" }); setNotes(""); }}
              >
                <XCircle className="mr-2 h-4 w-4" /> Rejeitar
              </Button>
              <Button
                className="flex-1"
                onClick={() => { setActionModal({ id: req.id, action: "approve" }); setNotes(""); }}
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Aprovações de Desconto</h1>
        <p className="text-muted-foreground">Gerencie pedidos de desconto dos operadores</p>
      </div>

      {/* Envios de proposta por e-mail aguardando autorização (só aparece se houver pendências) */}
      <EmailDispatchApprovals />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Pending */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pendentes ({pendingRequests.length})
            </h2>
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-green-400 mb-2" />
                  <p className="text-muted-foreground">Nenhum pedido pendente</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => renderCard(req, true))}
              </div>
            )}
          </div>

          {/* Decided */}
          {decidedRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Histórico</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {decidedRequests.map((req) => renderCard(req, false))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Action modal */}
      <Dialog open={!!actionModal} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal?.action === "approve" ? "Aprovar Desconto" : "Rejeitar Desconto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {actionModal?.action === "approve"
                ? "Ao aprovar, o operador poderá finalizar a proposta com este desconto."
                : "Ao rejeitar, o operador deverá ajustar o desconto para dentro da faixa permitida."}
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
              onClick={() => actionModal && decideMutation.mutate({ id: actionModal.id, action: actionModal.action })}
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
