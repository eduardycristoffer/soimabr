import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function InboundWebhookConfig() {
  const queryClient = useQueryClient();
  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  const { data: config, isLoading } = useQuery({
    queryKey: ["webhook-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_configs")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase
        .from("webhook_configs")
        .update({ is_active: isActive } as any)
        .eq("id", config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-config"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const updateTokenMutation = useMutation({
    mutationFn: async (token: string | null) => {
      const { error } = await supabase
        .from("webhook_configs")
        .update({ secret_token: token } as any)
        .eq("id", config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-config"] });
      setTokenInput("");
      toast.success("Token atualizado");
    },
    onError: () => toast.error("Erro ao atualizar token"),
  });

  const generateToken = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    const token = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
    setTokenInput(token);
  };

  const endpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-leads`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  const maskedToken = config?.secret_token
    ? config.secret_token.substring(0, 6) + "••••••••••••"
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook de Entrada</CardTitle>
              <CardDescription>Receba leads automaticamente de fontes externas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config?.is_active ? "default" : "secondary"}>
                {config?.is_active ? "Ativo" : "Inativo"}
              </Badge>
              <Switch
                checked={config?.is_active ?? false}
                onCheckedChange={(v) => toggleMutation.mutate(v)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoint URL */}
          <div className="space-y-2">
            <Label>Endpoint (POST)</Label>
            <div className="flex gap-2">
              <Input value={endpointUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(endpointUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Secret Token */}
          <div className="space-y-2">
            <Label>Token Secreto (opcional)</Label>
            <p className="text-xs text-muted-foreground">
              Se configurado, o header <code className="bg-muted px-1 rounded">X-Webhook-Secret</code> será validado.
            </p>
            {maskedToken && (
              <div className="flex gap-2 items-center">
                <Input
                  value={showToken ? config!.secret_token! : maskedToken}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(config!.secret_token!)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Novo token..."
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={generateToken}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => updateTokenMutation.mutate(tokenInput || null)}
                disabled={updateTokenMutation.isPending}
              >
                Salvar
              </Button>
            </div>
          </div>

          {/* Accepted fields */}
          <div className="space-y-2">
            <Label>Campos aceitos no payload</Label>
            <div className="rounded-md border p-3 bg-muted/50 text-xs font-mono space-y-1">
              <p><span className="text-destructive">*</span> name (string) — obrigatório</p>
              <p>email (string)</p>
              <p>phone (string)</p>
              <p>company_name (string)</p>
              <p>source (string) — ex: "indicacao"</p>
              <p>metadata (object)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
