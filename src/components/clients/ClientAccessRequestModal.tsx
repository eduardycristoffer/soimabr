import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cnpjDigits: string;
}

export default function ClientAccessRequestModal({ open, onOpenChange, cnpjDigits }: Props) {
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Não autenticado");

      const { error } = await supabase.from("client_access_requests").insert({
        requester_id: session.session.user.id,
        cnpj_digits: cnpjDigits,
        reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Solicitação enviada!", description: "O administrador será notificado." });
      setReason("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: "Erro ao solicitar acesso", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            CNPJ já cadastrado
          </DialogTitle>
          <DialogDescription>
            Este CNPJ já está cadastrado no sistema e não está atribuído a você. 
            Solicite acesso ao administrador para utilizar este cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da solicitação (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Descreva por que precisa acessar este cliente..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Solicitar Acesso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
