import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Download, Loader2, Mail, Paperclip, RefreshCw, Send, XCircle } from "lucide-react";
import { callProposalEmail, useEmailIntegration } from "@/hooks/useEmailIntegration";
import { DISPATCH_STATUS, defaultProposalEmail, parseEmailInput } from "@/lib/proposalEmail";
import { downloadQuotePdf } from "@/lib/quotePdf";

interface Props {
  quoteId: string | null;
  open: boolean;
  onClose: () => void;
}

const TONE: Record<string, string> = {
  ok: "text-green-700 bg-green-50 border-green-200",
  warn: "text-amber-700 bg-amber-50 border-amber-200",
  bad: "text-red-700 bg-red-50 border-red-200",
  neutral: "text-muted-foreground bg-muted border-border",
};

/**
 * Envio da proposta ao cliente por e-mail, com o PDF anexado.
 * O usuário confere destinatários, assunto e mensagem e marca "Autorizo o envio".
 */
export default function SendProposalEmailDialog({ quoteId, open, onClose }: Props) {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const email = useEmailIntegration();

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data: quote } = useQuery({
    queryKey: ["quote-for-email", quoteId],
    enabled: open && !!quoteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, status, language, project_name, discount_approved, created_by, clients(razao_social, nome_fantasia, contato_nome, contato_email, email)")
        .eq("id", quoteId!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["proposal-email-dispatches", quoteId],
    enabled: open && !!quoteId && email.dbReady,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("proposal_email_dispatches")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Preenche o e-mail ao abrir (e só uma vez por abertura)
  useEffect(() => {
    if (!open || !quote) return;
    const c = quote.clients || {};
    const m = defaultProposalEmail(quote.language, {
      numero: quote.quote_number,
      contato: c.contato_nome,
      obra: quote.project_name,
      vendedor: user?.name,
    });
    setTo(c.contato_email || c.email || "");
    setCc("");
    setSubject(m.subject);
    setBody(m.body);
    setAuthorized(false);
    setSendError(null);
  }, [open, quote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toList = parseEmailInput(to);
  const ccList = parseEmailInput(cc);
  const invalid = [...toList.invalid, ...ccList.invalid];

  const needsApproval = email.requireAdminApproval && !isAdmin;
  const isFinalized = quote?.status === "finalized";
  const discountOk = quote?.discount_approved !== false;
  const canSend =
    email.configured && isFinalized && discountOk && toList.valid.length > 0 && invalid.length === 0 &&
    subject.trim().length > 0 && body.trim().length > 0 && authorized;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["proposal-email-dispatches", quoteId] });
    qc.invalidateQueries({ queryKey: ["proposal-email-dispatches-all"] });
  };

  const send = useMutation({
    mutationFn: () => callProposalEmail({
      action: "request_send",
      quoteId,
      to: toList.valid,
      cc: ccList.valid,
      subject: subject.trim(),
      body: body.trim(),
      authorize: true,
    }),
    onSuccess: (r: any) => {
      refresh();
      if (r?.ok === false) {
        setSendError(r.error || "O envio falhou.");
        return;
      }
      if (r?.status === "pending_authorization") {
        toast({ title: "Enviado para autorização", description: "Um administrador precisa autorizar antes de a proposta ir ao cliente." });
      } else {
        toast({ title: "Proposta enviada ao cliente", description: `E-mail com o PDF enviado para ${toList.valid.join(", ")}.` });
      }
      onClose();
    },
    onError: (e: any) => setSendError(e.message),
  });

  const act = useMutation({
    mutationFn: ({ action, dispatchId }: { action: "retry" | "cancel"; dispatchId: string }) =>
      callProposalEmail({ action, dispatchId }),
    onSuccess: (r: any) => {
      refresh();
      if (r?.ok === false) toast({ title: "Falhou de novo", description: r.error, variant: "destructive" });
      else toast({ title: r?.status === "sent" ? "Proposta enviada" : "Atualizado" });
    },
    onError: (e: any) => toast({ title: "Não foi possível concluir", description: e.message, variant: "destructive" }),
  });

  const checkPdf = async () => {
    if (!quoteId) return;
    setDownloading(true);
    try {
      const name = await downloadQuotePdf(quoteId);
      toast({ title: "PDF baixado", description: name });
    } catch (e: any) {
      toast({ title: "Não foi possível gerar o PDF", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Enviar proposta ao cliente</DialogTitle>
          <DialogDescription>
            {quote ? <>Proposta <strong>{quote.quote_number}</strong> · {quote.clients?.nome_fantasia || quote.clients?.razao_social}</> : "Carregando…"}
          </DialogDescription>
        </DialogHeader>

        {!email.configured && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            O e-mail da empresa ainda não está conectado. Peça a um administrador em <strong>Integrações → E-mail</strong>.
          </div>
        )}
        {quote && !isFinalized && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Só propostas finalizadas podem ser enviadas ao cliente. Finalize esta proposta primeiro.
          </div>
        )}
        {quote && isFinalized && !discountOk && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            O desconto desta proposta ainda não foi aprovado. Aguarde a aprovação para enviar.
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Para (separe vários e-mails por vírgula)</Label>
            <Input type="text" inputMode="email" placeholder="cliente@empresa.com.br" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cópia (opcional)</Label>
            <Input type="text" inputMode="email" value={cc} onChange={(e) => setCc(e.target.value)} />
          </div>
          {invalid.length > 0 && (
            <p className="text-xs text-destructive">E-mail inválido: {invalid.join(", ")}</p>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Assunto</Label>
            <Input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mensagem</Label>
            <Textarea rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Paperclip className="h-4 w-4" />
              <span>Anexo: <strong>Proposta {quote?.quote_number}.pdf</strong> <span className="text-muted-foreground">(gerado automaticamente)</span></span>
            </div>
            <Button variant="outline" size="sm" onClick={checkPdf} disabled={downloading || !quote}>
              {downloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Conferir o PDF
            </Button>
          </div>

          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
            <Checkbox checked={authorized} onCheckedChange={(v) => setAuthorized(!!v)} className="mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">Autorizo o envio desta proposta ao cliente</div>
              <p className="text-xs text-muted-foreground">
                {needsApproval
                  ? "Depois da sua autorização, o envio ainda precisa ser liberado por um administrador."
                  : "Ao confirmar, o e-mail com o PDF é enviado imediatamente e o envio fica registrado com o seu nome."}
              </p>
            </div>
          </label>

          {sendError && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Não foi possível enviar</div>
                <div className="text-xs break-words">{sendError}</div>
              </div>
            </div>
          )}

          {(history || []).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Envios anteriores desta proposta</h4>
              {(history || []).map((h: any) => {
                const st = DISPATCH_STATUS[h.status] || DISPATCH_STATUS.authorized;
                return (
                  <div key={h.id} className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · para {(h.to_emails || []).join(", ")}
                      </span>
                      <Badge variant="outline" className={TONE[st.tone]}>{st.label}</Badge>
                    </div>
                    {h.status === "failed" && h.error && <p className="text-xs text-destructive break-words">{h.error}</p>}
                    {h.status === "rejected" && h.rejection_reason && <p className="text-xs text-destructive">Motivo: {h.rejection_reason}</p>}
                    {["failed", "pending_authorization"].includes(h.status) && (
                      <div className="flex gap-2 pt-1">
                        {h.status === "failed" && (
                          <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ action: "retry", dispatchId: h.id })}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Tentar de novo
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate({ action: "cancel", dispatchId: h.id })}>
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>Fechar</Button>
          <Button onClick={() => { setSendError(null); send.mutate(); }} disabled={!canSend || send.isPending}>
            {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {needsApproval ? "Enviar para autorização" : "Enviar ao cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
