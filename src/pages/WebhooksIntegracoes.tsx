import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InboundWebhookConfig from "@/components/webhooks/InboundWebhookConfig";
import OutboundWebhookList from "@/components/webhooks/OutboundWebhookList";
import WebhookLogs from "@/components/webhooks/WebhookLogs";
import GoogleSheetsConfig from "@/components/webhooks/GoogleSheetsConfig";
import CnpjLookupConfig from "@/components/webhooks/CnpjLookupConfig";

export default function WebhooksIntegracoes() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhooks & Integrações</h1>
        <p className="text-muted-foreground">Configure webhooks e integrações externas</p>
      </div>

      <Tabs defaultValue="inbound" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbound">Entrada</TabsTrigger>
          <TabsTrigger value="outbound">Saída</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
          <TabsTrigger value="cnpj">Consulta CNPJ</TabsTrigger>
        </TabsList>

        <TabsContent value="inbound">
          <InboundWebhookConfig />
        </TabsContent>
        <TabsContent value="outbound">
          <OutboundWebhookList />
        </TabsContent>
        <TabsContent value="logs">
          <WebhookLogs />
        </TabsContent>
        <TabsContent value="sheets">
          <GoogleSheetsConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
