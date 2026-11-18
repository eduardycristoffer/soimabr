import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Clock, Copy, Eye, Loader2, RefreshCw, Send, XCircle, PenLine } from "lucide-react";
import { useAutentiqueAvailability } from "@/hooks/useAutentique";

type Kind = "seller" | "buyer" | "witness";
interface SignerRow { kind: Kind; id: string | null; name: string; email: string; }

const KIND_LABEL: Record<Kind, string> = { seller: "Vendedora", buyer: "Compradora", witness: "Testemunha" };
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_INFO: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "Aguardando", icon: Clock, className: "text-amber-700 bg-amber-50 border-amber-200" },
  viewed: { label: "Visualizou", icon: Eye, className: "text-blue-700 bg-blue-50 border-blue-200" },
  signed: { label: "Assinou", icon: CheckCircle2, className: "text-green-700 bg-green-50 border-green-200" },
  rejected: { label: "Recusou", icon: XCircle, className: "text-red-700 bg-red-50 border-red-200" },
};

async function callFunction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("contract-signature", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* mantém a mensagem */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

interface Props {
  contract: any;
  onChanged: () => void;
}

/**
 * Envio do contrato para assinatura digital (Autentique) e acompanhamento de quem já assinou.
 * Só aparece quando o banco foi atualizado, a função publicada e a chave configurada.
 */
export function ContractSignatureCard({ contract, onChanged }: Props) {
  const qc = useQueryClient();
  const autentique = useAutentiqueAvailability();
  const [dialogOpen, setDialogOpen] = useState(false);

  const contractId: string = contract.id;
  const sentToAutentique = !!contract.autentique_document_id;

  const { data: requests } = useQuery({
    queryKey: ["contract-signature-requests", contractId],
    enabled: autentique.dbReady && sentToAutentique,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contract_signature_requests")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const sync = useMutation({
    mutationFn: () => callFunction({ action: "sync", contractId }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["contract-signature-requests", contractId] });
      onChanged();
      toast({
        title: r?.finalized ? "Contrato assinado por todos!" : "Status atualizado",
        description: r?.finalized ? "O PDF assinado foi guardado no sistema." : `${r?.signedCount ?? 0} de ${r?.total ?? 0} assinaturas.`,
      });
    },
    onError: (e: any) => toast({ title: "Não foi possível atualizar", description: e.message, variant: "destructive" }),
  });

  if (autentique.isLoading || !autentique.dbReady || !autentique.deployed) return null;

  if (!autentique.configured) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><PenLine className="h-4 w-4" /> Assinatura digital (Autentique)</CardTitle>
          <CardDescription>
            Ainda não conectada. Quando a SOIMA contratar o plano e a chave de API for informada nos segredos do sistema,
            o envio para assinatura e o acompanhamento aparecem aqui.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: "Link copiado" }); }
    catch { toast({ title: "Não foi possível copiar", variant: "destructive" }); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2"><PenLine className="h-4 w-4" /> Assinatura digital (Autentique)</CardTitle>
          <div className="flex items-center gap-2">
            {autentique.sandbox && (
              <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50">Modo teste</Badge>
            )}
            {sentToAutentique && (
              <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
                {sync.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Atualizar status
              </Button>
            )}
          </div>
        </div>
        {autentique.sandbox && (
          <CardDescription className="flex items-start gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Modo teste: os documentos enviados agora não têm validade jurídica. Para contratos reais, o administrador precisa ativar o modo de produção.
          </CardDescription>
        )}
        {!autentique.webhookConfigured && sentToAutentique && (
          <CardDescription>
            O aviso automático de assinatura (webhook) ainda não está configurado: use "Atualizar status" para conferir.
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!sentToAutentique && contract.status === "aprovado" && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              O contrato está aprovado. Envie para as partes assinarem digitalmente: as assinaturas e o PDF final ficam registrados aqui.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" /> Enviar para assinatura digital
            </Button>
          </div>
        )}

        {!sentToAutentique && contract.status !== "aprovado" && (
          <p className="text-sm text-muted-foreground">
            Aprove o contrato para poder enviá-lo para assinatura digital.
          </p>
        )}

        {sentToAutentique && (
          <div className="space-y-2">
            {(requests || []).map((r: any) => {
              const info = STATUS_INFO[r.status] || STATUS_INFO.pending;
              const Icon = info.icon;
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {KIND_LABEL[r.signer_kind as Kind] || r.signer_kind}
                      {r.email ? ` · ${r.email}` : " · sem e-mail (envie o link)"}
                    </div>
                    {r.status === "signed" && r.signed_at && (
                      <div className="text-[11px] text-muted-foreground">
                        Assinou em {new Date(r.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </div>
                    )}
                    {r.status === "rejected" && r.rejected_reason && (
                      <div className="text-[11px] text-destructive">Motivo: {r.rejected_reason}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.sign_link && r.status !== "signed" && (
                      <Button variant="ghost" size="sm" onClick={() => copy(r.sign_link)} title="Copiar link de assinatura">
                        <Copy className="h-3 w-3 mr-1" /> Link
                      </Button>
                    )}
                    <Badge variant="outline" className={info.className}>
                      <Icon className="h-3 w-3 mr-1" /> {info.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {(requests || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Carregando assinaturas…</p>
            )}
          </div>
        )}
      </CardContent>

      <SendDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        contract={contract}
        sandbox={autentique.sandbox}
        onSent={async () => {
          setDialogOpen(false);
          qc.invalidateQueries({ queryKey: ["contract-signature-requests", contractId] });
          onChanged();
        }}
      />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Diálogo de envio: confere quem assina e os e-mails
// ─────────────────────────────────────────────────────────
function SendDialog({ open, onClose, contract, sandbox, onSent }: {
  open: boolean; onClose: () => void; contract: any; sandbox: boolean; onSent: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<SignerRow[]>([]);
  const [message, setMessage] = useState("");

  const { data: people } = useQuery({
    queryKey: ["contract-signers-for-send", contract.id],
    enabled: open,
    queryFn: async () => {
      const [{ data: sigs }, { data: wits }] = await Promise.all([
        supabase.from("contract_signatories").select("*").eq("contract_id", contract.id).order("side").order("order_index"),
        supabase.from("contract_witnesses").select("*").eq("contract_id", contract.id).order("order_index"),
      ]);
      return { sigs: (sigs || []) as any[], wits: (wits || []) as any[] };
    },
  });

  useEffect(() => {
    if (!open || !people) return;
    const named = (s: any) => (s.name || "").trim();
    setRows([
      ...people.sigs.filter(named).map((s) => ({ kind: s.side as Kind, id: s.id as string, name: named(s), email: String(s.email || "") })),
      ...people.wits.filter(named).map((w) => ({ kind: "witness" as Kind, id: w.id as string, name: named(w), email: String(w.email || "") })),
    ]);
    setMessage(`Segue o contrato ${contract.contract_number} para sua assinatura digital.`);
  }, [open, people, contract.contract_number]);

  const invalid = rows.filter((r) => r.email.trim() && !EMAIL_RX.test(r.email.trim()));
  const noEmail = rows.filter((r) => !r.email.trim());
  const hasParty = rows.some((r) => r.kind !== "witness");

  const send = useMutation({
    mutationFn: async () => {
      const data = await callFunction({
        action: "send",
        contractId: contract.id,
        message,
        signers: rows.map((r) => ({ kind: r.kind, id: r.id, name: r.name, email: r.email.trim() || null })),
      });
      return data;
    },
    onSuccess: async (data: any) => {
      toast({
        title: "Enviado para assinatura",
        description: data?.sandbox ? "Modo teste: documento sem validade jurídica." : "As partes receberam o link de assinatura.",
      });
      await onSent();
    },
    onError: (e: any) => toast({ title: "Não foi possível enviar", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar para assinatura digital</DialogTitle>
          <DialogDescription>
            Confira quem vai assinar. Cada pessoa recebe o link por e-mail. O PDF enviado é gerado agora, com o estado atual do contrato.
          </DialogDescription>
        </DialogHeader>

        {sandbox && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Modo teste: este envio não tem validade jurídica e não consome créditos.
          </div>
        )}

        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum signatário cadastrado neste contrato.</p>}
          {rows.map((r, i) => (
            <div key={`${r.kind}-${r.id}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-2 items-end">
              <div>
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{KIND_LABEL[r.kind]}</div>
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="nome@empresa.com.br"
                  value={r.email}
                  onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
                />
              </div>
            </div>
          ))}
        </div>

        {invalid.length > 0 && (
          <p className="text-xs text-destructive">E-mail inválido para: {invalid.map((r) => r.name).join(", ")}.</p>
        )}
        {noEmail.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Sem e-mail: {noEmail.map((r) => r.name).join(", ")}. Essas pessoas não recebem e-mail — depois do envio, copie o link delas e mande por WhatsApp.
          </p>
        )}
        {!hasParty && rows.length > 0 && (
          <p className="text-xs text-destructive">Inclua ao menos um representante da vendedora ou da compradora.</p>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Mensagem para os assinantes</Label>
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>Cancelar</Button>
          <Button onClick={() => send.mutate()} disabled={send.isPending || rows.length === 0 || invalid.length > 0 || !hasParty}>
            {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
