import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onClose: () => void;
  log: any | null;
}

export default function WebhookLogDetailModal({ open, onClose, log }: Props) {
  if (!log) return null;

  const statusColor = log.status === "success" ? "default" : log.status === "blocked" ? "secondary" : "destructive";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Log</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Direção:</span>{" "}
              <Badge variant="outline">{log.direction === "inbound" ? "Entrada" : "Saída"}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge variant={statusColor}>{log.status}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Evento:</span> {log.event_type || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">HTTP:</span> {log.http_status || "—"}
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Endpoint:</span>{" "}
              <span className="font-mono text-xs break-all">{log.endpoint || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Data:</span>{" "}
              {new Date(log.created_at).toLocaleString("pt-BR")}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Payload</p>
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-[200px]">
              {JSON.stringify(log.payload, null, 2) || "—"}
            </pre>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Response</p>
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-[200px]">
              {JSON.stringify(log.response, null, 2) || "—"}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
