import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const EVENT_TYPES = [
  { value: "lead.created", label: "Lead Criado" },
  { value: "lead.updated", label: "Lead Atualizado" },
  { value: "lead.converted", label: "Lead Convertido" },
  { value: "proposal.created", label: "Proposta Criada" },
  { value: "proposal.finalized", label: "Proposta Finalizada" },
  { value: "pipeline.stage_changed", label: "Mudança de Etapa" },
];

interface OutboundWebhook {
  id: string;
  event_type: string;
  target_url: string;
  headers: Record<string, string>;
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editing?: OutboundWebhook | null;
  isPending?: boolean;
}

export default function OutboundWebhookFormModal({ open, onClose, onSave, editing, isPending }: Props) {
  const [eventType, setEventType] = useState("lead.created");
  const [targetUrl, setTargetUrl] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [retryCount, setRetryCount] = useState(3);
  const [timeoutMs, setTimeoutMs] = useState(5000);

  useEffect(() => {
    if (editing) {
      setEventType(editing.event_type);
      setTargetUrl(editing.target_url);
      setHeadersText(editing.headers ? JSON.stringify(editing.headers, null, 2) : "{}");
      setIsActive(editing.is_active);
      setRetryCount(editing.retry_count);
      setTimeoutMs(editing.timeout_ms);
    } else {
      setEventType("lead.created");
      setTargetUrl("");
      setHeadersText("{}");
      setIsActive(true);
      setRetryCount(3);
      setTimeoutMs(5000);
    }
  }, [editing, open]);

  const handleSave = () => {
    let parsedHeaders = {};
    try { parsedHeaders = JSON.parse(headersText); } catch {}
    onSave({
      event_type: eventType,
      target_url: targetUrl,
      headers: parsedHeaders,
      is_active: isActive,
      retry_count: retryCount,
      timeout_ms: timeoutMs,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Webhook de Saída" : "Novo Webhook de Saída"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Evento</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL de Destino</Label>
            <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Headers (JSON)</Label>
            <Textarea value={headersText} onChange={(e) => setHeadersText(e.target.value)} className="font-mono text-xs" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Retries</Label>
              <Input type="number" min={0} max={10} value={retryCount} onChange={(e) => setRetryCount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Timeout (ms)</Label>
              <Input type="number" min={1000} max={30000} value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Ativo</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!targetUrl || isPending}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
