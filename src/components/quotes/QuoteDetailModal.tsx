import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const categoryLabels: Record<string, string> = {
  grua: "🏗️ Grua",
  configuracao: "⚙️ Configuração",
  torre: "🗼 Torre",
  tramo: "📐 Tramo",
  chassis: "🔧 Chassis",
  acessorio: "🔩 Acessório",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  finalized: { label: "Finalizado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface Props {
  quoteId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function QuoteDetailModal({ quoteId, open, onClose }: Props) {
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote-detail", quoteId],
    queryFn: async () => {
      if (!quoteId) return null;
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(razao_social, nome_fantasia, cnpj, cidade, estado)")
        .eq("id", quoteId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!quoteId && open,
  });

  const { data: items } = useQuery({
    queryKey: ["quote-items-detail", quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      const { data, error } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!quoteId && open,
  });

  const formatCurrency = (value: number, currency: string = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(date));

  const handleGeneratePdf = async () => {
    if (!quoteId) return;
    setGeneratingPdf(true);
    try {
      const response = await supabase.functions.invoke("generate-pdf", {
        body: { quoteId },
      });
      if (response.error) throw response.error;
      const { html, quote_number } = response.data;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
      toast({ title: "PDF gerado!", description: `Proposta ${quote_number} pronta para impressão` });
    } catch (error: any) {
      toast({ title: "Erro ao gerar PDF", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const equipmentItems = items?.filter((i) => i.product_category === "grua") || [];
  const componentItems = items?.filter((i) => ["configuracao", "torre", "tramo", "chassis"].includes(i.product_category)) || [];
  const accessoryItems = items?.filter((i) => i.product_category === "acessorio") || [];

  const renderItemGroup = (groupItems: typeof items, title: string) => {
    if (!groupItems || groupItems.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
        {groupItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {categoryLabels[item.product_category] || item.product_category}
              </Badge>
              <span>{item.product_name}</span>
              <span className="text-muted-foreground text-xs">x{item.quantity}</span>
            </div>
            <span className="font-medium">{formatCurrency(item.total_price, quote?.currency || "BRL")}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {quote ? (
              <>
                <span className="font-mono">{quote.quote_number}</span>
                <Badge variant={statusLabels[quote.status]?.variant || "secondary"}>
                  {statusLabels[quote.status]?.label || quote.status}
                </Badge>
              </>
            ) : (
              "Detalhes da Proposta"
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : quote ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Cliente</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">{quote.clients?.nome_fantasia || quote.clients?.razao_social}</p>
                  {quote.clients?.razao_social && quote.clients?.nome_fantasia && (
                    <p className="text-muted-foreground text-xs">{quote.clients.razao_social}</p>
                  )}
                  {quote.clients?.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {quote.clients.cnpj}</p>}
                  {quote.clients?.cidade && (
                    <p className="text-xs text-muted-foreground">
                      {quote.clients.cidade}{quote.clients.estado ? ` - ${quote.clients.estado}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Projeto</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Nome:</span> {quote.project_name || "-"}</p>
                  {quote.project_location && (
                    <p><span className="text-muted-foreground">Local:</span> {quote.project_location}</p>
                  )}
                </CardContent>
              </Card>

              {equipmentItems.filter(item => item.grua_lanca_m || item.grua_altura_torre_m || item.grua_carga_maxima_kg || item.grua_carga_ponta_kg || item.grua_altura_trabalho_m).map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Especificações — {item.product_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {item.grua_lanca_m && <p><span className="text-muted-foreground">Lança:</span> {item.grua_lanca_m} m</p>}
                    {item.grua_altura_torre_m && <p><span className="text-muted-foreground">Altura da torre:</span> {item.grua_altura_torre_m} m</p>}
                    {item.grua_carga_maxima_kg && <p><span className="text-muted-foreground">Carga máxima:</span> {item.grua_carga_maxima_kg} kg</p>}
                    {item.grua_carga_ponta_kg && <p><span className="text-muted-foreground">Carga na ponta:</span> {item.grua_carga_ponta_kg} kg</p>}
                    {item.grua_altura_trabalho_m && <p><span className="text-muted-foreground">Altura de trabalho:</span> {item.grua_altura_trabalho_m} m</p>}
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Condições Comerciais</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Moeda:</span> {quote.currency}</p>
                  <p><span className="text-muted-foreground">Validade:</span> {quote.validity_days} dias</p>
                  {quote.delivery_time && <p><span className="text-muted-foreground">Entrega:</span> {quote.delivery_time}</p>}
                  {quote.payment_terms && <p><span className="text-muted-foreground">Pagamento:</span> {quote.payment_terms}</p>}
                  {quote.freight_terms && <p><span className="text-muted-foreground">Frete:</span> {quote.freight_terms}</p>}
                  {quote.notes && <p><span className="text-muted-foreground">Obs:</span> {quote.notes}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Datas</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Criado em:</span> {formatDate(quote.created_at)}</p>
                  {quote.finalized_at && <p><span className="text-muted-foreground">Finalizado em:</span> {formatDate(quote.finalized_at)}</p>}
                  {quote.cancelled_at && <p><span className="text-muted-foreground">Cancelado em:</span> {formatDate(quote.cancelled_at)}</p>}
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Itens ({items?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderItemGroup(equipmentItems, "Equipamento")}
                  {renderItemGroup(componentItems, "Componentes")}
                  {renderItemGroup(accessoryItems, "Acessórios")}

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(quote.subtotal, quote.currency)}</span>
                    </div>
                    {quote.discount_percent > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Desconto ({quote.discount_percent}%)</span>
                        <span className="font-medium">-{formatCurrency(quote.discount_value, quote.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 text-lg">
                      <span className="font-bold">Total</span>
                      <span className="font-bold">{formatCurrency(quote.total, quote.currency)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {quote && (quote.status === "finalized" || quote.status === "draft") && (
            <Button variant="outline" onClick={handleGeneratePdf} disabled={generatingPdf}>
              {generatingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Gerar PDF
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
