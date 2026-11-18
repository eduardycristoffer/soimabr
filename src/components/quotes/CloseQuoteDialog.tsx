import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { closingDateLabel, closingTimestamp, todayBR, validateClosingDate } from "@/lib/quoteClosing";
import { formatQuoteAmount } from "@/lib/quoteMoney";

export interface CloseQuoteTarget {
  id: string;
  quote_number: string;
  project_name?: string | null;
  total?: number | null;
  currency?: string | null;
  usd_brl_rate_used?: number | string | null;
  created_at?: string | null;
  closed_at?: string | null;
  closing_note?: string | null;
  clients?: { razao_social?: string | null; nome_fantasia?: string | null } | null;
}

interface Props {
  quote: CloseQuoteTarget | null;
  /** "close" confirma o fechamento; "undo" desfaz (para o caso de ter confirmado por engano) */
  mode: "close" | "undo";
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}

/** Janela para CONFIRMAR o fechamento de uma proposta finalizada (ou desfazer). */
export default function CloseQuoteDialog({ quote, mode, open, onClose, onDone }: Props) {
  const queryClient = useQueryClient();
  const [day, setDay] = useState(todayBR());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setDay(todayBR());
      setNote("");
    }
  }, [open, quote?.id]);

  const error = mode === "close" && quote ? validateClosingDate(day, quote.created_at) : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!quote) throw new Error("Proposta não encontrada.");
      if (mode === "close") {
        const problem = validateClosingDate(day, quote.created_at);
        if (problem) throw new Error(problem);
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) throw new Error("Sessão expirada. Entre novamente para confirmar o fechamento.");
        // A condição na própria atualização evita confirmar duas vezes ou fechar o que mudou de situação.
        const { data, error: upErr } = await (supabase.from("quotes") as any)
          .update({ closed_at: closingTimestamp(day), closed_by: userData.user.id, closing_note: note.trim() || null })
          .eq("id", quote.id)
          .eq("status", "finalized")
          .is("closed_at", null)
          .select("id");
        if (upErr) throw upErr;
        if (!data || data.length === 0) throw new Error("Esta proposta já foi fechada ou não está mais finalizada. Atualize a lista.");
      } else {
        const { data, error: upErr } = await (supabase.from("quotes") as any)
          .update({ closed_at: null, closed_by: null, closing_note: null })
          .eq("id", quote.id)
          .not("closed_at", "is", null)
          .select("id");
        if (upErr) throw upErr;
        if (!data || data.length === 0) throw new Error("Esta proposta não está marcada como fechada.");
      }
    },
    onSuccess: () => {
      toast({
        title: mode === "close" ? "Fechamento confirmado" : "Fechamento desfeito",
        description: mode === "close" ? `Proposta ${quote?.quote_number} marcada como fechada.` : `Proposta ${quote?.quote_number} voltou a ficar em aberto.`,
      });
      queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] === "quotes" || (q.queryKey[0] as string).startsWith("quote-") || (q.queryKey[0] as string).startsWith("report")),
      });
      onDone?.();
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Não foi possível salvar", description: e?.message || "Tente novamente", variant: "destructive" });
    },
  });

  if (!quote) return null;
  const clientName = quote.clients?.nome_fantasia || quote.clients?.razao_social || "—";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !mutation.isPending && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-7 sm:rounded-3xl">
        <DialogHeader className="space-y-1.5 text-left">
          <div className={`mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] ${mode === "close" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
            {mode === "close" ? <CheckCircle2 className="h-6 w-6" /> : <RotateCcw className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {mode === "close" ? "Confirmar fechamento" : "Desfazer fechamento"}
          </DialogTitle>
          <DialogDescription className="text-[15px]">
            {mode === "close"
              ? "Marque esta proposta como fechada: o cliente aceitou e o negócio foi confirmado."
              : "A proposta volta a ficar em aberto (finalizada, sem fechamento confirmado)."}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl bg-muted/50 p-4 text-sm">
          <dt className="text-muted-foreground">Proposta</dt>
          <dd className="text-right font-medium">{quote.quote_number}</dd>
          <dt className="text-muted-foreground">Cliente</dt>
          <dd className="truncate text-right font-medium">{clientName}</dd>
          {quote.project_name ? (<><dt className="text-muted-foreground">Obra</dt><dd className="truncate text-right">{quote.project_name}</dd></>) : null}
          <dt className="text-muted-foreground">Valor</dt>
          <dd className="text-right font-medium">{formatQuoteAmount(quote.total, quote as any)}</dd>
          {mode === "undo" && quote.closed_at ? (<><dt className="text-muted-foreground">Fechada em</dt><dd className="text-right">{closingDateLabel(quote.closed_at)}</dd></>) : null}
          {mode === "undo" && quote.closing_note ? (<><dt className="text-muted-foreground">Observação</dt><dd className="text-right">{quote.closing_note}</dd></>) : null}
        </dl>

        {mode === "close" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="closing-date" className="text-sm">Data do fechamento</Label>
              <Input id="closing-date" type="date" value={day} max={todayBR()} onChange={(e) => setDay(e.target.value)} aria-invalid={!!error} />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="closing-note" className="text-sm">Observação <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Textarea id="closing-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: pedido de compra nº 123, pagamento acertado por e-mail" />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending} className="rounded-full">Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !!error}
            variant={mode === "close" ? "default" : "outline"}
            className="rounded-full"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "close" ? "Confirmar fechamento" : "Desfazer fechamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
