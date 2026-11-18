import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Mail, Paperclip, XCircle } from "lucide-react";
import { callProposalEmail, useEmailIntegration } from "@/hooks/useEmailIntegration";

/**
 * Fila do administrador: propostas que um vendedor pediu para enviar ao cliente e que
 * aguardam autorização. Só aparece quando o envio por e-mail está instalado e há pendências.
 */
export default function EmailDispatchApprovals() {
  const qc = useQueryClient();
  const email = useEmailIntegration();
  const ready = email.dbReady && email.deployed;
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: pending } = useQuery({
    queryKey: ["proposal-email-dispatches-all", "pending"],
    enabled: ready,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("proposal_email_dispatches")
        .select("*")
        .eq("status", "pending_authorization")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data || []) as any[];
      if (!rows.length) return [];

      const quoteIds = [...new Set(rows.map((r) => r.quote_id))];
      const userIds = [...new Set(rows.map((r) => r.requested_by))];
      const [{ data: quotes }, { data: people }] = await Promise.all([
        supabase.from("quotes").select("id, quote_number, project_name, clients(razao_social, nome_fantasia)").in("id", quoteIds),
        supabase.from("profiles_directory").select("user_id, name").in("user_id", userIds),
      ]);
      const qMap = new Map((quotes || []).map((q: any) => [q.id, q]));
      const pMap = new Map((people || []).map((p: any) => [p.user_id, p.name]));
      return rows.map((r) => ({ ...r, quote: qMap.get(r.quote_id), requester: pMap.get(r.requested_by) || "—" }));
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["proposal-email-dispatches-all"] });
    qc.invalidateQueries({ queryKey: ["proposal-email-dispatches"] });
  };

  const authorize = useMutation({
    mutationFn: (dispatchId: string) => callProposalEmail({ action: "authorize", dispatchId }),
    onSuccess: (r: any) => {
      refresh();
      if (r?.ok === false) toast({ title: "Autorizado, mas o envio falhou", description: r.error, variant: "destructive" });
      else toast({ title: "Proposta enviada ao cliente" });
    },
    onError: (e: any) => toast({ title: "Não foi possível autorizar", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: ({ dispatchId, why }: { dispatchId: string; why: string }) =>
      callProposalEmail({ action: "reject", dispatchId, reason: why }),
    onSuccess: () => { refresh(); setRejecting(null); setReason(""); toast({ title: "Envio negado" }); },
    onError: (e: any) => toast({ title: "Não foi possível negar", description: e.message, variant: "destructive" }),
  });

  if (!ready || !pending || pending.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Mail className="h-5 w-5 text-amber-500" />
        Envios de proposta aguardando autorização ({pending.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pending.map((d: any) => (
          <Card key={d.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono font-semibold text-sm">{d.quote?.quote_number || "—"}</div>
                  <div className="text-sm text-muted-foreground">
                    {d.quote?.clients?.nome_fantasia || d.quote?.clients?.razao_social || "Cliente"}
                    {d.quote?.project_name ? ` · ${d.quote.project_name}` : ""}
                  </div>
                </div>
                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">Aguardando</Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Pedido por <strong>{d.requester}</strong> em{" "}
                {new Date(d.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Para:</span> {(d.to_emails || []).join(", ")}</div>
                {(d.cc_emails || []).length > 0 && <div><span className="text-muted-foreground">Cc:</span> {d.cc_emails.join(", ")}</div>}
                <div><span className="text-muted-foreground">Assunto:</span> {d.subject}</div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground max-h-40 overflow-y-auto pt-1">{d.body_text}</pre>
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                  <Paperclip className="h-3 w-3" /> PDF da proposta (gerado no momento do envio)
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setRejecting(d.id); setReason(""); }} disabled={authorize.isPending}>
                  <XCircle className="mr-2 h-4 w-4" /> Negar
                </Button>
                <Button className="flex-1" onClick={() => authorize.mutate(d.id)} disabled={authorize.isPending}>
                  {authorize.isPending && authorize.variables === d.id
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Autorizar e enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Negar o envio</DialogTitle></DialogHeader>
          <Textarea placeholder="Motivo (opcional)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={reject.isPending}
              onClick={() => rejecting && reject.mutate({ dispatchId: rejecting, why: reason })}>
              {reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
